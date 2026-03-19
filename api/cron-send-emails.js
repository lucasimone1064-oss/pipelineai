// api/cron-send-emails.js
// Questo endpoint viene chiamato automaticamente ogni giorno da Vercel Cron
// Controlla le email programmate e le invia

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

async function refreshGmailToken(refresh_token) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

async function sendGmailEmail({ access_token, to, subject, body }) {
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    '',
    body.replace(/\n/g, '<br>')
  ]
  const email = emailLines.join('\r\n')
  const encodedEmail = Buffer.from(email).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  })
  return await res.json()
}

export default async function handler(req, res) {
  // Sicurezza: solo Vercel Cron può chiamare questo endpoint
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorizzato' })
  }

  const now = new Date().toISOString()

  // Trova tutte le email da inviare adesso
  const { data: emails, error } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(50)

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({ error: error.message })
  }

  console.log(`Trovate ${emails?.length || 0} email da inviare`)

  const results = []

  for (const email of emails || []) {
    try {
      let accessToken = email.gmail_access_token

      // Prova ad inviare — se il token è scaduto, rinnovalo
      let result = await sendGmailEmail({
        access_token: accessToken,
        to: email.to_email,
        subject: email.subject,
        body: email.body,
      })

      // Token scaduto — rinnovalo e riprova
      if (result.error?.code === 401 && email.gmail_refresh_token) {
        accessToken = await refreshGmailToken(email.gmail_refresh_token)
        result = await sendGmailEmail({
          access_token: accessToken,
          to: email.to_email,
          subject: email.subject,
          body: email.body,
        })
      }

      if (result.id) {
        // Email inviata con successo
        await supabase
          .from('scheduled_emails')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', email.id)

        results.push({ id: email.id, status: 'sent' })
      } else {
        // Errore invio
        await supabase
          .from('scheduled_emails')
          .update({ status: 'error' })
          .eq('id', email.id)

        results.push({ id: email.id, status: 'error', error: result.error?.message })
      }
    } catch (err) {
      console.error(`Errore email ${email.id}:`, err)
      results.push({ id: email.id, status: 'error', error: err.message })
    }
  }

  return res.status(200).json({
    processed: results.length,
    results
  })
}

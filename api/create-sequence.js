// api/create-sequence.js
// Crea una nuova sequenza di email programmate

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non permesso' })
  }

  const {
    user_id,
    lead_id,
    lead_name,
    lead_email,
    emails, // Array di {subject, body, delay_days}
    gmail_access_token,
    gmail_refresh_token,
  } = req.body

  if (!user_id || !lead_email || !emails?.length) {
    return res.status(400).json({ error: 'Parametri mancanti' })
  }

  try {
    // Crea la sequenza
    const { data: sequence, error: seqError } = await supabase
      .from('sequences')
      .insert([{
        user_id,
        lead_id: lead_id || 'unknown',
        lead_name: lead_name || '',
        lead_email,
        emails,
        status: 'active'
      }])
      .select()
      .single()

    if (seqError) throw seqError

    // Programma ogni email
    const scheduledEmails = emails.map((email, index) => {
      const scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + (email.delay_days || 0))
      // Prima email: invia subito (tra 1 minuto)
      if (index === 0) scheduledDate.setMinutes(scheduledDate.getMinutes() + 1)

      return {
        sequence_id: sequence.id,
        user_id,
        to_email: lead_email,
        subject: email.subject,
        body: email.body,
        gmail_access_token,
        gmail_refresh_token: gmail_refresh_token || null,
        scheduled_for: scheduledDate.toISOString(),
        status: 'pending'
      }
    })

    const { error: emailsError } = await supabase
      .from('scheduled_emails')
      .insert(scheduledEmails)

    if (emailsError) throw emailsError

    return res.status(200).json({
      success: true,
      sequence_id: sequence.id,
      scheduled: scheduledEmails.length,
      first_send: scheduledEmails[0].scheduled_for
    })

  } catch (err) {
    console.error('Create sequence error:', err)
    return res.status(500).json({ error: err.message })
  }
}

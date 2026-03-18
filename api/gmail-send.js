// api/gmail-send.js
// Invia un'email tramite Gmail API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non permesso' })
  }

  const { access_token, to, subject, body, from_name } = req.body

  if (!access_token || !to || !subject || !body) {
    return res.status(400).json({ error: 'Parametri mancanti' })
  }

  try {
    // Costruisce l'email in formato RFC 2822
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
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Invia tramite Gmail API
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedEmail }),
    })

    const result = await sendRes.json()

    if (!sendRes.ok) {
      // Se il token è scaduto
      if (result.error?.code === 401) {
        return res.status(401).json({ error: 'Token scaduto — riconnetti Gmail' })
      }
      return res.status(400).json({ error: result.error?.message || 'Errore invio' })
    }

    return res.status(200).json({ success: true, messageId: result.id })

  } catch (err) {
    console.error('Gmail send error:', err)
    return res.status(500).json({ error: 'Errore server: ' + err.message })
  }
}

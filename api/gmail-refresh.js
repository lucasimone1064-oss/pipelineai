// api/gmail-refresh.js
// Rinnova il token di accesso Gmail scaduto

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non permesso' })
  }

  const { refresh_token } = req.body

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token mancante' })
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    })

    const tokens = await tokenRes.json()

    if (tokens.error) {
      return res.status(401).json({ error: tokens.error })
    }

    return res.status(200).json({ access_token: tokens.access_token })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

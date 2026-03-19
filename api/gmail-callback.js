// api/gmail-callback.js
// Riceve il codice da Google, lo scambia con i token e li salva

export default async function handler(req, res) {
  const { code, state: userId, error } = req.query

  if (error) {
    return res.redirect(`/?gmail_error=${error}`)
  }

  if (!code) {
    return res.redirect('/?gmail_error=no_code')
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = 'https://pipelineai-beta.vercel.app/api/gmail-callback'

  try {
    // Scambia il codice con i token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (tokens.error) {
      return res.redirect(`/?gmail_error=${tokens.error}`)
    }

    // Ottieni info profilo utente
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    const profile = await profileRes.json()

    // Encode i token come base64 per passarli all'app via URL
    const tokenData = Buffer.from(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      email: profile.email,
      name: profile.name,
    })).toString('base64')

    // Reindirizza all'app con i token
    res.redirect(`/?gmail_connected=true&token_data=${tokenData}&user_id=${userId}`)

  } catch (err) {
    console.error('Gmail callback error:', err)
    res.redirect(`/?gmail_error=server_error`)
  }
}

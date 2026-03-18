// api/gmail-auth.js
// Reindirizza l'utente alla pagina di login Google

export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.VITE_APP_URL || 'https://pipelineai-beta.vercel.app'}/api/gmail-callback`

  const scope = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'email',
    'profile'
  ].join(' ')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')

  // Passa userId come state per sapere a chi appartiene il token
  const userId = req.query.userId || 'unknown'
  authUrl.searchParams.set('state', userId)

  res.redirect(authUrl.toString())
}

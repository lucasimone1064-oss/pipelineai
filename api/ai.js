// api/ai.js
// Questa funzione gira sul SERVER di Vercel — la tua chiave Anthropic
// non viene mai esposta al pubblico. E' completamente sicura.

export default async function handler(req, res) {
  // Permetti solo richieste POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non permesso' })
  }

  const { messages, system, max_tokens } = req.body

  if (!messages) {
    return res.status(400).json({ error: 'Parametri mancanti' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1200,
        system: system || 'Sei PipelineAI, agente AI per vendite B2B in italiano.',
        messages
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Errore API' })
    }

    return res.status(200).json(data)

  } catch (error) {
    console.error('Errore API Anthropic:', error)
    return res.status(500).json({ error: 'Errore interno del server' })
  }
}

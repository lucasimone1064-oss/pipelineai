// api/ai.js
// Proxy sicuro per le chiamate AI — usa Groq (gratuito)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non permesso' })
  }

  const { prompt, sys } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt mancante' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY non configurata' })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1200,
        messages: [
          {
            role: 'system',
            content: sys || 'Sei PipelineAI, agente AI esperto di vendite B2B in italiano. Preciso, professionale, persuasivo. Non usare mai asterischi o markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Errore Groq API' })
    }

    const text = data.choices?.[0]?.message?.content || ''
    return res.status(200).json({ text })

  } catch (err) {
    console.error('AI error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// api/get-sequences.js
// Restituisce le sequenze attive di un utente

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo non permesso' })
  }

  const { user_id } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id mancante' })
  }

  try {
    const { data: sequences, error } = await supabase
      .from('sequences')
      .select(`
        *,
        scheduled_emails (
          id, status, scheduled_for, sent_at, subject
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return res.status(200).json({ sequences: sequences || [] })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

-- ============================================================
-- PIPELINEAI — Setup Database Supabase
-- Copia e incolla TUTTO questo testo nell'editor SQL di Supabase
-- Supabase → SQL Editor → New Query → incolla → Run
-- ============================================================

-- Tabella lead (ogni utente vede solo i SUOI lead)
CREATE TABLE IF NOT EXISTS leads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  company     TEXT,
  role        TEXT,
  email       TEXT,
  phone       TEXT,
  sector      TEXT,
  city        TEXT,
  revenue     TEXT,
  employees   TEXT,
  deal_value  TEXT,
  notes       TEXT,
  status      TEXT DEFAULT 'cold' CHECK (status IN ('hot','warm','cold')),
  score       INTEGER DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  source      TEXT DEFAULT 'Manuale',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sicurezza: ogni utente vede solo i propri lead
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utenti vedono solo i propri lead"
  ON leads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indice per velocizzare le query
CREATE INDEX leads_user_id_idx ON leads(user_id);
CREATE INDEX leads_status_idx ON leads(status);

-- ============================================================
-- FATTO! Ora torna all'app e inizia ad usarla.
-- ============================================================

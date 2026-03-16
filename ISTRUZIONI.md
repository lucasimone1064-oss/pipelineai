# 🚀 PipelineAI — Istruzioni di Deploy
## Come mettere l'app online in 30 minuti (senza saper programmare)

---

## PRIMA DI INIZIARE — Cosa ti serve
✅ Account Gmail (ce l'hai)
✅ Chiave Anthropic (ce l'hai)
✅ Account Supabase con URL e chiave (ce l'hai)
✅ Account Vercel (ce l'hai)
⬜ Account GitHub (gratis — lo creiamo adesso)
⬜ Node.js installato sul computer (gratis — lo installiamo adesso)

---

## PASSO 1 — Installa Node.js (5 minuti)
Node.js è un programma che ti serve per "preparare" il codice prima di caricarlo online.

1. Vai su: **https://nodejs.org**
2. Clicca il pulsante verde grande "LTS" (è la versione stabile)
3. Scarica il file e aprilo come un normale programma da installare
4. Clicca "Next" su tutto → "Install" → "Finish"
5. Per verificare che funzioni:
   - Su Windows: premi `Win + R`, scrivi `cmd`, premi Invio
   - Scrivi: `node --version` e premi Invio
   - Dovresti vedere qualcosa tipo: `v20.11.0` ✅

---

## PASSO 2 — Crea account GitHub (3 minuti)
GitHub è dove caricheremo i file del codice. Vercel lo legge da lì per pubblicare l'app.

1. Vai su: **https://github.com**
2. Clicca "Sign up"
3. Registrati con la tua Gmail
4. Scegli il piano gratuito
5. Conferma l'email

---

## PASSO 3 — Configura il database Supabase (5 minuti)
Devi creare la tabella dove verranno salvati i lead.

1. Vai su: **https://supabase.com** → accedi con Gmail
2. Entra nel tuo progetto
3. Nel menu a sinistra clicca **"SQL Editor"**
4. Clicca **"New query"**
5. Apri il file `supabase-setup.sql` (è nella cartella del progetto)
6. Copia TUTTO il testo e incollalo nell'editor SQL
7. Clicca **"Run"** (il bottone verde)
8. Dovresti vedere "Success" ✅

---

## PASSO 4 — Aggiungi le tue chiavi al progetto (5 minuti)
1. Apri la cartella `pipelineai` sul tuo computer
2. Trova il file `.env.example`
3. Fai una copia di quel file e rinominala `.env` (rimuovi ".example")
4. Apri il file `.env` con Blocco Note (Windows) o TextEdit (Mac)
5. Sostituisci i valori:

```
ANTHROPIC_API_KEY=sk-ant-INCOLLA_QUI_LA_TUA_CHIAVE_ANTHROPIC

VITE_SUPABASE_URL=https://XXXX.supabase.co   ← dalla pagina Settings → API di Supabase
VITE_SUPABASE_ANON_KEY=eyJh...               ← dalla stessa pagina, voce "anon public"
```

6. Salva il file

---

## PASSO 5 — Carica il codice su GitHub (5 minuti)
1. Vai su **https://github.com/new** (crea nuovo repository)
2. Nome: `pipelineai`
3. Lascia tutto il resto di default → clicca **"Create repository"**
4. Apri il terminale (cmd su Windows, Terminal su Mac)
5. Naviga nella cartella del progetto:
   ```
   cd Downloads/pipelineai
   ```
   (o dove hai salvato la cartella)
6. Esegui questi comandi uno per volta:
   ```
   npm install
   git init
   git add .
   git commit -m "Prima versione PipelineAI"
   git branch -M main
   git remote add origin https://github.com/TUO_USERNAME/pipelineai.git
   git push -u origin main
   ```
   ⚠️ Sostituisci `TUO_USERNAME` con il tuo username GitHub

---

## PASSO 6 — Pubblica su Vercel (5 minuti)
1. Vai su **https://vercel.com** → accedi con GitHub
2. Clicca **"New Project"**
3. Seleziona il repository `pipelineai`
4. Clicca **"Import"**
5. Nella sezione **"Environment Variables"** aggiungi queste 3 variabili:

| Nome | Valore |
|------|--------|
| `ANTHROPIC_API_KEY` | la tua chiave Anthropic (sk-ant-...) |
| `VITE_SUPABASE_URL` | la tua URL Supabase |
| `VITE_SUPABASE_ANON_KEY` | la tua chiave anon Supabase |

6. Clicca **"Deploy"**
7. Aspetta 2-3 minuti ⏳
8. Vercel ti darà un link tipo: `https://pipelineai.vercel.app` 🎉

---

## PASSO 7 — Configura Supabase per accettare il tuo dominio (2 minuti)
1. Torna su Supabase → il tuo progetto
2. Vai su **Authentication → URL Configuration**
3. In "Site URL" inserisci il link che ti ha dato Vercel (es. `https://pipelineai.vercel.app`)
4. In "Redirect URLs" aggiungi lo stesso link
5. Clicca Save

---

## 🎉 FATTO! La tua app è online.

Apri il link di Vercel, registra il primo account e inizia ad usarla.

---

## ❓ Problemi comuni

**"npm: command not found"**
→ Node.js non è stato installato correttamente. Riprova il Passo 1.

**"git: command not found"**
→ Scarica Git da https://git-scm.com e installalo.

**"Invalid API Key" nell'app**
→ Controlla che le chiavi in Vercel siano corrette (copia/incolla senza spazi).

**L'app si apre ma non si può fare login**
→ Hai dimenticato il Passo 7 (configurare l'URL su Supabase).

---

## 📞 Prossimi step
Quando l'app è online, torna qui e continuiamo con:
- Invio email reale (Resend)
- Sequenze automatiche
- Pagamenti Stripe
- Landing page di vendita

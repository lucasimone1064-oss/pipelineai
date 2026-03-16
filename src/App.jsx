import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

/* ─────────────────────────────────────
   SUPABASE CLIENT
───────────────────────────────────── */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

/* ─────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────── */
const T = {
  bg:'#06070A', surface:'#0D0F14', card:'#13161D', border:'#1E2230',
  border2:'#252A38', accent:'#FF4D1C', blue:'#3B6EFF', green:'#1DB954',
  gold:'#F0A500', white:'#F2F4FF', muted:'#4A5068', text:'#C8CCDF',
}

const PLANS = [
  { id:'starter',  name:'Starter',  price:49,  color:T.muted, leads:100,
    features:['100 lead/mese','Gmail integrato','3 task AI/giorno','Export CSV'] },
  { id:'pro',      name:'Pro',      price:149, color:T.blue,  leads:500, popular:true,
    features:['500 lead/mese','Sequenze automatiche','HubSpot/Pipedrive','Analytics avanzata','Task AI illimitati'] },
  { id:'business', name:'Business', price:399, color:T.accent,leads:9999,
    features:['Lead illimitati','Voice agent','White label','API accesso','Supporto prioritario'] },
]

const DEMO_LEADS = [
  { id:'demo-1', name:'Sara Conti',       company:'FoodBox Italia',          role:'CMO',     email:'sara@foodbox.it',       sector:'E-commerce',  status:'hot',  score:92, deal_value:'€3.600', notes:'CEO già convinto. Decisione entro 2 settimane.', source:'LinkedIn' },
  { id:'demo-2', name:'Marco Ferretti',   company:'TechBuild Srl',           role:'CEO',     email:'marco@techbuild.it',    sector:'SaaS B2B',    status:'hot',  score:87, deal_value:'€1.800', notes:'300+ lead mese, vuole automatizzare follow-up.', source:'LinkedIn' },
  { id:'demo-3', name:'Giulia Marchetti', company:'Studio Legale Marchetti', role:'Partner', email:'g.marchetti@stm.it',   sector:'Legal Tech',  status:'warm', score:74, deal_value:'€600',   notes:'Ha già fatto 2 call con concorrenti.', source:'Referral' },
  { id:'demo-4', name:'Andrea Romano',    company:'HR Pro Consulting',       role:'CEO',     email:'a.romano@hrpro.it',    sector:'HR Tech',     status:'warm', score:69, deal_value:'€1.800', notes:'Budget confermato. Valuta 3 soluzioni.', source:'Ads' },
  { id:'demo-5', name:'Luca Bianchi',     company:'EcoHome Agency',          role:'Founder', email:'luca@ecohome.it',      sector:'Real Estate', status:'cold', score:48, deal_value:'€500',   notes:'Nessun CRM attivo.', source:'Form web' },
]

const PIPELINE_WK = [
  {w:'10 Feb',leads:8, qual:5, closed:1},{w:'17 Feb',leads:14,qual:9, closed:2},
  {w:'24 Feb',leads:20,qual:13,closed:4},{w:'3 Mar', leads:28,qual:18,closed:5},
  {w:'8 Mar', leads:35,qual:23,closed:7},
]

/* ─────────────────────────────────────
   AI ENGINE — chiama /api/ai (server-side, chiave sicura)
───────────────────────────────────── */
async function callAI(prompt, system) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      system: system || 'Sei PipelineAI, agente AI per vendite B2B in italiano. Preciso e persuasivo. No asterischi.',
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.content?.map(b => b.text || '').join('') || ''
}

/* ─────────────────────────────────────
   HELPERS
───────────────────────────────────── */
const scoreCol = s => s >= 80 ? T.green : s >= 60 ? T.gold : T.muted
const statusMeta = s => s === 'hot'
  ? { emoji:'🔥', label:'HOT',  color:T.accent }
  : s === 'warm'
  ? { emoji:'⚡', label:'WARM', color:T.gold   }
  : { emoji:'❄️', label:'COLD', color:T.muted  }

/* ─────────────────────────────────────
   UI ATOMS
───────────────────────────────────── */
const gs = {
  fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif",
}

function Badge({ status }) {
  const m = statusMeta(status)
  return <span style={{ background:`${m.color}20`, color:m.color, fontSize:10, fontWeight:700,
    padding:'3px 9px', borderRadius:20, letterSpacing:'0.05em', fontFamily:'monospace' }}>
    {m.emoji} {m.label}
  </span>
}

function ScoreBar({ score }) {
  const c = scoreCol(score)
  return <div style={{ display:'flex', alignItems:'center', gap:8 }}>
    <div style={{ width:52, height:4, background:T.border2, borderRadius:2, overflow:'hidden' }}>
      <div style={{ width:`${score}%`, height:'100%', background:c, borderRadius:2 }} />
    </div>
    <span style={{ fontSize:12, fontWeight:700, color:c, fontFamily:'monospace' }}>{score}</span>
  </div>
}

function Btn({ children, onClick, variant='primary', disabled, full, style={} }) {
  const base = { ...gs, border:'none', borderRadius:8, padding:'11px 22px', fontSize:13,
    fontWeight:600, cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.4:1,
    transition:'all 0.15s', width:full?'100%':'auto', ...style }
  const vars = {
    primary:   { background:T.accent, color:'#fff', boxShadow:`0 0 24px ${T.accent}40` },
    secondary: { background:T.border, color:T.text },
    ghost:     { background:'transparent', color:T.muted, border:`1px solid ${T.border}` },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...vars[variant] }}>{children}</button>
}

function Input({ label, value, onChange, type='text', placeholder, multiline }) {
  const s = { ...gs, width:'100%', background:T.surface, border:`1px solid ${T.border}`,
    borderRadius:8, padding:'11px 14px', fontSize:13, color:T.white, outline:'none',
    resize:'vertical', transition:'border-color 0.15s' }
  return <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
    {label && <label style={{ fontSize:11, color:T.muted, fontWeight:500,
      letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:'monospace' }}>{label}</label>}
    {multiline
      ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} style={s}
          onFocus={e => e.target.style.borderColor = T.accent}
          onBlur={e => e.target.style.borderColor = T.border} />
      : <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={s}
          onFocus={e => e.target.style.borderColor = T.accent}
          onBlur={e => e.target.style.borderColor = T.border} />
    }
  </div>
}

function Card({ children, style={}, glow }) {
  return <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12,
    boxShadow:glow ? `0 0 40px ${glow}18` : 'none', ...style }}>{children}</div>
}

function Spinner() {
  return <div style={{ width:24, height:24, border:`2px solid ${T.border}`,
    borderTopColor:T.accent, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
}

/* ─────────────────────────────────────
   AUTH SCREEN
───────────────────────────────────── */
function AuthScreen({ onLogin }) {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [plan,     setPlan]     = useState('pro')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name, plan } }
        })
        if (error) throw error
        if (data.user) onLogin({ ...data.user, name, plan })
        else setError('Controlla la tua email per confermare la registrazione.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const meta = data.user?.user_metadata || {}
        onLogin({ ...data.user, name: meta.name || email.split('@')[0], plan: meta.plan || 'pro' })
      }
    } catch (e) {
      const msgs = {
        'Invalid login credentials': 'Email o password errati.',
        'User already registered': 'Email già registrata. Accedi invece.',
        'Password should be at least 6 characters': 'Password troppo corta (min. 6 caratteri).',
      }
      setError(msgs[e.message] || e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center',
      justifyContent:'center', fontFamily:gs.fontFamily, padding:20, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
        width:600, height:600, background:`radial-gradient(circle, ${T.accent}08 0%, transparent 70%)`, pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:48, fontWeight:900, color:T.white, lineHeight:1, marginBottom:8, letterSpacing:'-0.03em' }}>
            Pipeline<span style={{ color:T.accent }}>AI</span>
          </div>
          <div style={{ fontSize:13, color:T.muted }}>
            {mode === 'login' ? 'Bentornato. Accedi al tuo workspace.' : 'Crea il tuo account gratuito.'}
          </div>
        </div>

        <Card style={{ padding:32 }} glow={T.accent}>
          <div style={{ display:'flex', gap:4, background:T.surface, borderRadius:8, padding:4, marginBottom:28 }}>
            {[['login','Accedi'],['register','Registrati']].map(([m,l]) => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                style={{ flex:1, border:'none', borderRadius:6, padding:'9px 0', fontSize:13, fontWeight:600,
                  cursor:'pointer', background:mode===m?T.card:T.surface, color:mode===m?T.white:T.muted,
                  fontFamily:gs.fontFamily, transition:'all 0.15s' }}>{l}</button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {mode === 'register' && <Input label="Nome" value={name} onChange={e=>setName(e.target.value)} placeholder="Mario Rossi" />}
            <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tua@email.it" />
            <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 6 caratteri" />

            {mode === 'register' && (
              <div>
                <label style={{ fontSize:11, color:T.muted, fontWeight:500, letterSpacing:'0.06em',
                  textTransform:'uppercase', display:'block', marginBottom:10, fontFamily:'monospace' }}>Piano</label>
                <div style={{ display:'flex', gap:8 }}>
                  {PLANS.map(pl => (
                    <button key={pl.id} onClick={() => setPlan(pl.id)}
                      style={{ flex:1, border:`1px solid ${plan===pl.id?pl.color:T.border}`,
                        borderRadius:8, padding:'10px 6px', background:plan===pl.id?`${pl.color}12`:T.surface,
                        cursor:'pointer', fontFamily:gs.fontFamily, transition:'all 0.15s' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:plan===pl.id?pl.color:T.muted, marginBottom:2 }}>{pl.name}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:T.white }}>€{pl.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <div style={{ background:`${T.accent}14`, border:`1px solid ${T.accent}30`,
              borderRadius:8, padding:'10px 14px', fontSize:12, color:T.accent }}>⚠️ {error}</div>}

            <button onClick={submit} disabled={loading}
              style={{ background:T.accent, color:'#fff', border:'none', borderRadius:8, padding:'14px 0',
                fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:gs.fontFamily,
                opacity:loading?0.7:1, boxShadow:`0 0 28px ${T.accent}40`, display:'flex',
                alignItems:'center', justifyContent:'center', gap:10 }}>
              {loading ? <><Spinner/><span>Caricamento…</span></> : mode==='login' ? 'Entra →' : 'Crea account →'}
            </button>
          </div>
        </Card>

        <div style={{ textAlign:'center', marginTop:16, fontSize:12, color:T.muted }}>
          {mode === 'login'
            ? <>Non hai un account? <span onClick={() => setMode('register')} style={{ color:T.accent, cursor:'pointer', fontWeight:600 }}>Registrati gratis</span></>
            : <>Hai già un account? <span onClick={() => setMode('login')} style={{ color:T.accent, cursor:'pointer', fontWeight:600 }}>Accedi</span></>
          }
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   PRICING SCREEN
───────────────────────────────────── */
function PricingScreen({ user, onBack }) {
  const [annual, setAnnual] = useState(false)
  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:gs.fontFamily, padding:'48px 24px' }}>
      <div style={{ maxWidth:960, margin:'0 auto' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:T.muted,
          cursor:'pointer', fontSize:13, marginBottom:40, fontFamily:gs.fontFamily }}>← Torna alla dashboard</button>

        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h1 style={{ fontSize:52, fontWeight:900, color:T.white, letterSpacing:'-0.03em', marginBottom:12 }}>
            Scegli il tuo <span style={{ color:T.accent }}>piano</span>
          </h1>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:20 }}>
            <span style={{ fontSize:13, color:annual?T.muted:T.white }}>Mensile</span>
            <div onClick={() => setAnnual(p=>!p)} style={{ width:44, height:24, borderRadius:12,
              background:annual?T.accent:T.border, cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
              <div style={{ position:'absolute', top:3, left:annual?20:3, width:18, height:18,
                borderRadius:'50%', background:'white', transition:'left 0.2s' }} />
            </div>
            <span style={{ fontSize:13, color:annual?T.white:T.muted }}>
              Annuale <span style={{ background:`${T.green}20`, color:T.green, fontSize:10, fontWeight:700,
                padding:'2px 7px', borderRadius:10, marginLeft:4 }}>-20%</span>
            </span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
          {PLANS.map(pl => {
            const price = annual ? Math.round(pl.price * 0.8) : pl.price
            const isActive = user?.plan === pl.id
            return (
              <div key={pl.id} style={{ background:T.card, border:`1px solid ${isActive?pl.color:pl.popular?`${pl.color}40`:T.border}`,
                borderRadius:16, padding:'32px 28px', position:'relative',
                boxShadow:pl.popular?`0 0 48px ${pl.color}16`:'none',
                transform:pl.popular?'translateY(-8px)':'none' }}>
                {pl.popular && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
                  background:T.blue, color:'#fff', fontSize:10, fontWeight:700,
                  padding:'4px 16px', borderRadius:20, letterSpacing:'0.08em', fontFamily:'monospace' }}>PIÙ POPOLARE</div>}
                {isActive && <div style={{ position:'absolute', top:-12, right:20,
                  background:T.green, color:'#fff', fontSize:10, fontWeight:700, padding:'4px 12px', borderRadius:20 }}>ATTIVO</div>}
                <div style={{ fontFamily:'monospace', fontSize:11, color:pl.color, letterSpacing:'0.12em',
                  textTransform:'uppercase', marginBottom:12 }}>{pl.name}</div>
                <div style={{ fontSize:52, fontWeight:900, color:T.white, lineHeight:1, marginBottom:4 }}>€{price}</div>
                <div style={{ color:T.muted, fontSize:13, marginBottom:20 }}>/mese</div>
                <div style={{ height:1, background:T.border, margin:'0 0 20px' }} />
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
                  {pl.features.map(f => <div key={f} style={{ display:'flex', gap:10 }}>
                    <span style={{ color:pl.color }}>✓</span>
                    <span style={{ fontSize:13, color:T.text }}>{f}</span>
                  </div>)}
                </div>
                <button style={{ width:'100%', background:isActive?`${pl.color}20`:pl.popular?pl.color:T.border,
                  color:isActive?pl.color:pl.popular?'#fff':T.text, border:`1px solid ${isActive?pl.color:pl.popular?pl.color:T.border}`,
                  borderRadius:8, padding:'13px 0', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:gs.fontFamily }}>
                  {isActive ? '✓ Piano attuale' : 'Inizia gratis →'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   DASHBOARD
───────────────────────────────────── */
function DashboardView({ leads, activities, user }) {
  const hot  = leads.filter(l => l.status === 'hot').length
  const avg  = Math.round(leads.reduce((a,l) => a + l.score, 0) / Math.max(leads.length, 1))
  const deal = leads.reduce((a,l) => a + (parseFloat((l.deal_value||'0').replace(/[€.,\s]/g,''))||0), 0)

  return (
    <div style={{ padding:'32px 36px', maxWidth:1100 }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:38, fontWeight:900, color:T.white, letterSpacing:'-0.03em', marginBottom:6 }}>
          Buongiorno, <span style={{ color:T.accent }}>{user?.name?.split(' ')[0] || 'amico'}</span> 👋
        </h1>
        <p style={{ color:T.muted, fontSize:14 }}>Il tuo agente AI è operativo e monitora la pipeline.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Lead attivi',  value:leads.length, sub:'+3 questa settimana',  color:T.blue   },
          { label:'Hot leads',    value:hot,          sub:'Contatta oggi',         color:T.accent },
          { label:'Score medio',  value:avg,          sub:'↑ +8 vs mese scorso',  color:T.green  },
          { label:'Pipeline AI',  value:`€${deal.toLocaleString('it-IT')}`, sub:'Deal stimati', color:T.gold },
        ].map(k => (
          <Card key={k.label} glow={k.color} style={{ padding:'24px 22px', borderTop:`2px solid ${k.color}` }}>
            <div style={{ fontSize:10, color:T.muted, fontWeight:600, letterSpacing:'0.1em',
              textTransform:'uppercase', marginBottom:10, fontFamily:'monospace' }}>{k.label}</div>
            <div style={{ fontSize:42, fontWeight:900, color:k.color, lineHeight:1, marginBottom:6 }}>{k.value}</div>
            <div style={{ fontSize:11, color:T.muted }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16, marginBottom:16 }}>
        <Card style={{ padding:'24px 26px 16px' }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.white, marginBottom:4 }}>Pipeline settimanale</div>
          <div style={{ fontSize:12, color:T.muted, marginBottom:20 }}>Lead e deal chiusi</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={PIPELINE_WK} margin={{ left:-10, right:4 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="w" tick={{ fontSize:10, fill:T.muted }} />
              <YAxis tick={{ fontSize:10, fill:T.muted }} />
              <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11, color:T.white }} />
              <Area type="monotone" dataKey="leads"  stroke={T.blue}   fill="url(#g1)" strokeWidth={2} dot={false} name="Lead" />
              <Area type="monotone" dataKey="closed" stroke={T.accent} fill="url(#g2)" strokeWidth={2.5} dot={{ fill:T.accent, r:3 }} name="Chiusi" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding:'24px 22px' }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.white, marginBottom:18 }}>🤖 Attività agente</div>
          <div style={{ overflowY:'auto', maxHeight:220 }}>
            {activities.map((a, i) => {
              const icons  = { score:'⚡', email:'✉️', booking:'📅', doc:'📄' }
              const colors = { score:T.green, email:T.blue, booking:T.gold, doc:T.muted }
              return (
                <div key={a.id} style={{ display:'flex', gap:10, padding:'10px 0',
                  borderBottom:i < activities.length-1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                    background:`${colors[a.type]}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
                    {icons[a.type]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:T.text, lineHeight:1.4 }}>{a.action}</div>
                    <div style={{ fontSize:10, color:T.muted, marginTop:2 }}><strong>{a.lead}</strong> · {a.time}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Tasso risposta',    value:'34%', trend:'↑ +12%',     col:T.green  },
          { label:'Ore risparmiate',   value:'89h', trend:'= €2.670',   col:T.blue   },
          { label:'Email AI inviate',  value:'247', trend:'↑ +18%',     col:T.gold   },
          { label:'Task completati',   value:activities.length, trend:'Questa settimana', col:T.accent },
        ].map(k => (
          <Card key={k.label} style={{ padding:'20px' }}>
            <div style={{ fontSize:9, color:T.muted, fontWeight:600, letterSpacing:'0.1em',
              textTransform:'uppercase', marginBottom:8, fontFamily:'monospace' }}>{k.label}</div>
            <div style={{ fontSize:34, fontWeight:900, color:k.col, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:11, color:k.col, fontWeight:500, marginTop:6 }}>{k.trend}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   LEADS VIEW
───────────────────────────────────── */
function LeadsView({ leads, setLeads, userId, setView, setAgentLead, addActivity }) {
  const [showAdd,  setShowAdd]  = useState(false)
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const fileRef = useRef()
  const [form, setForm] = useState({ name:'', company:'', role:'', email:'', phone:'', sector:'', deal_value:'', notes:'' })

  const filtered = leads
    .filter(l => filter === 'all' || l.status === filter)
    .filter(l => !search || [l.name,l.company,l.sector].some(v => v?.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b) => b.score - a.score)

  const addLead = async () => {
    if (!form.name.trim() || !form.company.trim()) return
    setSaving(true)
    const lead = { ...form, status:'cold', score:50, source:'Manuale', user_id:userId,
      created_at:new Date().toISOString() }

    if (userId) {
      const { data, error } = await supabase.from('leads').insert([lead]).select()
      if (!error && data?.[0]) {
        setLeads(p => [data[0], ...p])
        addActivity(form.name, 'Lead aggiunto manualmente', 'score')
      }
    } else {
      setLeads(p => [{ ...lead, id:`local-${Date.now()}` }, ...p])
    }
    setShowAdd(false)
    setForm({ name:'', company:'', role:'', email:'', phone:'', sector:'', deal_value:'', notes:'' })
    setSaving(false)
  }

  const deleteLead = async id => {
    if (userId && !id.toString().startsWith('demo') && !id.toString().startsWith('local')) {
      await supabase.from('leads').delete().eq('id', id)
    }
    setLeads(p => p.filter(l => l.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const importCSV = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const lines = ev.target.result.split('\n').filter(Boolean)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s/g,'_'))
      const imported = lines.slice(1).map((line, i) => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''))
        const obj = {}; headers.forEach((h, idx) => obj[h] = vals[idx] || '')
        return { name:obj.name||obj.nome||'Lead', company:obj.company||obj.azienda||'', role:obj.role||obj.ruolo||'',
          email:obj.email||'', sector:obj.sector||obj.settore||'', deal_value:obj.deal_value||'',
          notes:obj.notes||obj.note||'', status:'cold', score:50, source:'CSV Import',
          user_id:userId, created_at:new Date().toISOString() }
      }).filter(l => l.name !== 'Lead' && l.name)

      if (imported.length > 0) {
        if (userId) {
          const { data } = await supabase.from('leads').insert(imported).select()
          if (data) setLeads(p => [...data, ...p])
        } else {
          setLeads(p => [...imported.map((l,i) => ({...l, id:`local-${Date.now()}-${i}`})), ...p])
        }
        addActivity(`${imported.length} lead`, 'Importati da CSV', 'doc')
      }
    }
    reader.readAsText(file); e.target.value = ''
  }

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:38, fontWeight:900, color:T.white, letterSpacing:'-0.03em', marginBottom:6 }}>Lead</h1>
          <p style={{ color:T.muted, fontSize:14 }}>{leads.length} contatti · {leads.filter(l=>l.status==='hot').length} da contattare oggi</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <input type="file" accept=".csv" ref={fileRef} onChange={importCSV} style={{ display:'none' }} />
          <Btn variant="secondary" onClick={() => fileRef.current?.click()}>📥 Importa CSV</Btn>
          <Btn onClick={() => setShowAdd(true)}>+ Nuovo lead</Btn>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Cerca…"
          style={{ flex:1, minWidth:180, maxWidth:280, background:T.card, border:`1px solid ${T.border}`,
            borderRadius:7, padding:'9px 14px', fontSize:13, color:T.white, outline:'none', fontFamily:gs.fontFamily }} />
        {[['all','Tutti'],['hot','🔥 Hot'],['warm','⚡ Warm'],['cold','❄️ Cold']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ border:`1px solid ${filter===v?T.accent:T.border}`, borderRadius:6, padding:'8px 14px',
              fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:gs.fontFamily,
              background:filter===v?`${T.accent}12`:T.card, color:filter===v?T.accent:T.muted }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 300px':'1fr', gap:16 }}>
        <Card style={{ overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:560 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                  {['Lead','Azienda','Settore','Stato','Score','Deal',''].map(h => (
                    <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:9, fontWeight:700,
                      color:T.muted, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:'monospace' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const sel = selected?.id === lead.id
                  return (
                    <tr key={lead.id} onClick={() => setSelected(p => p?.id===lead.id ? null : lead)}
                      style={{ borderBottom:`1px solid ${T.border}`, cursor:'pointer',
                        background:sel?`${T.accent}06`:'transparent',
                        borderLeft:sel?`2px solid ${T.accent}`:'2px solid transparent' }}>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ fontWeight:500, fontSize:13, color:T.white }}>{lead.name}</div>
                        <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{lead.role}</div>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:T.text }}>{lead.company}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:T.muted }}>{lead.sector||'—'}</td>
                      <td style={{ padding:'12px 16px' }}><Badge status={lead.status} /></td>
                      <td style={{ padding:'12px 16px' }}><ScoreBar score={lead.score} /></td>
                      <td style={{ padding:'12px 16px', fontSize:12, fontWeight:600, color:T.text }}>{lead.deal_value||'—'}</td>
                      <td style={{ padding:'12px 10px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={e => { e.stopPropagation(); setAgentLead(lead); setView('agent') }}
                            style={{ background:`${T.accent}14`, color:T.accent, border:`1px solid ${T.accent}30`,
                              borderRadius:5, padding:'5px 10px', fontSize:10, fontWeight:700,
                              cursor:'pointer', fontFamily:'monospace' }}>AI →</button>
                          <button onClick={e => { e.stopPropagation(); deleteLead(lead.id) }}
                            style={{ background:'none', color:T.muted, border:`1px solid ${T.border}`,
                              borderRadius:5, padding:'5px 8px', fontSize:11, cursor:'pointer' }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {selected && (
          <Card style={{ padding:'22px 20px', position:'sticky', top:0 }} glow={T.accent}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:T.white }}>{selected.name}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{selected.role} · {selected.company}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              background:T.surface, borderRadius:8, padding:'12px 14px', marginBottom:12 }}>
              <ScoreBar score={selected.score} />
              <Badge status={selected.status} />
            </div>
            {selected.notes && (
              <div style={{ background:`${T.accent}08`, border:`1px solid ${T.accent}18`, borderRadius:7,
                padding:'11px 13px', fontSize:12, color:T.text, lineHeight:1.5, marginBottom:12 }}>{selected.notes}</div>
            )}
            {[['✉️', selected.email||'—'], ['📊', selected.sector||'—'], ['💰', selected.deal_value||'—']].map(([ic,v]) => (
              <div key={ic} style={{ display:'flex', gap:10, padding:'6px 0', fontSize:12,
                borderBottom:`1px solid ${T.border}` }}>
                <span>{ic}</span><span style={{ color:T.text }}>{v}</span>
              </div>
            ))}
            <button onClick={() => { setAgentLead(selected); setView('agent') }}
              style={{ width:'100%', marginTop:14, background:T.accent, color:'#fff', border:'none',
                borderRadius:8, padding:'11px 0', fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:gs.fontFamily, boxShadow:`0 0 24px ${T.accent}30` }}>
              🤖 Attiva Agente AI →
            </button>
          </Card>
        )}
      </div>

      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(6,7,10,0.85)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(8px)' }}>
          <Card style={{ width:500, maxWidth:'94vw', padding:32, maxHeight:'90vh', overflowY:'auto' }} glow={T.accent}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:22 }}>
              <h2 style={{ fontSize:22, fontWeight:700, color:T.white }}>Nuovo lead</h2>
              <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[['name','Nome *'],['company','Azienda *'],['role','Ruolo'],['email','Email'],['phone','Telefono'],['sector','Settore'],['deal_value','Valore deal']].map(([f,l]) => (
                <Input key={f} label={l} value={form[f]} onChange={e => setForm(p => ({...p,[f]:e.target.value}))} />
              ))}
              <div style={{ gridColumn:'span 2' }}>
                <Input label="Note" multiline value={form.notes} onChange={e => setForm(p => ({...p,notes:e.target.value}))} placeholder="Contesto, esigenze, budget…" />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              <Btn variant="ghost" onClick={() => setShowAdd(false)} full>Annulla</Btn>
              <Btn onClick={addLead} disabled={saving} full>{saving ? 'Salvataggio…' : 'Aggiungi →'}</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────
   AGENT VIEW
───────────────────────────────────── */
function AgentView({ leads, setLeads, agentLead, setAgentLead, userId, addActivity }) {
  const [task,      setTask]      = useState(null)
  const [output,    setOutput]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [inbound,   setInbound]   = useState('')
  const [chatMsgs,  setChatMsgs]  = useState([])
  const [chatInput, setChatInput] = useState('')
  const chatRef = useRef()

  const run = useCallback(async t => {
    if (!agentLead) return
    setLoading(true); setOutput(null); setError(''); setTask(t)
    try {
      let prompt = ''
      if (t === 'analyze') {
        prompt = `Analizza questo lead. SOLO JSON valido:
{"score":number,"calore":"hot"|"warm"|"cold","punti_dolore":["p1","p2","p3"],"approccio":"2-3 frasi","oggetto_email":"soggetto","deal_probability":number,"prossimo_passo":"azione concreta 48h"}
Lead: ${agentLead.name} (${agentLead.role}), ${agentLead.company} [${agentLead.sector}]
Note: ${agentLead.notes||'nessuna'} | Deal: ${agentLead.deal_value||'N/D'}`
      } else if (t === 'sequence') {
        prompt = `3 email B2B per: ${agentLead.name} (${agentLead.role}, ${agentLead.company}, ${agentLead.sector}).
Note: ${agentLead.notes||'nessuna'}\n
EMAIL 1 — GIORNO 1\nOGGETTO: ...\n[testo 110 parole, 1 CTA]\n
EMAIL 2 — GIORNO 6\nOGGETTO: ...\n[testo]\n
EMAIL 3 — GIORNO 14\nOGGETTO: ...\n[testo]`
      } else if (t === 'respond') {
        prompt = `${agentLead.name} (${agentLead.role}, ${agentLead.company}) ha risposto: "${inbound}"
Risposta professionale max 100 parole. Gestisci l'obiezione, proponi prossimo passo. Firma: Francesco — PipelineAI`
      } else if (t === 'proposal') {
        prompt = `Proposta commerciale per ${agentLead.name}, ${agentLead.company} [${agentLead.sector}].
Esigenza: ${agentLead.notes||'automazione vendite B2B'}. Deal: ${agentLead.deal_value||'N/D'}.
Sezioni con "== TITOLO ==": Executive Summary, Problema, Soluzione, Piano 30/60/90gg, Investimento (scegli tra Starter €49, Pro €149, Business €399), Prossimo Passo. Max 400 parole.`
      }

      const text = await callAI(prompt)
      if (t === 'analyze') {
        let d; try { d = JSON.parse(text.replace(/```json|```/gi,'').trim()) } catch { const m=text.match(/\{[\s\S]*\}/); if(m) d=JSON.parse(m[0]); else throw new Error('JSON non valido') }
        setOutput({ type:'analyze', data:d })
        const updates = { score:d.score, status:d.calore }
        setLeads(p => p.map(l => l.id===agentLead.id ? {...l,...updates} : l))
        setAgentLead(p => ({...p,...updates}))
        if (userId) await supabase.from('leads').update(updates).eq('id', agentLead.id)
        addActivity(agentLead.name, `Analisi AI — Score ${d.score} · Deal ${d.deal_probability}%`, 'score')
      } else {
        setOutput({ type:t, text })
        addActivity(agentLead.name, { sequence:'Sequenza email generata', respond:'Risposta inbound scritta', proposal:'Proposta commerciale generata' }[t], t==='proposal'?'doc':'email')
      }
    } catch(e) { setError('Errore AI: ' + e.message) }
    setLoading(false)
  }, [agentLead, inbound, setLeads, setAgentLead, userId, addActivity])

  const sendChat = async () => {
    if (!chatInput.trim() || !agentLead) return
    const msg = chatInput.trim(); setChatMsgs(p => [...p,{role:'user',content:msg}]); setChatInput('')
    try {
      const reply = await callAI(`Lead: ${agentLead.name} (${agentLead.role}, ${agentLead.company}). Note: ${agentLead.notes}.\nDomanda: ${msg}`)
      setChatMsgs(p => [...p, {role:'assistant',content:reply}])
    } catch(e) { setChatMsgs(p => [...p,{role:'assistant',content:'Errore: '+e.message}]) }
    setTimeout(() => chatRef.current?.scrollTo(0, 9999), 100)
  }

  const TASKS = [
    { id:'analyze',  emoji:'⚡', label:'Analizza & Scorifica',   desc:'Score, deal probability, punti dolore, prossimo passo' },
    { id:'sequence', emoji:'✉️', label:'Sequenza 3 email',       desc:'Email personalizzate Giorno 1, 6 e 14' },
    { id:'respond',  emoji:'💬', label:'Rispondi all\'inbound',  desc:'Incolla la risposta del prospect, l\'AI risponde' },
    { id:'proposal', emoji:'📄', label:'Proposta commerciale',   desc:'Documento completo con piano e pricing' },
  ]

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:38, fontWeight:900, color:T.white, letterSpacing:'-0.03em', marginBottom:6 }}>Agente AI</h1>
        <p style={{ color:T.muted, fontSize:14 }}>Seleziona un lead, attiva un task. Risultati in secondi.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'210px 1fr', gap:16 }}>
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:`1px solid ${T.border}`, fontSize:9, color:T.muted,
            fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:'monospace' }}>Seleziona lead</div>
          {leads.map(lead => {
            const sel = agentLead?.id === lead.id, m = statusMeta(lead.status)
            return (
              <div key={lead.id} onClick={() => { setAgentLead(lead); setOutput(null); setError(''); setChatMsgs([]) }}
                style={{ padding:'12px 14px', cursor:'pointer', borderBottom:`1px solid ${T.border}`,
                  background:sel?`${T.accent}08`:'transparent', borderLeft:sel?`2px solid ${T.accent}`:'2px solid transparent' }}>
                <div style={{ fontWeight:500, fontSize:12, color:T.white }}>{lead.name}</div>
                <div style={{ fontSize:10, color:T.muted, marginTop:1 }}>{lead.company}</div>
                <div style={{ display:'flex', gap:5, marginTop:5, alignItems:'center' }}>
                  <span style={{ fontSize:9, fontWeight:700, color:m.color, fontFamily:'monospace' }}>{m.emoji} {m.label}</span>
                  <span style={{ fontSize:9, color:T.muted }}>· {lead.score}pt</span>
                </div>
              </div>
            )
          })}
        </Card>

        {!agentLead ? (
          <Card style={{ padding:'64px 40px', textAlign:'center' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🤖</div>
            <div style={{ fontSize:22, fontWeight:700, color:T.white, marginBottom:8 }}>Nessun lead selezionato</div>
            <div style={{ fontSize:14, color:T.muted }}>Scegli un lead dalla lista a sinistra</div>
          </Card>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Card style={{ padding:'22px 24px' }} glow={T.accent}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:9, color:T.muted, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'monospace', marginBottom:6 }}>Lead attivo</div>
                  <div style={{ fontSize:24, fontWeight:700, color:T.white, lineHeight:1 }}>{agentLead.name}</div>
                  <div style={{ color:T.muted, fontSize:12, marginTop:4 }}>{agentLead.role} · {agentLead.company}</div>
                  {agentLead.notes && <div style={{ marginTop:8, fontSize:11, color:T.muted, fontStyle:'italic', maxWidth:480, lineHeight:1.5 }}>"{agentLead.notes.slice(0,120)}{agentLead.notes.length>120?'…':''}"</div>}
                </div>
                <div style={{ textAlign:'center', flexShrink:0, marginLeft:16 }}>
                  <div style={{ fontSize:52, fontWeight:900, color:scoreCol(agentLead.score), lineHeight:1 }}>{agentLead.score}</div>
                  <div style={{ fontSize:9, color:T.muted, fontFamily:'monospace', marginTop:4, textTransform:'uppercase' }}>Score</div>
                  <div style={{ marginTop:6 }}><Badge status={agentLead.status} /></div>
                </div>
              </div>
            </Card>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {TASKS.map(tc => (
                <button key={tc.id}
                  onClick={() => { setOutput(null); setError(''); tc.id==='respond'?setTask('respond'):run(tc.id) }}
                  style={{ background:T.card, border:`1px solid ${task===tc.id?T.accent:T.border}`,
                    borderRadius:10, padding:18, textAlign:'left', cursor:'pointer', transition:'all 0.14s',
                    outline:'none', fontFamily:gs.fontFamily }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = task===tc.id?T.accent:T.border; e.currentTarget.style.transform = 'none' }}>
                  <div style={{ fontSize:22, marginBottom:8 }}>{tc.emoji}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.white, marginBottom:4 }}>{tc.label}</div>
                  <div style={{ fontSize:11, color:T.muted, lineHeight:1.45 }}>{tc.desc}</div>
                </button>
              ))}
            </div>

            {task === 'respond' && (
              <Card style={{ padding:20 }}>
                <Input label="Risposta del prospect" multiline value={inbound} onChange={e=>setInbound(e.target.value)} placeholder={`"Non è una priorità adesso…"`} />
                <Btn onClick={() => run('respond')} disabled={!inbound.trim()} style={{ marginTop:12 }}>Genera risposta →</Btn>
              </Card>
            )}

            {error && <div style={{ background:`${T.accent}12`, border:`1px solid ${T.accent}28`, borderRadius:8, padding:'12px 16px', fontSize:13, color:T.accent }}>⚠️ {error}</div>}

            {loading && (
              <Card style={{ padding:'22px 24px', display:'flex', alignItems:'center', gap:14 }}>
                <Spinner />
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.white, marginBottom:3 }}>Agente in elaborazione…</div>
                  <div style={{ fontSize:11, color:T.muted }}>Analisi per {agentLead.name}</div>
                </div>
              </Card>
            )}

            {!loading && output && (
              <Card style={{ padding:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
                  <span style={{ fontSize:9, color:T.green, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:'monospace' }}>✅ Output pronto</span>
                  <button onClick={() => navigator.clipboard?.writeText(output.text || JSON.stringify(output.data,null,2))}
                    style={{ fontSize:11, color:T.muted, background:'none', border:`1px solid ${T.border}`, borderRadius:5, padding:'4px 10px', cursor:'pointer', fontFamily:'monospace' }}>📋 Copia</button>
                </div>

                {output.type === 'analyze' && (() => {
                  const d = output.data
                  return (
                    <div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
                        {[{l:'Score',v:d.score,c:T.green},{l:'Deal prob.',v:`${d.deal_probability}%`,c:T.blue},{l:'Calore',v:(d.calore||'').toUpperCase(),c:d.calore==='hot'?T.accent:d.calore==='warm'?T.gold:T.muted}].map(k=>(
                          <div key={k.l} style={{ background:T.surface, borderRadius:8, padding:14, border:`1px solid ${T.border2}` }}>
                            <div style={{ fontSize:9, color:T.muted, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{k.l}</div>
                            <div style={{ fontSize:28, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</div>
                          </div>
                        ))}
                        <div style={{ background:T.surface, borderRadius:8, padding:14, border:`1px solid ${T.border2}` }}>
                          <div style={{ fontSize:9, color:T.muted, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Prossimo passo</div>
                          <div style={{ fontSize:11, color:T.text, lineHeight:1.4 }}>{d.prossimo_passo}</div>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div style={{ background:T.surface, borderRadius:8, padding:14, border:`1px solid ${T.border2}` }}>
                          <div style={{ fontSize:9, color:T.muted, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Punti dolore</div>
                          {(d.punti_dolore||[]).map((p,i)=><div key={i} style={{ fontSize:12, color:T.text, padding:'4px 0', borderBottom:i<(d.punti_dolore?.length||0)-1?`1px solid ${T.border}`:'none', display:'flex', gap:7 }}><span style={{ color:T.accent }}>→</span>{p}</div>)}
                        </div>
                        <div style={{ background:T.surface, borderRadius:8, padding:14, border:`1px solid ${T.border2}` }}>
                          <div style={{ fontSize:9, color:T.muted, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Approccio</div>
                          <div style={{ fontSize:12, color:T.text, lineHeight:1.6, marginBottom:10 }}>{d.approccio}</div>
                          <div style={{ fontSize:11, color:T.text, fontStyle:'italic', background:T.card, padding:'7px 10px', borderRadius:6, border:`1px solid ${T.border}` }}>"{d.oggetto_email}"</div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {['sequence','respond','proposal'].includes(output.type) && (
                  <div style={{ fontSize:13, color:T.text, lineHeight:1.8, whiteSpace:'pre-wrap', maxHeight:500, overflowY:'auto' }}>{output.text}</div>
                )}
              </Card>
            )}

            <Card style={{ padding:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.white, marginBottom:14 }}>💬 Chatta con l'agente su {agentLead.name}</div>
              <div ref={chatRef} style={{ maxHeight:160, overflowY:'auto', marginBottom:12, display:'flex', flexDirection:'column', gap:8 }}>
                {chatMsgs.length === 0
                  ? <div style={{ fontSize:12, color:T.muted, fontStyle:'italic' }}>Es: "Come gestisco l'obiezione del prezzo?"</div>
                  : chatMsgs.map((m,i) => (
                    <div key={i} style={{ alignSelf:m.role==='user'?'flex-end':'flex-start', maxWidth:'85%',
                      background:m.role==='user'?T.accent:T.surface, color:T.white,
                      borderRadius:m.role==='user'?'10px 10px 2px 10px':'10px 10px 10px 2px',
                      padding:'9px 13px', fontSize:12, lineHeight:1.5 }}>{m.content}</div>
                  ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter'&&!e.shiftKey&&sendChat()}
                  placeholder="Fai una domanda su questo lead…"
                  style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:7,
                    padding:'9px 13px', fontSize:12, color:T.white, outline:'none', fontFamily:gs.fontFamily }} />
                <button onClick={sendChat} disabled={!chatInput.trim()}
                  style={{ background:T.accent, color:'#fff', border:'none', borderRadius:7, padding:'9px 16px',
                    fontSize:13, fontWeight:700, cursor:chatInput.trim()?'pointer':'not-allowed',
                    opacity:chatInput.trim()?1:0.4, fontFamily:gs.fontFamily }}>→</button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   ANALYTICS VIEW
───────────────────────────────────── */
function AnalyticsView({ leads }) {
  const hot = leads.filter(l=>l.status==='hot').length
  const warm = leads.filter(l=>l.status==='warm').length
  const cold = leads.filter(l=>l.status==='cold').length
  const pie = [{name:'Hot',value:hot,color:T.accent},{name:'Warm',value:warm,color:T.gold},{name:'Cold',value:cold,color:T.muted}]

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:38, fontWeight:900, color:T.white, letterSpacing:'-0.03em', marginBottom:6 }}>Analytics</h1>
        <p style={{ color:T.muted, fontSize:14 }}>Performance agente AI · {leads.length} lead totali</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[{l:'Email inviate',v:'247',t:'↑ +18%',c:T.blue},{l:'Tasso risposta',v:'34%',t:'↑ +12%',c:T.green},{l:'Ore risparmiate',v:'89h',t:'= €2.670',c:T.gold},{l:'Convertiti',v:'7',t:'23% tasso',c:T.accent}].map(k=>(
          <Card key={k.l} style={{ padding:'22px 20px', borderTop:`2px solid ${k.c}` }}>
            <div style={{ fontSize:9, color:T.muted, fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>{k.l}</div>
            <div style={{ fontSize:38, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</div>
            <div style={{ fontSize:11, color:k.c, marginTop:6 }}>{k.t}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16, marginBottom:16 }}>
        <Card style={{ padding:'24px 26px 18px' }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.white, marginBottom:20 }}>Conversione pipeline</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PIPELINE_WK} margin={{ left:-10, right:4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="w" tick={{ fontSize:10, fill:T.muted }} />
              <YAxis tick={{ fontSize:10, fill:T.muted }} />
              <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11, color:T.white }} itemStyle={{ color:T.text }} />
              <Bar dataKey="leads"  fill={`${T.blue}40`} name="Totali" />
              <Bar dataKey="qual"   fill={T.blue}        name="Qualificati" />
              <Bar dataKey="closed" fill={T.accent}      name="Chiusi" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding:'22px' }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.white, marginBottom:14 }}>Distribuzione lead</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pie} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                {pie.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }}
                itemStyle={{ color:T.white }}
                labelStyle={{ color:T.white }}
                formatter={(value, name) => [`${value} lead`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', justifyContent:'center', gap:14, marginTop:8 }}>
            {pie.map(p => <div key={p.name} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:T.muted }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:p.color }} />{p.name} ({p.value})
            </div>)}
          </div>
        </Card>
      </div>

      <Card style={{ padding:'24px 26px' }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.white, marginBottom:18 }}>Score AI per lead</div>
        {[...leads].sort((a,b)=>b.score-a.score).map(lead=>(
          <div key={lead.id} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:11 }}>
            <div style={{ width:120, fontSize:12, color:T.white, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{lead.name}</div>
            <div style={{ flex:1, height:6, background:T.border, borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${lead.score}%`, height:'100%', background:scoreCol(lead.score), borderRadius:3 }} />
            </div>
            <div style={{ width:28, textAlign:'right', fontFamily:'monospace', fontSize:12, fontWeight:700, color:scoreCol(lead.score), flexShrink:0 }}>{lead.score}</div>
            <Badge status={lead.status} />
          </div>
        ))}
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────
   SETTINGS VIEW
───────────────────────────────────── */
function SettingsView({ user, onLogout, setView }) {
  const pl = PLANS.find(p => p.id === user.plan) || PLANS[1]
  return (
    <div style={{ padding:'32px 36px', maxWidth:680 }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:38, fontWeight:900, color:T.white, letterSpacing:'-0.03em', marginBottom:6 }}>Impostazioni</h1>
        <p style={{ color:T.muted, fontSize:14 }}>Gestisci il tuo account e abbonamento</p>
      </div>

      <Card style={{ padding:28, marginBottom:16 }}>
        <div style={{ fontSize:10, color:T.muted, fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>Profilo</div>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:`${T.accent}20`, border:`2px solid ${T.accent}`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:T.accent }}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:600, color:T.white }}>{user.name || user.email}</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{user.email}</div>
          </div>
        </div>
        <Btn variant="ghost" onClick={onLogout}>Esci dall'account</Btn>
      </Card>

      <Card style={{ padding:28, marginBottom:16 }} glow={pl.color}>
        <div style={{ fontSize:10, color:T.muted, fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>Piano attuale</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:28, fontWeight:900, color:pl.color, lineHeight:1, marginBottom:4 }}>{pl.name}</div>
            <div style={{ fontSize:13, color:T.muted }}>€{pl.price}/mese</div>
          </div>
          <Btn onClick={() => setView('pricing')}>Cambia piano →</Btn>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {pl.features.map(f => <span key={f} style={{ background:`${pl.color}14`, color:pl.color, fontSize:11,
            padding:'4px 10px', borderRadius:20, border:`1px solid ${pl.color}28` }}>{f}</span>)}
        </div>
      </Card>

      <Card style={{ padding:28 }}>
        <div style={{ fontSize:10, color:T.muted, fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>Stato integrazioni</div>
        {[
          { name:'Anthropic AI',    status:'Connesso',         color:T.green, icon:'🤖' },
          { name:'Database',        status:'Supabase attivo',  color:T.green, icon:'🗄️' },
          { name:'Invio email',     status:'Da configurare',   color:T.muted, icon:'✉️' },
          { name:'Stripe Payments', status:'Da configurare',   color:T.muted, icon:'💳' },
        ].map(s => (
          <div key={s.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'12px 0', borderBottom:`1px solid ${T.border}` }}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <span style={{ fontSize:18 }}>{s.icon}</span>
              <span style={{ fontSize:13, color:T.text, fontWeight:500 }}>{s.name}</span>
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:s.color, fontFamily:'monospace',
              background:`${s.color}14`, padding:'3px 10px', borderRadius:20 }}>{s.status}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────
   ROOT APP
───────────────────────────────────── */
const INIT_ACTS = [
  { id:1, lead:'Sara Conti',       action:'Lead qualificato — Score 92 · Alta priorità',  time:'1h fa',  type:'score' },
  { id:2, lead:'Marco Ferretti',   action:'Sequenza 3 email generata e programmata',       time:'2h fa',  type:'email' },
  { id:3, lead:'Giulia Marchetti', action:'Analisi — Deal probability 68%',                time:'ieri',   type:'score' },
  { id:4, lead:'Andrea Romano',    action:'Proposta commerciale inviata',                  time:'ieri',   type:'doc'   },
]

export default function App() {
  const [user,       setUser]      = useState(null)
  const [view,       setView]      = useState('dashboard')
  const [leads,      setLeads]     = useState(DEMO_LEADS)
  const [agentLead,  setAgentLead] = useState(null)
  const [activities, setActivities]= useState(INIT_ACTS)
  const [authLoading,setAuthLoading]=useState(true)

  // Check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {}
        setUser({ ...session.user, name:meta.name||session.user.email.split('@')[0], plan:meta.plan||'pro' })
      }
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); setLeads(DEMO_LEADS) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load user's leads from Supabase
  useEffect(() => {
    if (!user?.id) return
    supabase.from('leads').select('*').eq('user_id', user.id).order('created_at', { ascending:false })
      .then(({ data }) => { if (data && data.length > 0) setLeads(data) })
  }, [user?.id])

  const addActivity = useCallback((lead, action, type) => {
    setActivities(p => [{ id:Date.now(), lead, action, time:'adesso', type }, ...p.slice(0,19)])
  }, [])

  const onLogin = u => setUser(u)
  const onLogout = async () => {
    await supabase.auth.signOut()
    setUser(null); setView('dashboard'); setLeads(DEMO_LEADS)
  }

  if (authLoading) return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column', gap:16 }}>
      <Spinner />
      <div style={{ color:T.muted, fontSize:13, fontFamily:gs.fontFamily }}>Caricamento…</div>
    </div>
  )

  if (!user) return <AuthScreen onLogin={onLogin} />
  if (view === 'pricing') return <PricingScreen user={user} onBack={() => setView('dashboard')} />

  const NAV = [
    { id:'dashboard', icon:'◼', label:'Dashboard'    },
    { id:'leads',     icon:'◉', label:'Lead'          },
    { id:'agent',     icon:'⬡', label:'Agente AI'     },
    { id:'analytics', icon:'◈', label:'Analytics'     },
    { id:'settings',  icon:'◧', label:'Impostazioni'  },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:${T.bg}; font-family:'Geist',system-ui,sans-serif; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:${T.border2}; border-radius:2px; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:T.bg }}>
        <aside style={{ width:220, background:T.surface, borderRight:`1px solid ${T.border}`,
          display:'flex', flexDirection:'column', flexShrink:0 }}>

          <div style={{ padding:'22px 20px 18px', borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontSize:24, fontWeight:900, color:T.white, letterSpacing:'-0.03em' }}>
              Pipeline<span style={{ color:T.accent }}>AI</span>
            </div>
            <div style={{ fontSize:9, color:T.muted, marginTop:4, letterSpacing:'0.14em',
              textTransform:'uppercase', fontFamily:'monospace' }}>Revenue Agent v3</div>
          </div>

          <div style={{ padding:'12px 20px', borderBottom:`1px solid ${T.border}`,
            display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:`${T.accent}20`,
              border:`1px solid ${T.accent}40`, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:700, color:T.accent, flexShrink:0 }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name || user.email}</div>
              <div style={{ fontSize:10, color:T.muted, fontFamily:'monospace' }}>{PLANS.find(p=>p.id===user.plan)?.name||'Pro'} Plan</div>
            </div>
          </div>

          <nav style={{ padding:'10px 8px', flex:1 }}>
            {NAV.map(n => {
              const act = view === n.id
              return (
                <div key={n.id} onClick={() => setView(n.id)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                    borderRadius:8, cursor:'pointer', marginBottom:2,
                    background:act?`${T.accent}14`:'transparent',
                    color:act?T.white:T.muted, transition:'all 0.12s' }}>
                  <span style={{ fontSize:14, color:act?T.accent:T.muted }}>{n.icon}</span>
                  <span style={{ fontSize:13, fontWeight:act?600:400 }}>{n.label}</span>
                  {act && <div style={{ marginLeft:'auto', width:4, height:4, borderRadius:'50%', background:T.accent }} />}
                </div>
              )
            })}
          </nav>

          <div style={{ padding:'12px 12px 20px' }}>
            <div style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}24`, borderRadius:8, padding:'11px 13px' }}>
              <div style={{ fontSize:9, color:T.accent, fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', fontFamily:'monospace', marginBottom:4 }}>● AGENTE ATTIVO</div>
              <div style={{ fontSize:11, color:T.muted }}>{leads.length} lead gestiti</div>
              <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>
                {leads.filter(l=>l.status==='hot').length} hot · {leads.filter(l=>l.status==='warm').length} warm
              </div>
            </div>
          </div>
        </aside>

        <main style={{ flex:1, overflowY:'auto', background:T.bg }}>
          {view==='dashboard' && <DashboardView leads={leads} activities={activities} user={user} />}
          {view==='leads'     && <LeadsView leads={leads} setLeads={setLeads} userId={user?.id} setView={setView} setAgentLead={setAgentLead} addActivity={addActivity} />}
          {view==='agent'     && <AgentView leads={leads} setLeads={setLeads} agentLead={agentLead} setAgentLead={setAgentLead} userId={user?.id} addActivity={addActivity} />}
          {view==='analytics' && <AnalyticsView leads={leads} />}
          {view==='settings'  && <SettingsView user={user} onLogout={onLogout} setView={setView} />}
        </main>
      </div>
    </>
  )
}

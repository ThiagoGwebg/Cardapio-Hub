'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchLeads,
  setLeadStatus,
  setLeadNotes,
  approveLead,
  resetLeadPassword,
  type LeadRow,
} from './actions'

type Filter = 'novo' | 'contatado' | 'fechado' | 'todos'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  novo: { label: 'Novo', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  contatado: { label: 'Em contato', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.11)' },
  fechado: { label: 'Cliente', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  perdido: { label: 'Perdido', color: '#f87171', bg: 'rgba(248, 113, 113, 0.11)' },
}
const STATUS_ORDER = ['novo', 'contatado', 'fechado', 'perdido'] as const

const POLL_MS = 10_000

function onlyDigits(raw: string | null): string {
  return (raw || '').replace(/\D/g, '')
}
function waLink(raw: string | null, text?: string): string | null {
  const d = onlyDigits(raw)
  if (d.length < 10) return null
  const num = d.startsWith('55') ? d : '55' + d
  return `https://wa.me/${num}${text ? '?text=' + encodeURIComponent(text) : ''}`
}
function telLink(raw: string | null): string | null {
  const d = onlyDigits(raw)
  return d.length < 8 ? null : `tel:${d.startsWith('55') ? '+' + d : d}`
}
function initial(name: string | null): string {
  return (name?.trim()?.charAt(0) || '?').toUpperCase()
}
function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  if (d < 30) return `há ${d} dias`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ── Alertas (som + notificação + vibração) ─────────────────────────────
function makeDing(ctx: AudioContext) {
  const t0 = ctx.currentTime
  ;[880, 1318.5].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)
    const t = t0 + i * 0.14
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    osc.start(t)
    osc.stop(t + 0.45)
  })
}

// Credenciais retornadas na aprovação/reset — mostradas uma única vez
type Credentials = { email: string; password: string; slug: string; leadName: string | null; leadWhatsapp: string | null }

export default function LeadsBoard({ initialLeads }: { initialLeads: LeadRow[] }) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads)
  const [filter, setFilter] = useState<Filter>('novo')
  const [query, setQuery] = useState('')
  const [now, setNow] = useState<number>(() => new Date(initialLeads[0]?.created_at ?? 0).getTime() || 0)
  const [alertsOn, setAlertsOn] = useState(false)
  const [toast, setToast] = useState<LeadRow | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [approving, setApproving] = useState<LeadRow | null>(null)
  const [credentials, setCredentials] = useState<Credentials | null>(null)

  const seenIds = useRef<Set<string>>(new Set(initialLeads.map((l) => l.id)))
  const audioRef = useRef<AudioContext | null>(null)
  const alertsOnRef = useRef(false)
  const firstLoad = useRef(true)

  const pendingCount = leads.filter((l) => l.status === 'novo').length

  // Título da aba mostra quantos pendentes (badge mesmo com o painel em segundo plano)
  useEffect(() => {
    document.title = pendingCount > 0 ? `(${pendingCount}) Leads` : 'Leads'
  }, [pendingCount])

  const fireAlert = useCallback((lead: LeadRow) => {
    setToast(lead)
    if (typeof window !== 'undefined') window.setTimeout(() => setToast(null), 7000)
    try {
      if (audioRef.current) makeDing(audioRef.current)
    } catch {}
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎉 Novo lead!', {
          body: `${lead.name || 'Sem nome'}${lead.segment ? ' · ' + lead.segment : ''}${
            lead.whatsapp ? '\n' + lead.whatsapp : ''
          }`,
          tag: lead.id,
          icon: '/admin/leads/app-icon.svg',
        })
      }
    } catch {}
    try {
      navigator.vibrate?.([180, 90, 180])
    } catch {}
  }, [])

  const applyLeads = useCallback(
    (incoming: LeadRow[]) => {
      const fresh = incoming.filter((l) => !seenIds.current.has(l.id))
      incoming.forEach((l) => seenIds.current.add(l.id))
      setLeads(incoming)
      setNow(Date.now())

      if (firstLoad.current) {
        firstLoad.current = false
        return
      }
      if (fresh.length && alertsOnRef.current) {
        // toca só uma vez, destaca o mais recente
        fireAlert(fresh[0])
      }
    },
    [fireAlert]
  )

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const data = await fetchLeads()
      applyLeads(data)
    } catch {
      // silencioso — próxima rodada tenta de novo
    } finally {
      setRefreshing(false)
    }
  }, [applyLeads])

  // Polling ao vivo + atualiza ao voltar o foco
  useEffect(() => {
    firstLoad.current = false // já temos os leads iniciais do servidor
    const raf = requestAnimationFrame(() => setNow(Date.now())) // acerta o relógio após hidratar
    const id = window.setInterval(refresh, POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', refresh)
    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  // Mantém os "há X min" atualizados
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  async function enableAlerts() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!audioRef.current && Ctx) audioRef.current = new Ctx()
      await audioRef.current?.resume()
      if (audioRef.current) makeDing(audioRef.current) // toca um teste = feedback de que ativou
    } catch {}
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    } catch {}
    alertsOnRef.current = true
    setAlertsOn(true)
    try {
      localStorage.setItem('leads_alerts', '1')
    } catch {}
  }

  function disableAlerts() {
    alertsOnRef.current = false
    setAlertsOn(false)
    try {
      localStorage.removeItem('leads_alerts')
    } catch {}
  }

  // Atualiza um lead localmente (otimista) e persiste no servidor
  function patchLead(id: string, patch: Partial<LeadRow>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const counts = {
    novo: leads.filter((l) => l.status === 'novo').length,
    contatado: leads.filter((l) => l.status === 'contatado').length,
    fechado: leads.filter((l) => l.status === 'fechado').length,
    todos: leads.length,
  }
  const conversion = counts.todos > 0 ? Math.round((counts.fechado / counts.todos) * 100) : 0

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qDigits = onlyDigits(q)
    return leads.filter((l) => {
      if (filter !== 'todos' && l.status !== filter) return false
      if (!q) return true
      return (
        (l.name || '').toLowerCase().includes(q) ||
        (l.company || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (qDigits.length >= 4 && onlyDigits(l.whatsapp).includes(qDigits))
      )
    })
  }, [leads, filter, query])

  return (
    <div className="leads-app">
      <header className="leads-header">
        <div className="leads-header-inner">
          <div className="leads-header-row">
            <div className="leads-title">
              Leads
              {pendingCount > 0 && <span className="leads-pending-badge">{pendingCount}</span>}
            </div>
            <div className="leads-header-actions">
              <button
                className="leads-icon-btn"
                onClick={refresh}
                aria-label="Atualizar"
                title="Atualizar"
              >
                <svg className={refreshing ? 'spin' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              </button>
              <button
                className={`leads-icon-btn ${alertsOn ? 'on' : ''}`}
                onClick={alertsOn ? disableAlerts : enableAlerts}
                aria-label="Alertas"
                title={alertsOn ? 'Alertas ligados' : 'Ativar alertas'}
              >
                {alertsOn ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    <path d="M18.63 13A17.9 17.9 0 0 1 18 8" />
                    <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                    <path d="M18 8a6 6 0 0 0-9.33-5" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {!alertsOn && (
            <button className="leads-alert-cta" onClick={enableAlerts}>
              🔔 Tocar um som e me avisar a cada lead novo
            </button>
          )}

          <div className="leads-stats">
            <div className="leads-stat">
              <span className="leads-stat-num">{counts.novo}</span>
              <span className="leads-stat-label">Pendentes</span>
            </div>
            <div className="leads-stat">
              <span className="leads-stat-num">{counts.contatado}</span>
              <span className="leads-stat-label">Em contato</span>
            </div>
            <div className="leads-stat">
              <span className="leads-stat-num green">{counts.fechado}</span>
              <span className="leads-stat-label">Clientes</span>
            </div>
            <div className="leads-stat">
              <span className="leads-stat-num">{conversion}%</span>
              <span className="leads-stat-label">Conversão</span>
            </div>
          </div>

          <div className="leads-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, empresa, e-mail ou WhatsApp…"
            />
            {query && (
              <button className="leads-search-clear" onClick={() => setQuery('')} aria-label="Limpar busca">✕</button>
            )}
          </div>

          <div className="leads-tabs">
            <button className={`leads-tab ${filter === 'novo' ? 'active' : ''}`} onClick={() => setFilter('novo')}>
              Pendentes {counts.novo > 0 && <span className="leads-tab-count">{counts.novo}</span>}
            </button>
            <button className={`leads-tab ${filter === 'contatado' ? 'active' : ''}`} onClick={() => setFilter('contatado')}>
              Em contato {counts.contatado > 0 && <span className="leads-tab-count">{counts.contatado}</span>}
            </button>
            <button className={`leads-tab ${filter === 'fechado' ? 'active' : ''}`} onClick={() => setFilter('fechado')}>
              Clientes {counts.fechado > 0 && <span className="leads-tab-count green">{counts.fechado}</span>}
            </button>
            <button className={`leads-tab ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>
              Todos <span className="leads-tab-count muted">{counts.todos}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="leads-list">
        {visible.length === 0 ? (
          <div className="leads-empty">
            {query ? (
              <>
                <div className="leads-empty-emoji">🔍</div>
                <div className="leads-empty-title">Nada encontrado</div>
                <div className="leads-empty-sub">Nenhum lead bate com “{query}” nesse filtro.</div>
              </>
            ) : filter === 'novo' ? (
              <>
                <div className="leads-empty-emoji">✅</div>
                <div className="leads-empty-title">Nenhum lead pendente</div>
                <div className="leads-empty-sub">Tudo em dia! Quando alguém preencher o formulário, aparece aqui na hora.</div>
              </>
            ) : (
              <>
                <div className="leads-empty-emoji">📭</div>
                <div className="leads-empty-title">Nada por aqui ainda</div>
              </>
            )}
          </div>
        ) : (
          <div className="leads-grid">
            {visible.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                now={now}
                onPatch={patchLead}
                onApprove={() => setApproving(lead)}
                onCredentials={(c) => setCredentials(c)}
              />
            ))}
          </div>
        )}
        <div className="leads-foot">
          {refreshing ? 'Atualizando…' : `Atualiza sozinho a cada ${POLL_MS / 1000}s`}
        </div>
      </main>

      {approving && (
        <ApproveModal
          lead={approving}
          onClose={() => setApproving(null)}
          onDone={(creds, storeId) => {
            patchLead(approving.id, {
              status: 'fechado',
              converted_at: new Date().toISOString(),
              converted_store_id: storeId,
              store_slug: creds.slug,
            })
            setApproving(null)
            setCredentials(creds)
          }}
        />
      )}

      {credentials && (
        <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />
      )}

      {toast && (
        <button className="leads-toast" onClick={() => { setFilter('novo'); setToast(null) }}>
          <span className="leads-toast-dot" />
          <span className="leads-toast-text">
            <strong>Novo lead!</strong> {toast.name || 'Sem nome'}
            {toast.segment ? ` · ${toast.segment}` : ''}
          </span>
          <span className="leads-toast-cta">ver →</span>
        </button>
      )}
    </div>
  )
}

function LeadCard({
  lead,
  now,
  onPatch,
  onApprove,
  onCredentials,
}: {
  lead: LeadRow
  now: number
  onPatch: (id: string, patch: Partial<LeadRow>) => void
  onApprove: () => void
  onCredentials: (c: Credentials) => void
}) {
  const [openNotes, setOpenNotes] = useState(false)
  const [notes, setNotes] = useState(lead.notes || '')
  const [savingNote, setSavingNote] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const [busyStatus, setBusyStatus] = useState(false)
  const [resetting, setResetting] = useState(false)

  const meta = STATUS_META[lead.status] || STATUS_META.novo
  const wa = waLink(lead.whatsapp)
  const tel = telLink(lead.whatsapp)
  const isNew = lead.status === 'novo'
  const converted = Boolean(lead.converted_store_id)

  async function changeStatus(s: string) {
    if (s === lead.status || busyStatus) return
    // 'fechado' de verdade passa pela aprovação (cria a conta); aqui só bloqueia o atalho
    if (s === 'fechado' && !converted) {
      onApprove()
      return
    }
    setBusyStatus(true)
    const prev = lead.status
    onPatch(lead.id, { status: s })
    const res = await setLeadStatus(lead.id, s)
    if (!res.ok) onPatch(lead.id, { status: prev })
    setBusyStatus(false)
  }

  async function saveNotes() {
    setSavingNote(true)
    setSavedNote(false)
    const res = await setLeadNotes(lead.id, notes)
    setSavingNote(false)
    if (res.ok) {
      onPatch(lead.id, { notes: notes.trim() || null })
      setSavedNote(true)
      window.setTimeout(() => setSavedNote(false), 2000)
    }
  }

  async function newPassword() {
    if (resetting) return
    if (!window.confirm('Gerar uma nova senha temporária pra esse cliente? A senha antiga deixa de funcionar.')) return
    setResetting(true)
    const res = await resetLeadPassword(lead.id)
    setResetting(false)
    if (res.ok) {
      onCredentials({ ...res, leadName: lead.name, leadWhatsapp: lead.whatsapp })
    } else {
      window.alert(res.error)
    }
  }

  return (
    <article className={`lead-card ${isNew ? 'is-new' : ''} ${converted ? 'is-client' : ''}`}>
      <div className="lead-top">
        <div className="lead-avatar" style={isNew ? undefined : converted ? { background: 'linear-gradient(135deg, #10b981, #059669)' } : { background: '#212633', color: '#99a1b3' }}>
          {initial(lead.name)}
        </div>
        <div className="lead-ident">
          <div className="lead-name">
            {lead.name || 'Sem nome'}
            {isNew && <span className="lead-new-pill">NOVO</span>}
          </div>
          <div className="lead-sub">
            {lead.company ? `${lead.company} · ` : ''}
            {timeAgo(lead.created_at, now)}
          </div>
        </div>
        <span className="lead-status-pill" style={{ background: meta.bg, color: meta.color }}>
          {converted ? '✓ Cliente' : meta.label}
        </span>
      </div>

      {(lead.segment || lead.monthly_revenue) && (
        <div className="lead-chips">
          {lead.segment && (
            <span className="lead-chip">
              {lead.segment === 'Entregador' ? '🛵' : '🍽️'} {lead.segment}
            </span>
          )}
          {lead.monthly_revenue && (
            <span className="lead-chip">
              {lead.segment === 'Entregador' ? (
                ['moto', 'motocicleta'].some(x => lead.monthly_revenue!.toLowerCase().includes(x)) ? '🛵' :
                ['bike', 'bicicleta'].some(x => lead.monthly_revenue!.toLowerCase().includes(x)) ? '🚲' :
                ['carro', 'automóvel', 'auto'].some(x => lead.monthly_revenue!.toLowerCase().includes(x)) ? '🚗' : '📦'
              ) : '💰'} {lead.monthly_revenue}
            </span>
          )}
        </div>
      )}

      <div className="lead-actions">
        {wa ? (
          <a className="lead-btn wa" href={wa} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" /></svg>
            WhatsApp
          </a>
        ) : (
          <span className="lead-btn disabled">Sem WhatsApp</span>
        )}
        {tel && (
          <a className="lead-btn ghost" href={tel}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            Ligar
          </a>
        )}
        {lead.email && (
          <a className="lead-btn ghost" href={`mailto:${lead.email}`}>✉️ E-mail</a>
        )}
      </div>

      {lead.segment === 'Entregador' ? (
        <div className="lead-client-box" style={{ background: 'rgba(38, 198, 218, 0.08)', borderColor: 'var(--teal)', borderStyle: 'solid', borderWidth: '1px' }}>
          <div className="lead-client-info">
            <span className="lead-client-check" style={{ color: 'var(--teal)', borderColor: 'var(--teal)' }}>🛵</span>
            <div>
              <div className="lead-client-title" style={{ color: 'var(--teal)' }}>Cadastro de Entregador</div>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Candidato aguardando contato</span>
            </div>
          </div>
        </div>
      ) : converted ? (
        <div className="lead-client-box">
          <div className="lead-client-info">
            <span className="lead-client-check">✓</span>
            <div>
              <div className="lead-client-title">Conta ativa</div>
              {lead.store_slug && (
                <a className="lead-client-link" href={`/loja/${lead.store_slug}`} target="_blank" rel="noopener noreferrer">
                  /loja/{lead.store_slug} ↗
                </a>
              )}
            </div>
          </div>
          <button className="lead-btn ghost sm" onClick={newPassword} disabled={resetting}>
            {resetting ? 'Gerando…' : '🔑 Nova senha'}
          </button>
        </div>
      ) : (
        <button className="lead-approve-btn" onClick={onApprove}>
          ✓ Aprovar e criar conta
        </button>
      )}

      <div className="lead-statusbar">
        {STATUS_ORDER.map((s) => {
          const sm = STATUS_META[s]
          const active = lead.status === s
          return (
            <button
              key={s}
              className={`lead-status-opt ${active ? 'active' : ''}`}
              onClick={() => changeStatus(s)}
              disabled={busyStatus || (converted && s !== 'fechado')}
              style={active ? { background: sm.bg, color: sm.color, borderColor: sm.color } : undefined}
            >
              {sm.label}
            </button>
          )
        })}
      </div>

      <button className="lead-notes-toggle" onClick={() => setOpenNotes((o) => !o)}>
        {lead.notes ? '📝 ' : '➕ '}
        {lead.notes ? 'Ver anotação' : 'Adicionar anotação'}
        <span className={`lead-caret ${openNotes ? 'open' : ''}`}>▾</span>
      </button>

      {openNotes && (
        <div className="lead-notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="O que o cliente precisa, quando ligar de novo, combinados da conversa…"
            rows={3}
          />
          <div className="lead-notes-foot">
            <button className="lead-save-note" onClick={saveNotes} disabled={savingNote}>
              {savingNote ? 'Salvando…' : savedNote ? 'Salvo ✓' : 'Salvar anotação'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

// ── Modal: aprovar lead e criar a conta ─────────────────────────────────
function ApproveModal({
  lead,
  onClose,
  onDone,
}: {
  lead: LeadRow
  onClose: () => void
  onDone: (creds: Credentials, storeId: string | null) => void
}) {
  const [storeName, setStoreName] = useState(lead.company || lead.name || '')
  const [email, setEmail] = useState(lead.email || '')
  const [whatsapp, setWhatsapp] = useState(lead.whatsapp || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const res = await approveLead(lead.id, { storeName, email, whatsapp })
    setBusy(false)
    if (res.ok) {
      onDone({ ...res, leadName: lead.name, leadWhatsapp: whatsapp || lead.whatsapp }, res.storeId || null)
    } else {
      setError(res.error)
    }
  }

  return (
    <div className="leads-modal-overlay" onClick={onClose}>
      <form className="leads-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="leads-modal-head">
          <div className="leads-modal-title">Aprovar {lead.name || 'lead'}</div>
          <button type="button" className="leads-modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <p className="leads-modal-sub">
          Cria a conta e a loja na hora. Você recebe a senha temporária pra mandar no WhatsApp — o cliente já entra direto.
        </p>

        <label className="leads-field">
          <span>Nome da loja</span>
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} required autoFocus />
        </label>
        <label className="leads-field">
          <span>E-mail de acesso</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="leads-field">
          <span>WhatsApp da loja (opcional)</span>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
        </label>

        {error && <p className="leads-modal-error">{error}</p>}

        <button className="leads-modal-submit" type="submit" disabled={busy}>
          {busy ? 'Criando conta…' : '✓ Criar conta e liberar acesso'}
        </button>
      </form>
    </div>
  )
}

// ── Modal: credenciais geradas (mostradas uma única vez) ────────────────
function CredentialsModal({ credentials, onClose }: { credentials: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  async function copyField(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(null), 1600)
    } catch {}
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const message = [
    `Olá${credentials.leadName ? ' ' + credentials.leadName.split(' ')[0] : ''}! 🎉 Sua conta no CardápioÁgil está pronta!`,
    '',
    `🔗 Acesse: ${origin}/login`,
    `📧 E-mail: ${credentials.email}`,
    `🔑 Senha temporária: ${credentials.password}`,
    '',
    credentials.slug ? `Seu cardápio já está no ar: ${origin}/loja/${credentials.slug}` : '',
    '',
    'Qualquer dúvida é só chamar! 😉',
  ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n')

  const waSend = waLink(credentials.leadWhatsapp, message)

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="leads-modal-overlay" onClick={onClose}>
      <div className="leads-modal" onClick={(e) => e.stopPropagation()}>
        <div className="leads-modal-head">
          <div className="leads-modal-title">🎉 Conta criada!</div>
          <button type="button" className="leads-modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="leads-cred-box">
          <div className="leads-cred-row">
            <span className="leads-cred-label">E-mail</span>
            <code>{credentials.email}</code>
            <button className="leads-cred-copy" onClick={() => copyField('email', credentials.email)}>
              {copiedField === 'email' ? '✓' : 'copiar'}
            </button>
          </div>
          <div className="leads-cred-row">
            <span className="leads-cred-label">Senha</span>
            <code className="leads-cred-pass">{credentials.password}</code>
            <button className="leads-cred-copy" onClick={() => copyField('pass', credentials.password)}>
              {copiedField === 'pass' ? '✓' : 'copiar'}
            </button>
          </div>
          {credentials.slug && (
            <div className="leads-cred-row">
              <span className="leads-cred-label">Cardápio</span>
              <code>/loja/{credentials.slug}</code>
            </div>
          )}
        </div>

        <p className="leads-cred-warn">
          ⚠️ A senha só aparece agora — envie ou copie antes de fechar. Se perder, é só gerar outra no card do cliente.
        </p>

        <div className="leads-cred-actions">
          {waSend && (
            <a className="lead-btn wa" href={waSend} target="_blank" rel="noopener noreferrer">
              Enviar acesso no WhatsApp
            </a>
          )}
          <button className="lead-btn ghost" onClick={copy}>
            {copied ? 'Copiado ✓' : 'Copiar mensagem'}
          </button>
        </div>
      </div>
    </div>
  )
}

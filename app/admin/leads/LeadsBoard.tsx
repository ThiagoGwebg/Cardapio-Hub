'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { fetchLeads, setLeadStatus, setLeadNotes, type LeadRow } from './actions'

type Filter = 'novo' | 'contatado' | 'todos'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  novo: { label: 'Novo', color: '#1d4ed8', bg: '#dbeafe' },
  contatado: { label: 'Em contato', color: '#b45309', bg: '#fef3c7' },
  fechado: { label: 'Fechado', color: '#15803d', bg: '#dcfce7' },
  perdido: { label: 'Perdido', color: '#b91c1c', bg: '#fee2e2' },
}
const STATUS_ORDER = ['novo', 'contatado', 'fechado', 'perdido'] as const

const POLL_MS = 10_000

function onlyDigits(raw: string | null): string {
  return (raw || '').replace(/\D/g, '')
}
function waLink(raw: string | null): string | null {
  const d = onlyDigits(raw)
  if (d.length < 10) return null
  return `https://wa.me/${d.startsWith('55') ? d : '55' + d}`
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

export default function LeadsBoard({ initialLeads }: { initialLeads: LeadRow[] }) {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads)
  const [filter, setFilter] = useState<Filter>('novo')
  const [now, setNow] = useState<number>(() => new Date(initialLeads[0]?.created_at ?? 0).getTime() || 0)
  const [alertsOn, setAlertsOn] = useState(false)
  const [toast, setToast] = useState<LeadRow | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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

  async function logout() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Atualiza um lead localmente (otimista) e persiste no servidor
  function patchLead(id: string, patch: Partial<LeadRow>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const counts = {
    novo: leads.filter((l) => l.status === 'novo').length,
    contatado: leads.filter((l) => l.status === 'contatado').length,
    todos: leads.length,
  }

  const visible = leads.filter((l) => (filter === 'todos' ? true : l.status === filter))

  return (
    <div className="leads-app">
      <header className="leads-header">
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
            <button className="leads-logout" onClick={logout}>Sair</button>
          </div>
        </div>

        {!alertsOn && (
          <button className="leads-alert-cta" onClick={enableAlerts}>
            🔔 Tocar um som e me avisar a cada lead novo
          </button>
        )}

        <div className="leads-tabs">
          <button className={`leads-tab ${filter === 'novo' ? 'active' : ''}`} onClick={() => setFilter('novo')}>
            Pendentes {counts.novo > 0 && <span className="leads-tab-count">{counts.novo}</span>}
          </button>
          <button className={`leads-tab ${filter === 'contatado' ? 'active' : ''}`} onClick={() => setFilter('contatado')}>
            Em contato {counts.contatado > 0 && <span className="leads-tab-count">{counts.contatado}</span>}
          </button>
          <button className={`leads-tab ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>
            Todos <span className="leads-tab-count muted">{counts.todos}</span>
          </button>
        </div>
      </header>

      <main className="leads-list">
        {visible.length === 0 ? (
          <div className="leads-empty">
            {filter === 'novo' ? (
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
          visible.map((lead) => (
            <LeadCard key={lead.id} lead={lead} now={now} onPatch={patchLead} />
          ))
        )}
        <div className="leads-foot">
          {refreshing ? 'Atualizando…' : `Atualiza sozinho a cada ${POLL_MS / 1000}s`}
        </div>
      </main>

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
}: {
  lead: LeadRow
  now: number
  onPatch: (id: string, patch: Partial<LeadRow>) => void
}) {
  const [openNotes, setOpenNotes] = useState(false)
  const [notes, setNotes] = useState(lead.notes || '')
  const [savingNote, setSavingNote] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const [busyStatus, setBusyStatus] = useState(false)

  const meta = STATUS_META[lead.status] || STATUS_META.novo
  const wa = waLink(lead.whatsapp)
  const tel = telLink(lead.whatsapp)
  const isNew = lead.status === 'novo'

  async function changeStatus(s: string) {
    if (s === lead.status || busyStatus) return
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

  return (
    <article className={`lead-card ${isNew ? 'is-new' : ''}`}>
      <div className="lead-top">
        <div className="lead-avatar" style={isNew ? undefined : { background: '#eceff3', color: '#5f6b7a' }}>
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
          {meta.label}
        </span>
      </div>

      {(lead.segment || lead.monthly_revenue) && (
        <div className="lead-chips">
          {lead.segment && <span className="lead-chip">🍽️ {lead.segment}</span>}
          {lead.monthly_revenue && <span className="lead-chip">💰 {lead.monthly_revenue}</span>}
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

      <div className="lead-statusbar">
        {STATUS_ORDER.map((s) => {
          const sm = STATUS_META[s]
          const active = lead.status === s
          return (
            <button
              key={s}
              className={`lead-status-opt ${active ? 'active' : ''}`}
              onClick={() => changeStatus(s)}
              disabled={busyStatus}
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

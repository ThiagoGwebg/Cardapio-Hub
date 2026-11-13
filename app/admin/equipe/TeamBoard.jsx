'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, UserPlus, KeyRound, Trash2, Check, AlertTriangle, X, Lock } from 'lucide-react'
import { addAdmin, removeAdmin, resetAdminPassword } from './actions'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function initialOf(text) {
  return (text || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function TeamBoard({ owners, initial, isOwner, currentEmail }) {
  const [team, setTeam] = useState(initial)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [pending, startTransition] = useTransition()

  function submit(e) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await addAdmin({ name, email })
      if (!res.ok) {
        setError(res.error || 'Erro ao adicionar.')
        return
      }
      setTeam((list) => [
        ...list,
        {
          id: res.admin.id,
          email: res.admin.email,
          name: res.admin.name,
          invitedBy: res.admin.invited_by,
          createdAt: res.admin.created_at,
        },
      ])
      setName('')
      setEmail('')
      setCredentials({
        email: res.admin.email,
        password: res.password,
        alreadyHadAccount: res.alreadyHadAccount,
      })
    })
  }

  function remove(id) {
    setError(null)
    startTransition(async () => {
      const res = await removeAdmin(id)
      if (!res.ok) {
        setError(res.error || 'Erro ao remover.')
        return
      }
      setTeam((list) => list.filter((a) => a.id !== id))
      setConfirmId(null)
    })
  }

  function resetPassword(id) {
    setError(null)
    startTransition(async () => {
      const res = await resetAdminPassword(id)
      if (!res.ok) {
        setError(res.error || 'Erro ao gerar a senha.')
        return
      }
      setCredentials({ email: res.email, password: res.password, reset: true })
    })
  }

  return (
    <>
      <div className="adm-panel" style={{ marginBottom: 16 }}>
        <div className="adm-panel-head">
          <h2>
            <ShieldCheck size={16} strokeWidth={2.3} /> Donos
          </h2>
          <span className="adm-field-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Lock size={11} strokeWidth={2.4} /> definidos no deploy
          </span>
        </div>

        <ul className="team-list">
          {owners.map((owner) => (
            <li key={owner} className="team-row">
              <span className="team-avatar owner">{initialOf(owner)}</span>
              <div className="team-main">
                <strong className="team-name">
                  {owner}
                  {owner === currentEmail && <span className="team-badge">você</span>}
                </strong>
                <span className="team-sub">Acesso total, inclusive a esta tela</span>
              </div>
            </li>
          ))}
        </ul>

        <p className="adm-field-hint" style={{ marginTop: 10 }}>
          Para mudar essa lista, altere a variável <b>ADMIN_EMAILS</b> no deploy. Ela fica fora do
          painel de propósito: ninguém consegue remover o dono por engano.
        </p>
      </div>

      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2>
            <UserPlus size={16} strokeWidth={2.3} /> Admins convidados
          </h2>
          <span className="adm-field-hint">{team.length} no time</span>
        </div>

        {team.length === 0 ? (
          <p className="adm-panel-empty">Ninguém convidado ainda.</p>
        ) : (
          <ul className="team-list">
            {team.map((a) => (
              <li key={a.id} className="team-row">
                <span className="team-avatar">{initialOf(a.name || a.email)}</span>
                <div className="team-main">
                  <strong className="team-name">
                    {a.name || a.email}
                    {a.email === currentEmail && <span className="team-badge">você</span>}
                  </strong>
                  <span className="team-sub">
                    {a.name ? `${a.email} · ` : ''}
                    desde {fmtDate(a.createdAt)}
                    {a.invitedBy ? ` · por ${a.invitedBy}` : ''}
                  </span>
                </div>

                {isOwner && (
                  <div className="team-actions">
                    {confirmId === a.id ? (
                      <>
                        <button className="adm-btn danger" onClick={() => remove(a.id)} disabled={pending}>
                          Confirmar
                        </button>
                        <button className="adm-btn ghost" onClick={() => setConfirmId(null)} disabled={pending}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="adm-btn ghost"
                          onClick={() => resetPassword(a.id)}
                          disabled={pending}
                          title="Gerar uma nova senha temporária"
                        >
                          <KeyRound size={13} strokeWidth={2.3} /> Nova senha
                        </button>
                        <button
                          className="adm-btn ghost"
                          onClick={() => setConfirmId(a.id)}
                          disabled={pending}
                          title="Tirar o acesso ao painel"
                        >
                          <Trash2 size={13} strokeWidth={2.3} /> Remover
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {isOwner ? (
          <form className="team-add" onSubmit={submit}>
            <label className="adm-field">
              Nome
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Ana Vendas"
                autoComplete="off"
              />
            </label>
            <label className="adm-field">
              E-mail de acesso
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@exemplo.com"
                type="email"
                autoComplete="off"
                required
              />
            </label>
            <button className="adm-btn pro team-add-btn" disabled={pending || !email.trim()}>
              <UserPlus size={14} strokeWidth={2.4} /> {pending ? 'Adicionando…' : 'Adicionar admin'}
            </button>
          </form>
        ) : (
          <p className="adm-field-hint" style={{ marginTop: 12 }}>
            Só o dono do painel adiciona ou remove admins.
          </p>
        )}

        <p className="adm-field-hint" style={{ marginTop: 10 }}>
          Quem você adiciona entra em <b>/login</b> com o mesmo e-mail e cai direto no painel. Se a
          pessoa ainda não tiver conta, uma é criada na hora e a senha temporária aparece uma vez só.
        </p>

        {error && (
          <p className="adm-toggle-error" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>

      {credentials && (
        <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />
      )}
    </>
  )
}

// ── Modal: acesso gerado (a senha aparece uma única vez) ────────────────
function CredentialsModal({ credentials, onClose }) {
  const [copiedField, setCopiedField] = useState(null)
  const [copied, setCopied] = useState(false)

  async function copyField(field, value) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(null), 1600)
    } catch {}
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const message = [
    'Seu acesso ao painel do Cardápio Hub está pronto!',
    '',
    `🔗 Acesse: ${origin}/login`,
    `📧 E-mail: ${credentials.email}`,
    credentials.password
      ? `🔑 Senha temporária: ${credentials.password}`
      : '🔑 Senha: a mesma que você já usa nesse e-mail.',
  ].join('\n')

  async function copyMessage() {
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
          <div className="leads-modal-title">
            <ShieldCheck size={17} strokeWidth={2.2} />
            {credentials.reset ? 'Senha nova gerada' : 'Admin adicionado!'}
          </div>
          <button type="button" className="leads-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="leads-cred-box">
          <div className="leads-cred-row">
            <span className="leads-cred-label">E-mail</span>
            <code>{credentials.email}</code>
            <button className="leads-cred-copy" onClick={() => copyField('email', credentials.email)}>
              {copiedField === 'email' ? <Check size={13} strokeWidth={3} /> : 'copiar'}
            </button>
          </div>
          {credentials.password ? (
            <div className="leads-cred-row">
              <span className="leads-cred-label">Senha</span>
              <code className="leads-cred-pass">{credentials.password}</code>
              <button className="leads-cred-copy" onClick={() => copyField('pass', credentials.password)}>
                {copiedField === 'pass' ? <Check size={13} strokeWidth={3} /> : 'copiar'}
              </button>
            </div>
          ) : (
            <div className="leads-cred-row">
              <span className="leads-cred-label">Senha</span>
              <code>a que essa pessoa já usava</code>
            </div>
          )}
        </div>

        <p className="leads-cred-warn">
          <AlertTriangle size={14} strokeWidth={2.3} />
          <span>
            {credentials.password
              ? 'A senha só aparece agora — copie antes de fechar. Se perder, é só gerar outra no botão "Nova senha".'
              : 'Esse e-mail já tinha conta no sistema: ela segue com a mesma senha, agora com acesso ao painel.'}
          </span>
        </p>

        <div className="leads-cred-actions">
          <button className="lead-btn ghost" onClick={copyMessage}>
            {copied ? (
              <>
                <Check size={14} strokeWidth={3} /> Copiado
              </>
            ) : (
              'Copiar mensagem'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

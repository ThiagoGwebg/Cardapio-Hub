'use client'

import { useState, useTransition } from 'react'
import { Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { cancelFocusNfe, requestFocusNfe } from './actions'
import HelpTip from '@/components/dashboard/HelpTip'
import { fmtCnpj } from '@/lib/stock/format'

const STATUS = {
  disconnected: { label: 'Não configurado', cls: '' },
  pending: { label: 'Ativação solicitada', cls: 'is-warn' },
  connected: { label: 'Conectado', cls: 'is-ok' },
}

export default function FocusNfeCard({ integration }) {
  const status = integration?.status ?? 'disconnected'
  const st = STATUS[status] ?? STATUS.disconnected
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [cnpj, setCnpj] = useState(integration?.settings?.cnpj ? fmtCnpj(integration.settings.cnpj) : '')
  const [environment, setEnvironment] = useState(integration?.settings?.environment ?? 'homologacao')

  function submit(e) {
    e.preventDefault()
    start(async () => {
      const res = await requestFocusNfe({ cnpj, environment })
      if (!res.ok) return toast.error(res.error)
      toast.success('Ativação solicitada')
      setOpen(false)
    })
  }

  function cancel() {
    start(async () => {
      const res = await cancelFocusNfe()
      if (!res.ok) return toast.error(res.error)
      toast.success('Solicitação cancelada')
    })
  }

  return (
    <article className="int-card is-featured">
      <header className="int-card-head">
        <span className="int-logo" aria-hidden><Landmark size={20} strokeWidth={2} /></span>
        <div>
          <h3 className="int-name">Focus NFe · Sefaz</h3>
          <p className="int-by">Entrada automática de notas</p>
        </div>
        <span className={`stk-chip ${st.cls}`}>{st.label}</span>
      </header>
      <p className="int-desc">
        As notas emitidas para o CNPJ da sua loja chegam sozinhas em <strong>Estoque › Notas de compra</strong>, marcadas como
        <em> Automático</em>. Você só revisa e lança.
      </p>

      {status === 'pending' && (
        <p className="int-note">
          Pedido de ativação para o CNPJ <strong>{fmtCnpj(integration.settings?.cnpj)}</strong>. Nossa equipe entra em contato
          para cadastrar o certificado digital A1 da loja.
        </p>
      )}

      {open ? (
        <form className="stk-form int-form" onSubmit={submit}>
          <ul className="int-reqs">
            <li>CNPJ da loja (as notas precisam ser emitidas para ele)</li>
            <li>
              Certificado digital A1 da empresa (arquivo .pfx e senha), enviado depois com segurança
              <HelpTip>
                É a &quot;identidade digital&quot; do CNPJ, a mesma que o contador usa. A Sefaz só entrega as notas emitidas
                contra a sua empresa para quem apresenta esse certificado. Vale 1 ano e é comprado em certificadoras.
              </HelpTip>
            </li>
          </ul>
          <div className="stk-grid-2">
            <label className="stk-field">
              <span>CNPJ da loja</span>
              <input className="form-input" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" required autoFocus />
            </label>
            <label className="stk-field">
              <span>
                Ambiente
                <HelpTip>
                  <strong>Teste</strong>: para experimentar sem notas reais. <strong>Produção</strong>: as notas de verdade da
                  sua empresa.
                </HelpTip>
              </span>
              <select className="form-input" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
                <option value="homologacao">Teste (homologação)</option>
                <option value="producao">Produção</option>
              </select>
            </label>
          </div>
          <div className="int-card-foot">
            <button type="button" className="stk-btn" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="stk-btn stk-btn--primary" disabled={pending}>
              {pending ? 'Enviando…' : 'Solicitar ativação'}
            </button>
          </div>
        </form>
      ) : (
        <footer className="int-card-foot">
          {status === 'pending' && (
            <button type="button" className="stk-btn stk-btn--ghost" onClick={cancel} disabled={pending}>Cancelar solicitação</button>
          )}
          <button type="button" className="stk-btn stk-btn--primary" onClick={() => setOpen(true)}>
            {status === 'disconnected' ? 'Configurar' : 'Editar dados'}
          </button>
        </footer>
      )}
    </article>
  )
}

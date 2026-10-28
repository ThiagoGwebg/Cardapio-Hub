'use client'

import { useState } from 'react'
import { Eye, Printer, Smartphone, X } from 'lucide-react'
import {
  printReceiptNow,
  receiptUrl,
  savePrintSettings,
  usePrintSettings,
} from '@/lib/print/autoPrint'

const MODES = [
  { id: 'off', label: 'Desativada', desc: 'Você imprime na mão pela ficha do pedido.', icon: X },
  {
    id: 'browser',
    label: 'Impressora do computador',
    desc: 'Cai na impressora padrão deste PC (térmica USB, de rede ou comum).',
    icon: Printer,
  },
  {
    id: 'rawbt',
    label: 'Android + Bluetooth (RawBT)',
    desc: 'Manda direto pra térmica pareada no celular, sem janela de impressão.',
    icon: Smartphone,
  },
]

export default function AutoPrintSettings({ lastOrderId }) {
  const settings = usePrintSettings()
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)

  function update(patch) {
    savePrintSettings({ ...settings, ...patch })
    setError(null)
  }

  async function test() {
    if (!lastOrderId || testing) return
    setTesting(true)
    setError(null)
    try {
      await printReceiptNow(lastOrderId, { ...settings, mode: settings.mode === 'off' ? 'browser' : settings.mode })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu pra imprimir agora.')
    }
    setTesting(false)
  }

  const on = settings.mode !== 'off'

  return (
    <div className="settings-card">
      <div className="settings-section-title">Impressão automática da comanda</div>
      <p className="settings-hint">
        Cada pedido novo sai impresso sozinho neste aparelho, assim que entra. A configuração vale{' '}
        <b>só para este dispositivo</b> — ative no computador (ou celular) que fica ligado na impressora.
      </p>

      <div className="print-modes">
        {MODES.map((m) => {
          const Icon = m.icon
          const active = settings.mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              className={`print-mode ${active ? 'active' : ''}`}
              onClick={() => update({ mode: m.id })}
              aria-pressed={active}
            >
              <span className="print-mode-head">
                <Icon size={15} strokeWidth={2.2} />
                {m.label}
              </span>
              <span className="print-mode-desc">{m.desc}</span>
            </button>
          )
        })}
      </div>

      {on && (
        <>
          <div className="form-row" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="print-width">
                Largura do papel
              </label>
              <select
                id="print-width"
                className="form-input"
                value={settings.width}
                onChange={(e) => update({ width: e.target.value === '58' ? 58 : 80 })}
              >
                <option value={80}>80 mm (bobina grande — o mais comum)</option>
                <option value={58}>58 mm (bobina pequena)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="print-copies">
                Vias por pedido
              </label>
              <select
                id="print-copies"
                className="form-input"
                value={settings.copies}
                onChange={(e) => update({ copies: Number(e.target.value) })}
              >
                <option value={1}>1 via</option>
                <option value={2}>2 vias (cozinha + entrega)</option>
                <option value={3}>3 vias</option>
              </select>
            </div>
          </div>

          <div className="alert-status alert-status--on">
            <span className="alert-status-dot" /> Impressão automática <b>ligada</b> neste dispositivo
          </div>
        </>
      )}

      {!on && (
        <div className="alert-status alert-status--off" style={{ marginTop: 14 }}>
          <span className="alert-status-dot" /> Impressão automática desligada
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="save-btn" onClick={test} disabled={!lastOrderId || testing} style={{ marginBottom: 0 }}>
          {testing ? (
            <>
              <span className="btn-spinner" aria-hidden />
              Imprimindo…
            </>
          ) : (
            <>
              <Printer size={15} strokeWidth={2.2} />
              Imprimir teste
            </>
          )}
        </button>
        {lastOrderId && (
          <a
            className="prod-form-cancel"
            href={receiptUrl(lastOrderId, settings, 'html')}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <Eye size={14} strokeWidth={2.2} />
            Ver comanda
          </a>
        )}
      </div>

      {!lastOrderId && (
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
          O teste usa o seu último pedido como modelo — assim que entrar o primeiro, o botão libera.
        </p>
      )}
      {error && (
        <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{error}</p>
      )}

      {settings.mode === 'browser' && (
        <p className="print-tip">
          <b>Sem a janela de impressão:</b> feche o Chrome e abra ele com a opção{' '}
          <code>--kiosk-printing</code> (clique com o botão direito no atalho → Propriedades → em
          &ldquo;Destino&rdquo;, adicione um espaço e <code>--kiosk-printing</code> no fim). Com isso a comanda vai
          direto pra impressora padrão do Windows. Sem a opção, a janela abre sozinha e você só confirma.
        </p>
      )}
      {settings.mode === 'rawbt' && (
        <p className="print-tip">
          Instale o app <b>RawBT</b> na Play Store, pareie a impressora térmica por Bluetooth e deixe-a
          selecionada dentro do app. Depois disso a comanda sai sozinha, sem diálogo. Use o botão
          &ldquo;Imprimir teste&rdquo; pra confirmar que o RawBT abre e imprime.
        </p>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5 }}>
        A comanda só sai com o painel aberto neste aparelho — deixe a aba dos Pedidos ligada durante o
        expediente. Cada pedido é impresso uma vez só, mesmo se a internet cair e voltar.
      </p>
    </div>
  )
}

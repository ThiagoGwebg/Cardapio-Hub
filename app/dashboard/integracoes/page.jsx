import Link from 'next/link'
import { FileCode2, Plug, ReceiptText, ShoppingBag, Wallet, Calculator } from 'lucide-react'
import { getCurrentStore } from '@/lib/store'
import FocusNfeCard from './FocusNfeCard'
import '../estoque/estoque.css'
import './integracoes.css'

export const metadata = { title: 'Integrações' }

export default async function IntegracoesPage() {
  const { supabase, store } = await getCurrentStore()
  const { data: rows } = await supabase
    .from('store_integrations')
    .select('provider, status, settings, updated_at')
    .eq('store_id', store.id)
  const focus = (rows ?? []).find((r) => r.provider === 'focus_nfe') ?? null

  return (
    <>
      <div className="dash-header page-head">
        <span className="page-head-ico" aria-hidden><Plug size={22} strokeWidth={2} /></span>
        <div>
          <h1 className="dash-title">Integrações</h1>
          <div className="dash-subtitle">Conecte o painel a outros serviços. Novas integrações aparecem aqui.</div>
        </div>
      </div>

      <h2 className="int-section">Notas fiscais e estoque</h2>
      <div className="int-grid">
        <FocusNfeCard integration={focus} />

        <article className="int-card">
          <header className="int-card-head">
            <span className="int-logo" aria-hidden><FileCode2 size={20} strokeWidth={2} /></span>
            <div>
              <h3 className="int-name">Nota fiscal por XML</h3>
              <p className="int-by">Incluído no painel</p>
            </div>
            <span className="stk-chip is-ok">Ativo</span>
          </header>
          <p className="int-desc">
            Envie o arquivo .xml que o fornecedor manda por e-mail. O painel lê fornecedor, itens e valores e dá entrada nos insumos.
          </p>
          <footer className="int-card-foot">
            <Link href="/dashboard/estoque?tab=notas" className="stk-btn">Importar uma nota</Link>
          </footer>
        </article>

        <article className="int-card is-soon">
          <header className="int-card-head">
            <span className="int-logo" aria-hidden><Calculator size={20} strokeWidth={2} /></span>
            <div>
              <h3 className="int-name">Contabilidade</h3>
              <p className="int-by">Envio dos XMLs do mês</p>
            </div>
            <span className="stk-chip">Em breve</span>
          </header>
          <p className="int-desc">Mande as notas de entrada do mês para o seu contador com um clique.</p>
        </article>
      </div>

      <h2 className="int-section">Vendas e pagamentos</h2>
      <div className="int-grid">
        <article className="int-card">
          <header className="int-card-head">
            <span className="int-logo" aria-hidden><Wallet size={20} strokeWidth={2} /></span>
            <div>
              <h3 className="int-name">Mercado Pago</h3>
              <p className="int-by">Pix e cartão no cardápio</p>
            </div>
            <span className={`stk-chip ${store.mp_connected ? 'is-ok' : ''}`}>{store.mp_connected ? 'Conectado' : 'Desconectado'}</span>
          </header>
          <p className="int-desc">Receba Pix e cartão online direto na sua conta, com confirmação automática do pedido.</p>
          <footer className="int-card-foot">
            <Link href="/dashboard/loja" className="stk-btn">{store.mp_connected ? 'Gerenciar' : 'Conectar'}</Link>
          </footer>
        </article>

        <article className="int-card is-soon">
          <header className="int-card-head">
            <span className="int-logo" aria-hidden><ShoppingBag size={20} strokeWidth={2} /></span>
            <div>
              <h3 className="int-name">iFood</h3>
              <p className="int-by">Pedidos do marketplace</p>
            </div>
            <span className="stk-chip">Em breve</span>
          </header>
          <p className="int-desc">Receba os pedidos do iFood no mesmo painel, com baixa de estoque pela ficha técnica.</p>
        </article>

        <article className="int-card is-soon">
          <header className="int-card-head">
            <span className="int-logo" aria-hidden><ReceiptText size={20} strokeWidth={2} /></span>
            <div>
              <h3 className="int-name">Emissão de NFC-e</h3>
              <p className="int-by">Cupom fiscal da venda</p>
            </div>
            <span className="stk-chip">Em breve</span>
          </header>
          <p className="int-desc">Emita o cupom fiscal do pedido sem sair do painel.</p>
        </article>
      </div>
    </>
  )
}

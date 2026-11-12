import { ArrowDown, ArrowRight, ArrowUp, Box, ClipboardList, Equal, Minus, Plus } from 'lucide-react'

// Desenhos dos conceitos do estoque, usados dentro dos balões de ajuda
// (HelpTip `example`) e no guia do topo. Só HTML + ícones: leve, nítido em
// qualquer tela e lido normalmente por leitor de tela.

/** 1 CX da nota = 20 un no estoque. */
export function ConversionVisual({ from = 'CX', to = 'un', factor = 20 }) {
  return (
    <span className="vx vx-row" aria-label={`1 ${from} da nota equivale a ${factor} ${to} no estoque`}>
      <span className="vx-card">
        <Box size={22} strokeWidth={1.8} aria-hidden />
        <span className="vx-big">1 {from}</span>
        <span className="vx-cap">na nota</span>
      </span>
      <Equal size={16} strokeWidth={2.4} className="vx-op" aria-hidden />
      <span className="vx-card">
        <span className="vx-dots" aria-hidden>
          {Array.from({ length: Math.min(factor, 20) }, (_, i) => <span key={i} />)}
        </span>
        <span className="vx-big vx-accent">{factor} {to}</span>
        <span className="vx-cap">no estoque</span>
      </span>
    </span>
  )
}

/** Média ponderada: duas compras viram um custo médio. */
export function AvgCostVisual() {
  return (
    <span className="vx vx-col">
      <span className="vx-line"><span className="vx-chip">10 kg × R$ 40</span><span className="vx-muted">= R$ 400 (o que já tinha)</span></span>
      <span className="vx-line"><Plus size={13} strokeWidth={2.6} className="vx-op" aria-hidden /><span className="vx-chip">5 kg × R$ 46</span><span className="vx-muted">= R$ 230 (nota nova)</span></span>
      <span className="vx-rule" aria-hidden />
      <span className="vx-line"><span className="vx-chip">15 kg</span><span className="vx-muted">custaram R$ 630</span></span>
      <span className="vx-line"><ArrowRight size={13} strokeWidth={2.4} className="vx-op" aria-hidden /><span className="vx-big vx-accent">R$ 630 ÷ 15 = R$ 42/kg</span></span>
    </span>
  )
}

/** O que faz o saldo subir e descer. */
export function BalanceVisual() {
  return (
    <span className="vx vx-col">
      <span className="vx-line"><ArrowUp size={14} strokeWidth={2.6} className="vx-up" aria-hidden /><span><strong>Sobe:</strong> nota de compra, mercadoria que chegou, pedido cancelado</span></span>
      <span className="vx-line"><ArrowDown size={14} strokeWidth={2.6} className="vx-down" aria-hidden /><span><strong>Desce:</strong> vendas (pela ficha técnica), uso e perda</span></span>
      <span className="vx-line"><Equal size={14} strokeWidth={2.6} className="vx-op" aria-hidden /><span><strong>Corrige:</strong> Atualizar › Contei (o sistema acerta a diferença)</span></span>
    </span>
  )
}

/** Um pedido tirando insumos do estoque pela ficha técnica. */
export function SaleVisual() {
  return (
    <span className="vx vx-row vx-wrap">
      <span className="vx-card">
        <ClipboardList size={20} strokeWidth={1.8} aria-hidden />
        <span className="vx-big">2× X-Burger</span>
        <span className="vx-cap">pedido em preparo</span>
      </span>
      <ArrowRight size={16} strokeWidth={2.4} className="vx-op" aria-hidden />
      <span className="vx-col vx-tight">
        <span className="vx-chip vx-chip-out"><Minus size={11} strokeWidth={3} aria-hidden /> 2 un pão</span>
        <span className="vx-chip vx-chip-out"><Minus size={11} strokeWidth={3} aria-hidden /> 0,36 kg blend</span>
        <span className="vx-chip vx-chip-out"><Minus size={11} strokeWidth={3} aria-hidden /> 0,06 kg cheddar</span>
      </span>
    </span>
  )
}

/** Preço dividido entre custo dos insumos e o que sobra. */
export function MarginVisual({ price = 30, cost = 9 }) {
  const pct = Math.round((cost / price) * 100)
  return (
    <span className="vx vx-col">
      <span className="vx-bar" aria-hidden>
        <span className="vx-bar-cost" style={{ width: `${pct}%` }}>CMV</span>
        <span className="vx-bar-margin">sobra {100 - pct}%</span>
      </span>
      <span className="vx-line vx-muted">Preço R$ {price} · insumos R$ {cost} → margem de {100 - pct}%</span>
    </span>
  )
}

/** Contagem: o sistema achava uma coisa, você contou outra. */
export function CountVisual() {
  return (
    <span className="vx vx-row vx-wrap">
      <span className="vx-card"><span className="vx-big">10 un</span><span className="vx-cap">o sistema dizia</span></span>
      <ArrowRight size={16} strokeWidth={2.4} className="vx-op" aria-hidden />
      <span className="vx-card"><span className="vx-big">8 un</span><span className="vx-cap">você contou</span></span>
      <ArrowRight size={16} strokeWidth={2.4} className="vx-op" aria-hidden />
      <span className="vx-card"><span className="vx-big vx-accent">−2</span><span className="vx-cap">ajuste lançado</span></span>
    </span>
  )
}

/** Situações do insumo. */
export function StatusVisual() {
  return (
    <span className="vx vx-col">
      <span className="vx-line"><span className="vx-pill vx-pill-ok">Normal</span><span className="vx-muted">saldo acima do mínimo</span></span>
      <span className="vx-line"><span className="vx-pill vx-pill-warn">Acabando</span><span className="vx-muted">abaixo do mínimo: hora de comprar</span></span>
      <span className="vx-line"><span className="vx-pill vx-pill-bad">Sem estoque</span><span className="vx-muted">zerado ou negativo</span></span>
    </span>
  )
}

import Link from 'next/link'
import { MOVEMENT_LABEL, fmtMoney, fmtQty, toNum } from '@/lib/stock/format'
import HelpTip from '@/components/dashboard/HelpTip'
import { BalanceVisual, SaleVisual } from './visuals'

const KIND_CLS = { entrada: 'is-ok', estorno: 'is-ok', venda: '', saida: '', perda: 'is-bad', ajuste: 'is-warn' }

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
})

export default function MovementsTable({ movements, items, kind }) {
  const byId = new Map(items.map((i) => [i.id, i]))
  const filters = ['', 'entrada', 'venda', 'saida', 'perda', 'ajuste', 'estorno']

  return (
    <section className="stk-panel">
      <div className="stk-toolbar">
        <div className="stk-pills" role="tablist" aria-label="Filtrar movimentações">
          {filters.map((k) => (
            <Link
              key={k || 'todas'}
              href={k ? `/dashboard/estoque?tab=movimentacoes&tipo=${k}` : '/dashboard/estoque?tab=movimentacoes'}
              role="tab"
              aria-selected={kind === k}
              className={`stk-pill ${kind === k ? 'active' : ''}`}
            >
              {k ? MOVEMENT_LABEL[k] : 'Todas'}
            </Link>
          ))}
        </div>
      </div>

      {movements.length === 0 ? (
        <div className="stk-empty">
          <p className="stk-empty-title">Nenhuma movimentação {kind ? 'deste tipo ' : ''}ainda</p>
          <p className="stk-empty-sub">Entradas de nota, vendas pela ficha técnica, perdas e ajustes aparecem aqui.</p>
        </div>
      ) : (
        <div className="stk-table-wrap">
          <table className="stk-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Insumo</th>
                <th>
                  Tipo
                  <HelpTip title="Tipos de movimentação" example={<SaleVisual />}>
                    <strong>Entrada</strong>: chegou mercadoria (nota ou à mão). <strong>Venda</strong>: saiu sozinho por um pedido,
                    pela ficha técnica. <strong>Cancelamento</strong>: voltou porque o pedido foi cancelado.{' '}
                    <strong>Uso</strong>: usou fora das vendas. <strong>Perda</strong>: venceu ou estragou.{' '}
                    <strong>Contagem</strong>: correção depois de contar o estoque.
                  </HelpTip>
                </th>
                <th className="num">
                  Quantidade
                  <HelpTip title="Quantidade" example={<BalanceVisual />}><strong>+</strong> entrou no estoque, <strong>−</strong> saiu. Sempre na unidade do insumo.</HelpTip>
                </th>
                <th className="num">
                  Custo
                  <HelpTip>Preço por unidade nas entradas com valor (nota ou compra manual). Vendas e perdas não têm custo próprio.</HelpTip>
                </th>
                <th>
                  Origem
                  <HelpTip>De onde veio a movimentação. Clique no pedido ou na nota para abrir.</HelpTip>
                </th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const item = byId.get(m.item_id)
                const q = toNum(m.quantity)
                return (
                  <tr key={m.id}>
                    <td className="tabnum muted">{dateFmt.format(new Date(m.created_at))}</td>
                    <td className="stk-name">{item?.name ?? 'Insumo removido'}</td>
                    <td><span className={`stk-chip ${KIND_CLS[m.kind] ?? ''}`}>{MOVEMENT_LABEL[m.kind] ?? m.kind}</span></td>
                    <td className={`num tabnum ${q < 0 ? 'stk-neg' : 'stk-pos'}`}>
                      {q > 0 ? '+' : ''}{fmtQty(q, item?.unit)}
                    </td>
                    <td className="num muted">{m.unit_cost_cents != null ? `${fmtMoney(m.unit_cost_cents, { fine: true })}/${item?.unit ?? ''}` : '—'}</td>
                    <td className="muted">
                      {m.order_id ? (
                        <Link href={`/dashboard/pedidos/${m.order_id}`} className="stk-link">{m.note || 'Pedido'}</Link>
                      ) : m.invoice_id ? (
                        <Link href={`/dashboard/estoque/notas/${m.invoice_id}`} className="stk-link">{m.note || 'Nota fiscal'}</Link>
                      ) : (
                        m.note || 'Manual'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {movements.length === 200 && <p className="stk-foot-note">Mostrando as 200 movimentações mais recentes.</p>}
    </section>
  )
}

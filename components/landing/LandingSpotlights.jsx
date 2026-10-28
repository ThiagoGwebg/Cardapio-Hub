import Image from 'next/image'

/* Três linhas alternadas (texto ↔ visual) com o selo do plano em cima do título.
   As duas últimas usam mock montado em HTML/CSS em vez de print: nada de PNG de
   400kB no meio da página, e o mock acompanha o tema claro/escuro sozinho. */

function MockOrders() {
  const COLUMNS = [
    { label: 'Recebido', tone: 'amber', items: ['#182 · X-Salada', '#183 · Açaí 500ml'] },
    { label: 'Na cozinha', tone: 'teal', items: ['#180 · 2 Pastéis'] },
    { label: 'Saiu pra entrega', tone: 'green', items: ['#178 · Combo família'] },
  ]

  return (
    <div className="l-mock l-mock-board" aria-hidden="true">
      <div className="l-mock-bar">
        <span className="l-mock-dot" />
        <span className="l-mock-dot" />
        <span className="l-mock-dot" />
        <span className="l-mock-bar-title">Pedidos de hoje</span>
        <span className="l-mock-live">ao vivo</span>
      </div>
      <div className="l-mock-cols">
        {COLUMNS.map((c) => (
          <div className="l-mock-col" key={c.label}>
            <div className={`l-mock-col-head ${c.tone}`}>{c.label}</div>
            {c.items.map((i) => (
              <div className="l-mock-chip" key={i}>{i}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MockGrowth() {
  const BARS = [38, 52, 44, 68, 61, 84, 96]

  return (
    <div className="l-mock l-mock-growth" aria-hidden="true">
      <div className="l-mock-bar">
        <span className="l-mock-dot" />
        <span className="l-mock-dot" />
        <span className="l-mock-dot" />
        <span className="l-mock-bar-title">Desempenho · últimos 7 dias</span>
      </div>
      <div className="l-mock-kpis">
        <div>
          <span className="l-mock-kpi-label">Faturamento</span>
          <span className="l-mock-kpi-value">R$ 4.280</span>
        </div>
        <div>
          <span className="l-mock-kpi-label">Ticket médio</span>
          <span className="l-mock-kpi-value">R$ 41,60</span>
        </div>
        <div>
          <span className="l-mock-kpi-label">Clientes fiéis</span>
          <span className="l-mock-kpi-value">63</span>
        </div>
      </div>
      <div className="l-mock-bars">
        {BARS.map((h, i) => (
          <span key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

const ROWS = [
  {
    tag: 'em todos os planos',
    kicker: 'Cardápio digital',
    title: 'Um cardápio com a sua cara, num link só seu',
    desc: 'Cor, logo e banner personalizados, categorias organizadas e busca de produtos. Você divulga o mesmo link no Instagram, no WhatsApp e no QR Code da mesa — e ele abre bonito em qualquer celular.',
  },
  {
    tag: 'em todos os planos',
    kicker: 'Pedidos e caixa',
    title: 'O pedido cai no painel na hora, do recebido ao entregue',
    desc: 'Kanban ao vivo, sem precisar dar F5, com o caixa do dia integrado. Fora do expediente é só fechar a loja num clique, sem mexer no cardápio.',
  },
  {
    tag: 'plano pro',
    kicker: 'Pra crescer',
    title: 'Sua marca no centro, sem limite de pedidos',
    desc: 'Pedidos ilimitados, clientes fiéis (CRM), relatórios de 30 e 90 dias, mais de uma loja na mesma conta e nenhum selo nosso no seu cardápio.',
    pro: true,
  },
]

export default function LandingSpotlights() {
  return (
    <section className="l-section" id="features">
      <div className="l-section-head">
        <div className="l-eyebrow">O que você leva</div>
        <h2 className="l-h2">Ferramentas pra sua loja vender mais</h2>
        <p className="l-section-sub">
          Sem depender de planilha, papel ou três apps diferentes para tocar o dia a dia.
        </p>
      </div>

      <div className="l-spots">
        {ROWS.map((r, i) => (
          <div className="l-spot" key={r.title}>
            <div className="l-spot-copy">
              <div className="l-spot-kicker">
                <span className={`l-plan-tag ${r.pro ? 'pro' : ''}`}>{r.tag}</span>
                {r.kicker}
              </div>
              <h3 className="l-spot-title">{r.title}</h3>
              <p className="l-spot-desc">{r.desc}</p>
            </div>
            <div className="l-spot-visual">
              {i === 0 && (
                <Image
                  src="/marketing/phone-cutout.png"
                  alt="Cardápio personalizado aberto no celular"
                  width={896}
                  height={1200}
                  className="l-spot-photo"
                />
              )}
              {i === 1 && <MockOrders />}
              {i === 2 && <MockGrowth />}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

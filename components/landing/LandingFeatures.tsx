const FEATURES = [
  {
    num: '01',
    title: 'Cardápio com a sua cara',
    desc: 'Cor, logo e banner personalizados, categorias organizadas e busca de produtos — sem parecer o mesmo template de todo mundo.',
    size: 'big',
  },
  {
    num: '02',
    title: 'Pedidos em tempo real',
    desc: 'Kanban ao vivo, do "recebido" ao "entregue", sem precisar dar F5.',
    size: 'wide',
  },
  {
    num: '03',
    title: 'Caixa integrado',
    desc: 'Acompanhe as entradas do dia sem outro sistema separado.',
  },
  {
    num: '04',
    title: 'Desempenho na palma da mão',
    desc: 'Faturamento e ticket médio por período.',
  },
  {
    num: '05',
    title: 'Link exclusivo da loja',
    desc: 'Um endereço só seu pra divulgar no Instagram e no WhatsApp.',
  },
]

export default function LandingFeatures() {
  return (
    <section className="l-section" id="features">
      <div className="l-section-head">
        <div className="l-eyebrow">Funcionalidades</div>
        <h2 className="l-h2">Tudo que sua loja precisa, num só lugar</h2>
        <p className="l-section-sub">
          Sem depender de planilha, papel ou três apps diferentes para tocar o dia a dia.
        </p>
      </div>
      <div className="l-features-grid">
        {FEATURES.map((f) => (
          <div className={`l-feature-card ${f.size ?? ''}`} key={f.title}>
            <div className="l-feature-num">{f.num}</div>
            <div className="l-feature-title">{f.title}</div>
            <div className="l-feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

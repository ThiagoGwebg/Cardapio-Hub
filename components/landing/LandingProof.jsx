// Faixa fina logo abaixo do hero: quatro promessas que já aparecem no resto da
// página, resumidas. Serve de respiro entre a faixa laranja e o conteúdo claro.
const POINTS = [
  { k: '0%', v: 'de comissão em cima de cada venda' },
  { k: 'link', v: 'exclusivo pra sua loja divulgar' },
  { k: 'zap', v: 'pedido chega pronto no WhatsApp' },
  { k: 'web', v: 'funciona no navegador, sem instalar' },
]

export default function LandingProof() {
  return (
    <section className="l-proof">
      <div className="l-proof-inner">
        {POINTS.map((p) => (
          <div className="l-proof-item" key={p.k}>
            <span className="l-proof-key">{p.k}</span>
            <span className="l-proof-val">{p.v}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

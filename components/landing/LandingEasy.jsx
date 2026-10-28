import Image from 'next/image'

export default function LandingEasy() {
  return (
    <section className="l-easy">
      <div className="l-easy-inner">
        <div className="l-easy-visual">
          <Image
            src="/marketing/tablet-cutout.png"
            alt="Cardápio Hub aberto num tablet"
            width={896}
            height={1200}
            className="l-easy-photo"
          />
        </div>
        <div className="l-easy-copy">
          <div className="l-eyebrow light">Sem curva de aprendizado</div>
          <h2 className="l-h2">Tão fácil quanto postar um story</h2>
          <p>
            Cadastrar um produto, corrigir um preço ou lançar a promoção do dia leva o mesmo
            tempo que publicar nas redes sociais.
          </p>
          <p>
            Você mexe em tudo sozinho, direto do celular, sem depender de ninguém e sem abrir
            chamado pra trocar uma foto.
          </p>
          <p>
            E o cardápio fica do mesmo jeito bonito no computador do balcão e no celular do
            seu cliente.
          </p>
        </div>
      </div>
    </section>
  )
}

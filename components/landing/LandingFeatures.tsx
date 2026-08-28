import {
  IconBadgeOff,
  IconBoard,
  IconChart,
  IconChat,
  IconHeart,
  IconLink,
  IconPalette,
  IconPower,
  IconQr,
  IconSearch,
  IconSheet,
  IconStores,
} from '@/components/landing/LandingIcons'

/* Grade de azulejos: um item por recurso, com o menor plano que já o inclui.
   O selo é o que evita a pergunta "isso é do Lite ou do Pro?" chegar no suporte.
   `tier` é o piso — 'plus' significa "Plus e Pro", não "só no Plus". */
const TIERS = {
  all: { label: 'todos os planos', cls: '' },
  plus: { label: 'plus e pro', cls: 'plus' },
  pro: { label: 'pro', cls: 'pro' },
} as const

const TILES = [
  { icon: IconPalette, label: 'Cor e logo\npersonalizados', tier: 'all' },
  { icon: IconSearch, label: 'Categorias e busca\nno cardápio', tier: 'all' },
  { icon: IconBoard, label: 'Painel de pedidos\nao vivo', tier: 'all' },
  { icon: IconChart, label: 'Caixa e desempenho\npor período', tier: 'all' },
  { icon: IconLink, label: 'Link exclusivo\nda loja', tier: 'all' },
  { icon: IconPower, label: 'Abrir e fechar a loja\nnum clique', tier: 'all' },
  { icon: IconQr, label: 'QR Code pronto\npra imprimir', tier: 'plus' },
  { icon: IconChat, label: 'Aviso de pedido\nno WhatsApp', tier: 'pro' },
  { icon: IconHeart, label: 'Clientes fiéis\n(CRM)', tier: 'pro' },
  { icon: IconStores, label: 'Mais de uma loja\nna mesma conta', tier: 'pro' },
  { icon: IconSheet, label: 'Exportação\nem CSV', tier: 'pro' },
  { icon: IconBadgeOff, label: 'Sem selo\nCardápio Hub', tier: 'pro' },
] as const

export default function LandingFeatures() {
  return (
    <section className="l-section tight">
      <div className="l-section-head">
        <div className="l-eyebrow">Funcionalidades</div>
        <h2 className="l-h2">Tudo que sua loja precisa, num só lugar</h2>
      </div>
      <div className="l-tiles">
        {TILES.map(({ icon: Icon, label, tier }) => (
          <div className="l-tile" key={label}>
            <span className="l-tile-icon"><Icon /></span>
            <span className="l-tile-label">
              {label.split('\n').map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
            <span className={`l-plan-tag ${TIERS[tier].cls}`}>{TIERS[tier].label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

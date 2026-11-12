'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BellRing,
  ChartNoAxesCombined,
  ChevronsUpDown,
  ClipboardList,
  CreditCard,
  ExternalLink,
  HardDrive,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  Package,
  Plug,
  Settings,
  Store,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { playNewOrderBeep } from '@/lib/sound'
import { autoPrintOrder } from '@/lib/print/autoPrint'
import InstallPwaButton from '@/components/InstallPwaButton'
import PushNotificationPrompt from '@/components/PushNotificationPrompt'
import { resolveStoreOpen } from '@/lib/openingHours'
import LogoutButton from './LogoutButton'
import ThemeToggle from './ThemeToggle'
import './dashboard.css'

const DASHBOARD_INSTALL_BENEFITS = [
  { Icon: Bell, text: 'Alertas de pedido novo, mesmo com o app fechado' },
  { Icon: Zap, text: 'Abre direto nos pedidos, sem precisar buscar o link' },
  { Icon: HardDrive, text: 'Leve — não ocupa espaço como um app de loja' },
]

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('cardapio-dash-theme') || 'light';
    if (t === 'black') t = 'dark';
    document.documentElement.setAttribute('data-dash-theme', t);
  } catch (e) {}
})();
`

// Menu organizado pelo ritmo do restaurante: o que se usa com a loja aberta
// (Operação), o que se olha depois (Gestão) e o que se ajusta de vez em
// quando (Configurações, uma entrada só com sub-abas na própria página).
const NAV_GROUPS = [
  {
    title: 'Operação',
    items: [
      { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
      { href: '/dashboard/pedidos', label: 'Pedidos', Icon: ClipboardList },
      { href: '/dashboard/cardapio', label: 'Cardápio', Icon: UtensilsCrossed },
      { href: '/dashboard/estoque', label: 'Estoque', Icon: Package },
      { href: '/dashboard/caixa', label: 'Caixa', Icon: Wallet },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { href: '/dashboard/clientes', label: 'Clientes', Icon: Users },
      { href: '/dashboard/desempenho', label: 'Desempenho', Icon: ChartNoAxesCombined },
    ],
  },
]

// Sub-abas de Configurações. As URLs são as de sempre — só a navegação mudou.
const SETTINGS_TABS = [
  { href: '/dashboard/loja', label: 'Minha Loja', Icon: Store },
  { href: '/dashboard/links', label: 'Links', Icon: Link2 },
  { href: '/dashboard/notificacoes', label: 'Notificações', Icon: BellRing },
  { href: '/dashboard/billing', label: 'Assinatura', Icon: CreditCard },
]
const isSettingsPath = (p) => SETTINGS_TABS.some((t) => p === t.href || p.startsWith(t.href + '/'))


export default function DashboardShell({
  store,
  account,
  initialOpen,
  children,
}
) {
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [novoCount, setNovoCount] = useState(0)
  const [pulse, setPulse] = useState(false)
  const [newOrderSignal, setNewOrderSignal] = useState(0)
  const prevCountRef = useRef(0)
  const initedRef = useRef(false)
  const alertsRef = useRef(false)
  const pathname = usePathname()

  // Estado dos alertas (ligado na página de Notificações) — lido por ref pra o
  // callback do realtime sempre pegar o valor atual sem re-inscrever o canal.
  useEffect(() => {
    const read = () => {
      alertsRef.current = localStorage.getItem('cardapio-order-alerts') === '1'
    }
    read()
    window.addEventListener('order-alerts-changed', read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener('order-alerts-changed', read)
      window.removeEventListener('storage', read)
    }
  }, [])

  // Contador de pedidos NOVOS em tempo real + alertas — de qualquer tela do painel.
  useEffect(() => {
    const supabase = createClient()
    let active = true

    async function refreshCount() {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('status', 'novo')
      if (!active) return
      const c = count ?? 0

      // No primeiro carregamento só firma a linha de base (não alerta pedidos já existentes).
      if (!initedRef.current) {
        initedRef.current = true
        prevCountRef.current = c
        setNovoCount(c)
        return
      }

      if (c > prevCountRef.current) {
        setPulse(true)
        setTimeout(() => setPulse(false), 1500)
        if (alertsRef.current) fireOrderAlert(c)
        // Alertas ainda não ligados: é o momento certo pra sugerir ativar (o valor
        // acabou de ficar óbvio — chegou um pedido e o lojista não foi avisado).
        else setNewOrderSignal((s) => s + 1)
      }
      prevCountRef.current = c
      setNovoCount(c)
    }

    // Comanda automática: o gatilho fica aqui, e não na tela de Pedidos, pra
    // imprimir de qualquer página do painel. `autoPrintOrder` decide sozinho se
    // este aparelho imprime e garante uma via só por pedido.
    function onOrderChange(payload) {
      refreshCount()
      const row = payload.new;
      if (!row?.id) return
      // Pedido comum entra já visível; o de pagamento online nasce 'pending' e
      // só vira comanda quando o webhook confirma o pagamento.
      const chegou =
        (payload.eventType === 'INSERT' && row.payment_status !== 'pending') ||
        (payload.eventType === 'UPDATE' && row.payment_status === 'paid')
      if (chegou) autoPrintOrder(row.id)
    }

    refreshCount()
    const channel = supabase
      .channel(`shell-orders-${store.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        onOrderChange
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [store.id])

  // Contador no título da aba (chama atenção quando a aba está em segundo plano).
  useEffect(() => {
    document.title = novoCount > 0 ? `🔔 (${novoCount}) Pedidos novos` : 'Cardápio Hub'
  }, [novoCount])

  // Dispara os alertas de um pedido novo (som + notificação do sistema + vibração).
  function fireOrderAlert(count) {
    playNewOrderBeep()
    try {
      navigator.vibrate?.([200, 100, 200])
    } catch {
      /* sem suporte a vibração */
    }
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification('🔔 Novo pedido!', {
          body: count > 1 ? `Você tem ${count} pedidos novos aguardando.` : 'Um novo pedido acabou de chegar.',
          tag: 'novo-pedido',
        })
        n.onclick = () => {
          window.focus()
          window.location.href = '/dashboard/pedidos'
        }
      }
    } catch {
      /* Notification indisponível */
    }
  }

  // Relógio do lojista. Null no 1º render (servidor e cliente partem do mesmo
  // `initialOpen`, sem mismatch de hidratação) e depois bate a cada minuto — o
  // painel costuma ficar aberto atravessando a hora de fechar.
  const [nowTs, setNowTs] = useState(null)
  useEffect(() => {
    const init = setTimeout(() => setNowTs(Date.now()), 0)
    const tick = setInterval(() => setNowTs(Date.now()), 60_000)
    return () => {
      clearTimeout(init)
      clearInterval(tick)
    }
  }, [])

  // Mesmo estado que o cardápio público mostra: interruptor manual + grade.
  const storeOpen = useMemo(
    () => (nowTs === null ? initialOpen : resolveStoreOpen(store, new Date(nowTs))),
    [store, nowTs, initialOpen]
  )
  const badgeLabel = storeOpen.open ? '● Aberto' : '● Fechado'
  const badgeClass = `open-badge ${storeOpen.open ? '' : 'is-closed-badge'}`
  // Fechada pela grade: explica o porquê, senão parece que o painel travou.
  const badgeTitle = storeOpen.reason === 'schedule'
    ? `Fora do horário de funcionamento${storeOpen.nextLabel ? ` — abre ${storeOpen.nextLabel}` : ''}`
    : undefined

  // Destaca "Dashboard" só quando está exatamente em /dashboard
  function isActive(href) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }
  const inSettings = isSettingsPath(pathname)
  // Na raiz de uma sub-aba o título da página repete o nome da aba — o
  // cabeçalho "Configurações" já cumpre esse papel, então o CSS esconde o dela.
  const onSettingsTabRoot = SETTINGS_TABS.some((t) => t.href === pathname)

  function closeMenus() {
    setOpen(false)
    setAccountOpen(false)
  }

  // Sem nome cadastrado, a parte antes do @ cabe na sidebar; o e-mail completo
  // fica no title do botão.
  const accountLabel = account?.name || account?.email?.split('@')[0] || 'Minha conta'
  const accountInitial = (accountLabel.trim().charAt(0) || '?').toUpperCase()

  // No desktop a sidebar é um trilho só de ícones que se expande ao passar o
  // mouse (ou ao focar com Tab). O rótulo continua no DOM o tempo todo — só
  // fica invisível no trilho —, então leitor de tela e busca da página o veem.
  function NavLinks() {
    return (
      <nav className="sidebar-nav" aria-label="Menu do painel">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="nav-group">
            <div className="nav-section-title"><span>{group.title}</span></div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                aria-current={isActive(item.href) ? 'page' : undefined}
                onClick={closeMenus}
              >
                <span className="nav-ico"><item.Icon size={19} strokeWidth={2} /></span>
                <span className="nav-label">{item.label}</span>
                {item.href === '/dashboard/pedidos' && novoCount > 0 && (
                  <span
                    className={`nav-badge ${pulse ? 'pulse' : ''}`}
                    aria-label={`${novoCount} ${novoCount === 1 ? 'pedido novo' : 'pedidos novos'}`}
                  >
                    {novoCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}

        <div className="nav-group">
          <div className="nav-section-title"><span>Loja</span></div>
          <Link
            href={SETTINGS_TABS[0].href}
            className={`nav-item ${inSettings ? 'active' : ''}`}
            aria-current={inSettings ? 'page' : undefined}
            onClick={closeMenus}
          >
            <span className="nav-ico"><Settings size={19} strokeWidth={2} /></span>
            <span className="nav-label">Configurações</span>
          </Link>
          <Link
            href="/dashboard/integracoes"
            className={`nav-item ${isActive('/dashboard/integracoes') ? 'active' : ''}`}
            aria-current={isActive('/dashboard/integracoes') ? 'page' : undefined}
            onClick={closeMenus}
          >
            <span className="nav-ico"><Plug size={19} strokeWidth={2} /></span>
            <span className="nav-label">Integrações</span>
          </Link>
          {store.slug && (
            <a
              href={`/loja/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-item"
              onClick={closeMenus}
            >
              <span className="nav-ico"><ExternalLink size={19} strokeWidth={2} /></span>
              <span className="nav-label">Ver meu cardápio</span>
            </a>
          )}
        </div>
      </nav>
    )
  }

  return (
    <div className="dashboard">
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <div className="mobile-topbar">
        <button className="mobile-menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <span /><span /><span />
          {novoCount > 0 && <span className={`mobile-menu-badge ${pulse ? 'pulse' : ''}`}>{novoCount}</span>}
        </button>
        <div className="mobile-topbar-title">
          cardápio<span>ágil</span>
        </div>
        <span className={badgeClass} title={badgeTitle}>{badgeLabel}</span>
      </div>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside
        className={`sidebar ${open ? 'open' : ''}`}
        // No desktop o trilho recolhe ao tirar o mouse; o menu da conta fecha junto.
        onMouseLeave={() => setAccountOpen(false)}
      >
        <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Fechar menu">
          <X size={18} strokeWidth={2.4} />
        </button>
        <Link href="/dashboard" className="sidebar-logo" aria-label="Cardápio Ágil — início do painel">
          <span className="sidebar-logo-mark" aria-hidden><UtensilsCrossed size={18} strokeWidth={2.4} /></span>
          <span className="sidebar-logo-word">cardápio<span>ágil</span></span>
        </Link>
        <div className="sidebar-store">
          <div className="sidebar-store-row">
            <span className="sidebar-store-avatar-wrap">
              {store.theme?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="sidebar-store-avatar" src={store.theme.logoUrl} alt="" />
              ) : (
                <span className="sidebar-store-avatar is-letter" aria-hidden>
                  {(store.name || '?').trim().charAt(0).toUpperCase()}
                </span>
              )}
              {/* No trilho recolhido o selo Aberto/Fechado vira este ponto. */}
              <span
                className={`sidebar-store-dot ${storeOpen.open ? '' : 'is-closed'}`}
                aria-hidden
              />
            </span>
            <div className="sidebar-store-id">
              <div className="sidebar-store-name">{store.name}</div>
              <div className="sidebar-store-loc">{store.address || 'Endereço não definido'}</div>
            </div>
          </div>
          <div className="sidebar-store-more">
            <div>
              <div className={badgeClass} title={badgeTitle}>{badgeLabel}</div>
              {storeOpen.reason === 'schedule' && storeOpen.nextLabel && (
                <div className="sidebar-store-loc">Abre {storeOpen.nextLabel}</div>
              )}
            </div>
          </div>
        </div>

        <NavLinks />

        <div className="sidebar-foot">
          {/* Instalação do app desligada por enquanto no painel do lojista — o componente
              fica montado só pra registrar o service worker (offline + push). */}
          <InstallPwaButton
            hideButton
            storeName={store.name}
            appIconSrc="/dashboard/app-icon.svg"
            scope="/dashboard"
            title="Painel Cardápio Hub"
            subtitle="Acesse seus pedidos em um toque, sem precisar buscar o link"
            benefits={DASHBOARD_INSTALL_BENEFITS}
          />
          {/* Menu da conta: abre para cima, dentro do fluxo da sidebar (um
              popover absoluto seria cortado pelo overflow dela). */}
          <div
            id="sidebar-account-menu"
            className={`account-menu ${accountOpen ? 'open' : ''}`}
            hidden={!accountOpen}
          >
            <ThemeToggle />
            <Link href="/dashboard/ajuda" className="nav-item" onClick={closeMenus}>
              <span className="nav-ico"><LifeBuoy size={19} strokeWidth={2} /></span>
              <span className="nav-label">Ajuda</span>
            </Link>
            <LogoutButton />
          </div>
          <button
            type="button"
            className={`sidebar-account ${accountOpen ? 'open' : ''}`}
            aria-expanded={accountOpen}
            aria-controls="sidebar-account-menu"
            onClick={() => setAccountOpen((v) => !v)}
            onKeyDown={(e) => { if (e.key === 'Escape') setAccountOpen(false) }}
            title={account?.email || undefined}
          >
            <span className="sidebar-account-avatar" aria-hidden>{accountInitial}</span>
            <span className="sidebar-account-id">
              <span className="sidebar-account-name">{accountLabel}</span>
              <span className="sidebar-account-role">Dono da loja</span>
            </span>
            <ChevronsUpDown className="sidebar-account-chev" size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </aside>
      <main className={`dash-content ${inSettings ? 'is-settings' : ''} ${onSettingsTabRoot ? 'is-settings-root' : ''}`}>
        {inSettings && (
          <div className="settings-head">
            <div className="dash-header page-head">
              <span className="page-head-ico" aria-hidden><Settings size={22} strokeWidth={2} /></span>
              <div>
                <h1 className="dash-title">Configurações</h1>
                <div className="dash-subtitle">Dados da loja, links de divulgação, avisos de pedido e o seu plano.</div>
              </div>
            </div>
            <nav className="settings-tabs" aria-label="Seções de configuração">
              {SETTINGS_TABS.map((t) => {
                const active = pathname === t.href || pathname.startsWith(t.href + '/')
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`settings-tab ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <t.Icon size={16} strokeWidth={2} aria-hidden />
                    {t.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
        {children}
      </main>
      <PushNotificationPrompt
        scope="dashboard"
        tags={{ store_id: store.id, role: 'lojista' }}
        storageKey={store.id}
        title="Quer ser avisado dos pedidos?"
        subtitle="Ative as notificações e saiba na hora — mesmo com o painel fechado."
        triggerSignal={newOrderSignal}
        triggerTitle="Chegou um pedido novo!"
        onActivated={() => {
          localStorage.setItem('cardapio-order-alerts', '1')
          window.dispatchEvent(new Event('order-alerts-changed'))
        }}
      />
    </div>
  )
}

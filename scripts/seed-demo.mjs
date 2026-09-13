/**
 * Cria (ou reseta) a loja de demonstração usada nas apresentações comerciais.
 *
 *   node scripts/seed-demo.mjs
 *
 * O script é IDEMPOTENTE e DESTRUTIVO para a loja demo: apaga cardápio, pedidos e
 * histórico dela antes de semear de novo. É de propósito — depois que um prospecto
 * mexe na demo, rodar isto devolve a loja ao estado de vitrine. Nenhuma outra loja
 * é tocada: tudo é filtrado por `store_id` da demo.
 *
 * Precisa de SUPABASE_SERVICE_ROLE_KEY (lido de .env.local) porque cria o usuário
 * no auth e escreve por cima de RLS.
 *
 * As fotos dos produtos ficam em scripts/demo-images.json ({ "<key>": "<url>" }),
 * gerado por scripts/seed-demo-assets.mjs. Sem esse arquivo o cardápio sobe sem
 * fotos — o resto funciona igual.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { adminClient } from './demo-client.mjs'
import { CATEGORIES, COUPONS, CUSTOMERS, DELIVERY_ZONES, OCCASIONAL_CUSTOMERS } from './demo-menu.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const DEMO = {
  email: 'demo@cardapiohub.com',
  password: 'demo1234',
  slug: 'demo',
  storeName: 'Brasa Burger',
}

/** Aborta na primeira falha: seed pela metade é pior que seed nenhum. */
function check(label, { error }) {
  if (error) throw new Error(`${label}: ${error.message}`)
}

/** PRNG determinístico — a mesma semente gera sempre o mesmo histórico de pedidos. */
function mulberry32(seed) {
  return function rng() {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SP_OFFSET_MS = 3 * 60 * 60 * 1000 // São Paulo = UTC-3, sem horário de verão.

/** Instante em horário de São Paulo, N dias atrás, convertido para UTC. */
function spTime(daysAgo, hour, minute) {
  const now = new Date()
  const sp = new Date(now.getTime() - SP_OFFSET_MS)
  const d = Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate() - daysAgo, hour, minute, 0)
  return new Date(d + SP_OFFSET_MS)
}

const minutesAfter = (date, min) => new Date(date.getTime() + min * 60_000)
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

// ---------------------------------------------------------------------------
// Loja
// ---------------------------------------------------------------------------

/** Aberta todo dia das 11h às 23h30. `auto_hours` fica DESLIGADO de propósito:
 *  a demo precisa estar no ar a qualquer hora que o vendedor abrir o link. */
const OPENING_HOURS = Object.fromEntries(
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, [{ open: '11:00', close: '23:30' }]])
)

function storeFields(images) {
  return {
    name: DEMO.storeName,
    slug: DEMO.slug,
    // Sem WhatsApp: um número inventado cairia no celular de algum desconhecido.
    // O checkout da demo é pelo sistema, então nada depende disso.
    whatsapp_number: null,
    address: 'Rua das Acácias, 120 — Centro',
    min_order_cents: 2000,
    is_open: true,
    delivery_enabled: true,
    pickup_enabled: true,
    dine_in_enabled: true,
    delivery_fee_cents: 600,
    estimated_prep_min: 25,
    estimated_delivery_min: 45,
    accepts_cash: true,
    accepts_card: true,
    accepts_pix: true,
    pix_key: 'pedidos@brasaburger.com.br',
    pix_key_type: 'email',
    checkout_mode: 'system',
    online_payment_enabled: false,
    auto_hours: false,
    opening_hours: OPENING_HOURS,
    billing_suspended: false,
    theme: {
      logoUrl: images.__logo ?? '',
      logoShape: 'round',
      bannerUrl: images.__banner ?? '',
      primaryColor: '#E23D28',
      secondaryColor: '#1F2933',
      accentColor: '#F5A524',
      font: 'Sora',
      menuLayout: 'grid',
      announcement: 'Entrega grátis acima de R$ 60 · Pedidos até 23h30',
    },
  }
}

// ---------------------------------------------------------------------------
// Pedidos de exemplo
// ---------------------------------------------------------------------------

const POOLS = {
  mains: ['smash-classico', 'smash-classico', 'smash-duplo-cheddar', 'smash-bacon', 'brasa-burger',
    'brasa-burger', 'costela-defumada', 'frango-crocante', 'cheese-salada', 'smash-veggie'],
  sides: ['batata-rustica', 'batata-cheddar-bacon', 'onion-rings', 'frango-empanado'],
  drinks: ['coca-lata', 'coca-lata', 'refrigerante-lata', 'suco-laranja', 'cerveja-long-neck', 'agua-mineral'],
  desserts: ['milkshake', 'brownie-sorvete', 'petit-gateau'],
}

const NOTES = [
  null, null, null,
  'Sem cebola no hambúrguer, por favor.',
  'Interfone quebrado — ligar ao chegar.',
  'Caprichar no molho da casa!',
  'Entregar na portaria.',
]

/**
 * Monta um item do pedido: escolhe as opções obrigatórias e, às vezes, adicionais.
 * O preço unitário sai igual ao que a RPC `create_order` calcularia (preço do
 * produto + deltas das opções escolhidas).
 */
function buildItem(rng, product) {
  const chosen = []
  for (const group of product.groups) {
    const active = group.options
    if (group.required) {
      const n = Math.max(1, group.min_select)
      const shuffled = [...active].sort(() => rng() - 0.5)
      chosen.push(...shuffled.slice(0, n).map((o) => ({ group, option: o })))
    } else if (rng() < 0.45) {
      const paid = active.filter((o) => o.price_delta_cents > 0)
      const n = 1 + (rng() < 0.3 ? 1 : 0)
      const shuffled = [...paid].sort(() => rng() - 0.5)
      chosen.push(...shuffled.slice(0, Math.min(n, group.max_select || 1)).map((o) => ({ group, option: o })))
    }
  }
  const unit = product.price_cents + chosen.reduce((sum, c) => sum + c.option.price_delta_cents, 0)
  const quantity = rng() < 0.18 ? 2 : 1
  return { product, quantity, unit_price_cents: unit, options: chosen }
}

function buildCart(rng, byKey) {
  const items = []
  const mains = rng() < 0.35 ? 2 : 1
  for (let i = 0; i < mains; i++) items.push(buildItem(rng, byKey[pick(rng, POOLS.mains)]))
  if (rng() < 0.6) items.push(buildItem(rng, byKey[pick(rng, POOLS.sides)]))
  if (rng() < 0.72) items.push(buildItem(rng, byKey[pick(rng, POOLS.drinks)]))
  if (rng() < 0.25) items.push(buildItem(rng, byKey[pick(rng, POOLS.desserts)]))
  return items
}

/** Um pedido completo, já com frete, cupom e total calculados como no checkout real. */
function buildOrder(rng, byKey, { status, createdAt, orderType, customer, scheduledFor = null }) {
  const items = buildCart(rng, byKey)
  const subtotal = items.reduce((s, it) => s + it.unit_price_cents * it.quantity, 0)

  const zone = DELIVERY_ZONES.find((z) => z.neighborhood === customer.neighborhood)
  let deliveryFee = orderType === 'delivery' ? (zone?.fee_cents ?? 600) : 0

  let discount = 0
  let couponCode = null
  if (orderType === 'delivery' && rng() < 0.22) {
    if (subtotal >= 6000) {
      couponCode = 'FRETEGRATIS'
      deliveryFee = 0
    } else if (subtotal >= 3000) {
      couponCode = 'BEMVINDO10'
      discount = Math.floor((subtotal * 10) / 100)
    }
  }

  const paymentMethod = orderType === 'dine_in'
    ? pick(rng, ['card', 'pix', 'cash'])
    : pick(rng, ['pix', 'pix', 'card', 'cash', 'card'])

  return {
    status,
    createdAt,
    scheduledFor,
    order: {
      status,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_note: pick(rng, NOTES),
      subtotal_cents: subtotal,
      delivery_fee_cents: deliveryFee,
      discount_cents: discount,
      total_cents: Math.max(0, subtotal + deliveryFee - discount),
      coupon_code: couponCode,
      order_type: orderType,
      payment_method: paymentMethod,
      change_for_cents: paymentMethod === 'cash' && rng() < 0.5
        ? Math.ceil((subtotal + deliveryFee - discount + 1000) / 5000) * 5000
        : null,
      table_number: orderType === 'dine_in' ? String(1 + Math.floor(rng() * 12)) : null,
      address_street: orderType === 'delivery' ? customer.street : null,
      address_number: orderType === 'delivery' ? customer.number : null,
      address_neighborhood: orderType === 'delivery' ? customer.neighborhood : null,
      address_complement: orderType === 'delivery' && rng() < 0.3 ? `Apto ${10 + Math.floor(rng() * 80)}` : null,
      address_reference: orderType === 'delivery' && rng() < 0.25 ? 'Portão azul' : null,
      address_cep: orderType === 'delivery' ? '13800-000' : null,
      source: rng() < 0.12 ? 'manual' : 'cardapio',
      payment_status: 'not_required',
      scheduled_for: scheduledFor,
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    },
    items,
  }
}

/** Linha do tempo de status coerente com o horário do pedido. */
function statusTimeline(status, createdAt, orderType) {
  const at = (min) => minutesAfter(createdAt, min).toISOString()
  if (status === 'cancelado') return [['novo', at(0)], ['cancelado', at(6)]]
  if (status === 'novo') return [['novo', at(0)]]
  if (status === 'preparando') return [['novo', at(0)], ['preparando', at(3)]]
  if (status === 'pronto') return [['novo', at(0)], ['preparando', at(3)], ['pronto', at(19)]]
  if (status === 'a_caminho') {
    return [['novo', at(0)], ['preparando', at(3)], ['pronto', at(19)], ['a_caminho', at(23)]]
  }
  if (status === 'agendado') return [['agendado', at(0)]]
  const steps = [['novo', at(0)], ['preparando', at(4)], ['pronto', at(20)]]
  if (orderType === 'delivery') steps.push(['a_caminho', at(24)])
  steps.push(['concluido', at(orderType === 'delivery' ? 47 : 32)])
  return steps
}

/**
 * Fila de clientes dos pedidos retroativos: os recorrentes entram nove vezes cada,
 * os de passagem uma ou duas. Embaralhada e consumida em ordem — sorteio livre
 * daria a um cliente "de passagem" seis pedidos e sumiria com a diferença entre
 * ele e um VIP, que é justamente o que a aba Clientes existe para mostrar.
 */
function customerQueue(rng) {
  const pool = [
    ...CUSTOMERS.flatMap((c) => Array(9).fill(c)),
    ...OCCASIONAL_CUSTOMERS.flatMap((c) => (rng() < 0.3 ? [c, c] : [c])),
  ]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  let i = 0
  return () => pool[i++ % pool.length]
}

/** O histórico inteiro: 35 dias de pedidos concluídos + o movimento de hoje. */
function planOrders(rng, byKey) {
  const plans = []
  const orderTypes = ['delivery', 'delivery', 'delivery', 'delivery', 'pickup', 'pickup', 'dine_in']
  const nextCustomer = customerQueue(rng)

  for (let daysAgo = 35; daysAgo >= 1; daysAgo--) {
    const weekday = spTime(daysAgo, 20, 0).getUTCDay() // 0=dom … 6=sáb
    const busy = weekday === 5 || weekday === 6 || weekday === 0
    const count = busy ? 3 + Math.floor(rng() * 3) : 1 + Math.floor(rng() * 3)

    for (let i = 0; i < count; i++) {
      const hour = 18 + Math.floor(rng() * 5)
      const minute = Math.floor(rng() * 60)
      const status = rng() < 0.05 ? 'cancelado' : 'concluido'
      plans.push(buildOrder(rng, byKey, {
        status,
        createdAt: spTime(daysAgo, hour, minute),
        orderType: pick(rng, orderTypes),
        customer: nextCustomer(),
      }))
    }
  }

  // Movimento de hoje, relativo a AGORA: é o que o vendedor mostra no painel ao vivo.
  const now = new Date()
  const live = [
    { status: 'concluido', minutesAgo: 165, orderType: 'delivery', customer: CUSTOMERS[0] },
    { status: 'concluido', minutesAgo: 120, orderType: 'pickup', customer: CUSTOMERS[3] },
    { status: 'a_caminho', minutesAgo: 38, orderType: 'delivery', customer: CUSTOMERS[1] },
    { status: 'pronto', minutesAgo: 25, orderType: 'pickup', customer: CUSTOMERS[6] },
    { status: 'preparando', minutesAgo: 14, orderType: 'dine_in', customer: CUSTOMERS[4] },
    { status: 'novo', minutesAgo: 4, orderType: 'delivery', customer: CUSTOMERS[2] },
  ]
  for (const l of live) {
    plans.push(buildOrder(rng, byKey, {
      status: l.status,
      createdAt: new Date(now.getTime() - l.minutesAgo * 60_000),
      orderType: l.orderType,
      customer: l.customer,
    }))
  }

  // Um agendado para amanhã à noite — mostra a coluna "Agendados" com conteúdo.
  plans.push(buildOrder(rng, byKey, {
    status: 'agendado',
    createdAt: new Date(now.getTime() - 90 * 60_000),
    orderType: 'delivery',
    customer: CUSTOMERS[7],
    scheduledFor: spTime(-1, 20, 30).toISOString(),
  }))

  return plans
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function ensureUser(supabase) {
  let page = 1
  let found = null
  while (!found) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    found = data.users.find((u) => u.email?.toLowerCase() === DEMO.email)
    if (found || data.users.length < 200) break
    page++
  }

  if (found) {
    const { error } = await supabase.auth.admin.updateUserById(found.id, {
      password: DEMO.password,
      email_confirm: true,
    })
    if (error) throw new Error(`updateUser: ${error.message}`)
    return found.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO.email,
    password: DEMO.password,
    email_confirm: true,
    user_metadata: { display_name: 'Demonstração CardápioHub' },
  })
  if (error) throw new Error(`createUser: ${error.message}`)
  return data.user.id
}

async function ensureStore(supabase, ownerId, images) {
  const { data: existing, error } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', DEMO.slug)
    .maybeSingle()
  if (error) throw new Error(`select store: ${error.message}`)

  if (existing) {
    check('update store', await supabase.from('stores')
      .update({ ...storeFields(images), owner_id: ownerId })
      .eq('id', existing.id))
    return existing.id
  }

  const { data, error: insErr } = await supabase
    .from('stores')
    .insert({ ...storeFields(images), owner_id: ownerId })
    .select('id')
    .single()
  if (insErr) throw new Error(`insert store: ${insErr.message}`)
  return data.id
}

/** Zera só o que pertence à loja demo, respeitando a ordem das FKs. */
async function wipe(supabase, storeId) {
  const { data: orders } = await supabase.from('orders').select('id').eq('store_id', storeId)
  const orderIds = (orders ?? []).map((o) => o.id)

  if (orderIds.length) {
    const { data: items } = await supabase.from('order_items').select('id').in('order_id', orderIds)
    const itemIds = (items ?? []).map((i) => i.id)
    if (itemIds.length) {
      check('wipe order_item_options', await supabase.from('order_item_options').delete().in('order_item_id', itemIds))
    }
    check('wipe order_items', await supabase.from('order_items').delete().in('order_id', orderIds))
  }
  check('wipe order_status_history', await supabase.from('order_status_history').delete().eq('store_id', storeId))
  check('wipe orders', await supabase.from('orders').delete().eq('store_id', storeId))
  check('wipe product_options', await supabase.from('product_options').delete().eq('store_id', storeId))
  check('wipe product_option_groups', await supabase.from('product_option_groups').delete().eq('store_id', storeId))
  check('wipe products', await supabase.from('products').delete().eq('store_id', storeId))
  check('wipe categories', await supabase.from('categories').delete().eq('store_id', storeId))
  check('wipe delivery_zones', await supabase.from('delivery_zones').delete().eq('store_id', storeId))
  check('wipe coupons', await supabase.from('coupons').delete().eq('store_id', storeId))
}

async function seedMenu(supabase, storeId, images) {
  const byKey = {}

  for (const [ci, cat] of CATEGORIES.entries()) {
    const { data: category, error } = await supabase
      .from('categories')
      .insert({ store_id: storeId, name: cat.name, emoji: cat.emoji, sort_order: ci })
      .select('id')
      .single()
    if (error) throw new Error(`categoria ${cat.name}: ${error.message}`)

    for (const [pi, prod] of cat.products.entries()) {
      const imageUrl = images[prod.key] ?? null
      const { data: product, error: pErr } = await supabase
        .from('products')
        .insert({
          store_id: storeId,
          category_id: category.id,
          name: prod.name,
          description: prod.description,
          price_cents: prod.price_cents,
          image_url: imageUrl,
          images: imageUrl ? [imageUrl] : [],
          is_active: true,
          sort_order: pi,
        })
        .select('id')
        .single()
      if (pErr) throw new Error(`produto ${prod.name}: ${pErr.message}`)

      const groups = []
      for (const [gi, group] of prod.groups.entries()) {
        const { data: g, error: gErr } = await supabase
          .from('product_option_groups')
          .insert({
            store_id: storeId,
            product_id: product.id,
            name: group.name,
            min_select: group.min_select,
            max_select: group.max_select,
            required: group.required,
            sort_order: gi,
          })
          .select('id')
          .single()
        if (gErr) throw new Error(`grupo ${group.name} de ${prod.name}: ${gErr.message}`)

        const { data: opts, error: oErr } = await supabase
          .from('product_options')
          .insert(group.options.map((o, oi) => ({
            store_id: storeId,
            group_id: g.id,
            name: o.name,
            price_delta_cents: o.price_delta_cents,
            is_active: true,
            sort_order: oi,
          })))
          .select('id, name, price_delta_cents')
        if (oErr) throw new Error(`opções de ${group.name}: ${oErr.message}`)

        groups.push({ id: g.id, name: group.name, required: group.required, min_select: group.min_select, max_select: group.max_select, options: opts })
      }

      byKey[prod.key] = { id: product.id, name: prod.name, price_cents: prod.price_cents, groups }
    }
  }

  return byKey
}

async function seedOrders(supabase, storeId, byKey) {
  const rng = mulberry32(20260913)
  const plans = planOrders(rng, byKey).sort((a, b) => a.createdAt - b.createdAt)

  const history = []
  let n = 0

  for (const plan of plans) {
    n++
    const timeline = statusTimeline(plan.status, plan.createdAt, plan.order.order_type)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        ...plan.order,
        store_id: storeId,
        order_number: n,
        updated_at: timeline[timeline.length - 1][1],
      })
      .select('id')
      .single()
    if (error) throw new Error(`pedido #${n}: ${error.message}`)

    for (const item of plan.items) {
      const { data: row, error: iErr } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product.id,
          product_name_snapshot: item.product.name,
          unit_price_cents: item.unit_price_cents,
          quantity: item.quantity,
        })
        .select('id')
        .single()
      if (iErr) throw new Error(`item do pedido #${n}: ${iErr.message}`)

      if (item.options.length) {
        check(`opções do item do pedido #${n}`, await supabase.from('order_item_options').insert(
          item.options.map((c) => ({
            order_item_id: row.id,
            option_id: c.option.id,
            group_name_snapshot: c.group.name,
            name_snapshot: c.option.name,
            price_delta_cents_snapshot: c.option.price_delta_cents,
          }))
        ))
      }
    }

    for (const [status, changedAt] of timeline) {
      history.push({ order_id: order.id, store_id: storeId, status, changed_at: changedAt })
    }
  }

  // O trigger `log_order_status` já gravou uma linha por pedido com a hora de AGORA.
  // Como os pedidos são retroativos, essa linha mente: troca-se todo o histórico
  // da loja pela linha do tempo coerente montada acima.
  check('limpa histórico automático', await supabase.from('order_status_history').delete().eq('store_id', storeId))
  for (let i = 0; i < history.length; i += 400) {
    check('histórico de status', await supabase.from('order_status_history').insert(history.slice(i, i + 400)))
  }

  return plans.length
}

async function seedExtras(supabase, storeId) {
  check('zonas de entrega', await supabase.from('delivery_zones').insert(
    DELIVERY_ZONES.map((z, i) => ({ store_id: storeId, ...z, is_active: true, sort_order: i }))
  ))
  check('cupons', await supabase.from('coupons').insert(
    COUPONS.map((c) => ({ store_id: storeId, ...c, is_active: true, uses: 0 }))
  ))
}

/** Pro vitalício e SEM cobrança: a demo não pode ser suspensa por fatura vencida. */
async function seedSubscription(supabase, storeId) {
  // Loja nova nasce suspensa e com a primeira fatura em aberto (trigger
  // `create_default_subscription`). Numa demo isso vira uma tarja de cobrança no
  // topo do painel durante a apresentação — cancela.
  check('cancela faturas da demo', await supabase
    .from('plan_invoices')
    .update({ status: 'canceled' })
    .eq('store_id', storeId)
    .in('status', ['open', 'overdue', 'awaiting_confirmation']))

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('store_id', storeId)
    .maybeSingle()

  const row = {
    store_id: storeId,
    plan: 'pro',
    status: 'active',
    billing_enabled: false,
    billing_status: 'current',
    next_due_date: null,
    suspended_at: null,
    updated_at: new Date().toISOString(),
  }

  if (existing) check('assinatura', await supabase.from('subscriptions').update(row).eq('id', existing.id))
  else check('assinatura', await supabase.from('subscriptions').insert(row))
}

async function main() {
  const supabase = adminClient()

  const imagesFile = resolve(ROOT, 'scripts/demo-images.json')
  const images = existsSync(imagesFile) ? JSON.parse(readFileSync(imagesFile, 'utf8')) : {}
  if (!Object.keys(images).length) {
    console.warn('⚠  scripts/demo-images.json não encontrado — o cardápio vai subir sem fotos.')
  }

  const userId = await ensureUser(supabase)
  console.log(`✓ usuário ${DEMO.email}`)

  const storeId = await ensureStore(supabase, userId, images)
  console.log(`✓ loja ${DEMO.storeName} (/loja/${DEMO.slug})`)

  await wipe(supabase, storeId)
  await seedSubscription(supabase, storeId)
  console.log('✓ plano Pro ativo, sem cobrança')

  const byKey = await seedMenu(supabase, storeId, images)
  console.log(`✓ ${CATEGORIES.length} categorias e ${Object.keys(byKey).length} produtos`)

  await seedExtras(supabase, storeId)
  console.log(`✓ ${DELIVERY_ZONES.length} bairros de entrega e ${COUPONS.length} cupons`)

  const orders = await seedOrders(supabase, storeId, byKey)
  console.log(`✓ ${orders} pedidos de exemplo`)

  console.log(`\nDemo pronta: ${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/loja/${DEMO.slug}`)
  console.log(`Login do painel: ${DEMO.email} / ${DEMO.password}`)
}

main().catch((err) => {
  console.error('\n✗', err.message)
  process.exit(1)
})

/* ══════════════════════════════════════════════════════
   DADOS DO CARDÁPIO
   Fonte: cardápio real do Bom Sabor Mini Salgados em
   app.cardapioweb.com/bomsaborminisalgados — raspado via
   FireCrawl em 21/06/2026. Fotos: Unsplash (CC0).
   A loja não possui fotos de produtos cadastradas no site.
══════════════════════════════════════════════════════ */

// Unsplash CDN helper
const U = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=400&q=80`;

const MENU_DATA = [
  {
    id: 'mini-salgados',
    label: 'Mini Salgados',
    emoji: '🥟',
    products: [
      {
        id: 2,
        name: 'Cento de Mini Salgados – 100 Unidades',
        desc: 'Nossa deliciosa massa de batata, sequinha e crocante. 100 unidades à sua escolha.',
        price: 44.99, emoji: '🥟',
        img: 'assets/img/fotos_produtos/Cento_de_Mini_Salgados_-_100_Unidades.png',
        available: true,
      },
    ],
  },
  {
    id: 'mini-pasteis',
    label: 'Mini Pastéis',
    emoji: '🥙',
    products: [
      {
        id: 5,
        name: '100 Mini Pastéis',
        desc: 'Mini pastéis crocantes e dourados, 100 unidades à sua escolha de sabor.',
        price: 49.99, emoji: '🥙',
        img: 'assets/img/fotos_produtos/100_Mini_Pasteis.png',
        available: true,
      },
    ],
  },
  {
    id: 'pasteis',
    label: 'Pastel',
    emoji: '🫓',
    products: [
      {
        id: 10,
        name: 'Pastel Salgado',
        desc: 'Pastel frito na hora, crocante e recheado. A partir de 1 sabor salgado.',
        price: 10.00, emoji: '🫓',
        img: 'assets/img/fotos_produtos/Pastel_Salgado.png',
        available: true,
      },
    ],
  },
];

const ORDER_MINIMUM = 20;
const WHATSAPP_NUMBER = '5519996952066'; // (19) 99695-2066 — Bom Sabor Mini Salgados

/* ══════════════════════════════════════════════════════
   DADOS DOS PEDIDOS (KANBAN)
══════════════════════════════════════════════════════ */
const COLUMNS = [
  { id: 'novo',      label: 'Novos',      dot: 'dot-pending', next: 'Iniciar Preparo' },
  { id: 'preparando',label: 'Preparando', dot: 'dot-prep',    next: 'Marcar Pronto' },
  { id: 'pronto',    label: 'Pronto',     dot: 'dot-ready',   next: 'Concluir' },
  { id: 'concluido', label: 'Concluídos', dot: 'dot-done',    next: null },
];

let orders = [
  { id: '#535', client: 'Fernanda Lima',   items: '50 coxinhas + 30 bolinhas',     time: 'há 3 min',     price: 35.00, type: 'retirada', status: 0 },
  { id: '#536', client: 'Carlos Eduardo',  items: 'Combo Cento + Refri',           time: 'há 1 min',     price: 49.90, type: 'entrega',  status: 0 },
  { id: '#514', client: 'Alexandra St.',   items: 'Agendado 22:00 – 22:30',        time: '⚠️ 26h 28min', price: 68.00, type: 'entrega',  status: 1, highlight: true },
  { id: '#530', client: 'João Pedro',      items: '80 mini salgados mix',           time: 'há 18 min',    price: 40.00, type: 'retirada', status: 1 },
  { id: '#531', client: 'Beatriz Souza',   items: '50 mini pastéis pizza',          time: 'há 12 min',    price: 55.00, type: 'entrega',  status: 1 },
  { id: '#532', client: 'Marcos Vinícius', items: '30 coxinhas + 20 quibes',        time: 'há 5 min',     price: 28.00, type: 'retirada', status: 2 },
  { id: '#533', client: 'Matheus',         items: '50 Mini Salgados – Coxinha',     time: '17h 40min',    price: 23.00, type: 'retirada', status: 3 },
  { id: '#528', client: 'Patrícia Alves',  items: 'Combo Cento + Refri',           time: 'há 2h',        price: 49.90, type: 'entrega',  status: 3 },
];

/* ══════════════════════════════════════════════════════
   ESTADO DO CARRINHO
══════════════════════════════════════════════════════ */
let cart = []; // [{ id, name, emoji, price, qty }]

/* ══════════════════════════════════════════════════════
   UTILITÁRIOS
══════════════════════════════════════════════════════ */
function fmt(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

function cartTotal() {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function cartTotalItems() {
  return cart.reduce((s, i) => s + i.qty, 0);
}

/* ══════════════════════════════════════════════════════
   CARRINHO — LÓGICA
══════════════════════════════════════════════════════ */
function addToCart(productId) {
  const product = MENU_DATA.flatMap(c => c.products).find(p => p.id === productId);
  if (!product || !product.available) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: product.id, name: product.name, emoji: product.emoji, price: product.price, qty: 1 });
  }
  updateCartUI();
  refreshProductControls(productId);
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }
  updateCartUI();
  refreshProductControls(productId);
}

function updateCartUI() {
  updateFab();
  renderCartDrawer();
}

function updateFab() {
  const fab     = document.getElementById('cartFab');
  const countEl = document.getElementById('cartCount');
  const totalEl = document.getElementById('cartFabTotal');
  const total   = cartTotalItems();

  if (total === 0) {
    fab.classList.add('hidden');
  } else {
    fab.classList.remove('hidden');
    countEl.textContent = total + (total === 1 ? ' item' : ' itens');
    totalEl.textContent = fmt(cartTotal());
  }
}

function renderCartDrawer() {
  const itemsEl  = document.getElementById('cartItems');
  const emptyEl  = document.getElementById('cartEmpty');
  const footerEl = document.getElementById('cartFooter');
  const subtotal = document.getElementById('cartSubtotal');
  const minimum  = document.getElementById('cartMinimum');
  const checkout = document.getElementById('checkoutBtn');

  if (cart.length === 0) {
    itemsEl.innerHTML = '';
    itemsEl.style.display = 'none';
    emptyEl.style.display = 'flex';
    footerEl.style.display = 'none';
    return;
  }

  itemsEl.style.display = 'flex';
  emptyEl.style.display = 'none';
  footerEl.style.display = 'flex';

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span class="cart-item-emoji">${item.emoji}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-unit">${fmt(item.price)} / un.</div>
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
        <span class="cart-qty-num">${item.qty}</span>
        <button class="cart-qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
      </div>
      <span class="cart-item-total">${fmt(item.price * item.qty)}</span>
    </div>
  `).join('');

  const total = cartTotal();
  subtotal.textContent = fmt(total);

  if (total < ORDER_MINIMUM) {
    const diff = ORDER_MINIMUM - total;
    minimum.textContent = `Faltam ${fmt(diff)} para o pedido mínimo`;
    checkout.disabled = true;
  } else {
    minimum.textContent = '';
    checkout.disabled = false;
  }
}

/* Atualiza o botão + do card para controles de quantidade quando item está no carrinho */
function refreshProductControls(productId) {
  const el = document.getElementById('product-footer-' + productId);
  if (!el) return;

  const item = cart.find(i => i.id === productId);
  if (item) {
    el.innerHTML = `
      <div class="product-price">${fmt(item.price)}</div>
      <div class="qty-controls">
        <button class="qty-ctrl-btn" onclick="changeQty(${productId}, -1)">−</button>
        <span class="qty-display">${item.qty}</span>
        <button class="qty-ctrl-btn" onclick="changeQty(${productId}, 1)">+</button>
      </div>
    `;
  } else {
    const product = MENU_DATA.flatMap(c => c.products).find(p => p.id === productId);
    el.innerHTML = `
      <div class="product-price">${fmt(product.price)}</div>
      <button class="add-btn" onclick="addToCart(${productId})">+</button>
    `;
  }
}

function openCart() {
  renderCartDrawer();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function checkout() {
  const lines = cart.map(i => `• ${i.qty}x ${i.name} = ${fmt(i.price * i.qty)}`).join('\n');
  const msg = `Olá! Gostaria de fazer um pedido:\n\n${lines}\n\n*Total: ${fmt(cartTotal())}*`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ══════════════════════════════════════════════════════
   RENDERIZAÇÃO DO CARDÁPIO
══════════════════════════════════════════════════════ */
function renderMenu() {
  const nav  = document.getElementById('menuNav');
  const body = document.getElementById('menuBody');

  nav.innerHTML = MENU_DATA.map((cat, i) => `
    <div class="menu-nav-item${i === 0 ? ' active' : ''}"
         data-cat="${cat.id}"
         onclick="scrollToSection('${cat.id}')">
      ${cat.emoji} ${cat.label}
    </div>
  `).join('');

  body.innerHTML = MENU_DATA.map(cat => `
    <section class="menu-section" id="section-${cat.id}">
      <div class="section-label">${cat.emoji} ${cat.label}</div>
      <div class="products-grid">
        ${cat.products.map(p => renderProductCard(p)).join('')}
      </div>
    </section>
  `).join('');

  setupSectionObserver();
}

function imgFallback(el, emoji) {
  const span = document.createElement('span');
  span.className = 'p-emoji';
  span.textContent = emoji;
  el.parentNode.replaceChild(span, el);
}

function renderProductCard(p) {
  const imgContent = p.img
    ? `<img src="${p.img}" alt="${p.name}" loading="lazy" onerror="imgFallback(this,'${p.emoji}')">`
    : `<span class="p-emoji">${p.emoji}</span>`;

  const footer = `
    <div class="product-price">${fmt(p.price)}</div>
    <button class="add-btn"${p.available ? '' : ' disabled'} onclick="addToCart(${p.id})">+</button>
  `;

  return `
    <div class="product-card${p.available ? '' : ' out-of-stock'}">
      ${p.available ? '' : '<div class="tag-em-falta">Em falta</div>'}
      <div class="product-img">${imgContent}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-footer" id="product-footer-${p.id}">${footer}</div>
      </div>
    </div>
  `;
}

/* Destaca a categoria ativa ao rolar */
function setupSectionObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id.replace('section-', '');
        document.querySelectorAll('.menu-nav-item').forEach(item => {
          item.classList.toggle('active', item.dataset.cat === id);
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });

  document.querySelectorAll('.menu-section').forEach(s => observer.observe(s));
}

function scrollToSection(id) {
  const el = document.getElementById('section-' + id);
  if (!el) return;
  const offset = el.getBoundingClientRect().top + window.scrollY - 110;
  window.scrollTo({ top: offset, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════════════
   KANBAN — RENDERIZAÇÃO
══════════════════════════════════════════════════════ */
function renderKanban() {
  const kanban = document.getElementById('kanban');

  kanban.innerHTML = COLUMNS.map(col => {
    const colOrders = orders.filter(o => o.status === COLUMNS.indexOf(col));
    return `
      <div class="kanban-col">
        <div class="kanban-header">
          <div class="kanban-title">
            <span class="status-dot ${col.dot}"></span> ${col.label}
          </div>
          <span class="kanban-count">${colOrders.length}</span>
        </div>
        <div class="kanban-body">
          ${colOrders.map(o => renderOrderCard(o, col)).join('')}
        </div>
      </div>
    `;
  }).join('');

  updateKanbanStats();
  renderHistoryTable();
}

function renderOrderCard(order, col) {
  const badge = order.type === 'retirada'
    ? '<span class="order-type-badge badge-retirada">Retirada</span>'
    : '<span class="order-type-badge badge-entrega">Entrega</span>';

  const advanceBtn = col.next
    ? `<button class="advance-btn" onclick="advanceOrder('${order.id}')">${col.next} →</button>`
    : '';

  const classes = ['order-card'];
  if (order.highlight) classes.push('highlighted');
  if (order.status === 3) classes.push('done-card');

  return `
    <div class="${classes.join(' ')}">
      <div class="order-card-top">
        <div class="order-num">${order.id}</div>
        <div class="order-time">${order.time}</div>
      </div>
      <div class="order-client">${order.client}</div>
      <div class="order-items">${order.items}</div>
      <div class="order-footer">
        <div class="order-price">${fmt(order.price)}</div>
        ${badge}
      </div>
      ${advanceBtn}
    </div>
  `;
}

function advanceOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (order && order.status < 3) {
    order.status++;
    order.highlight = false;
    renderKanban();
  }
}

function updateKanbanStats() {
  const prepCount = orders.filter(o => o.status === 1).length;
  const el = document.getElementById('statPrep');
  if (el) el.textContent = prepCount;
}

/* ══════════════════════════════════════════════════════
   TABELA DE HISTÓRICO
══════════════════════════════════════════════════════ */
function renderHistoryTable() {
  const body = document.getElementById('historyBody');
  const shown = [...orders].reverse().slice(0, 8);

  const statusMap = {
    0: '<span class="status-pill pill-prep">● Novo</span>',
    1: '<span class="status-pill pill-prep">● Preparando</span>',
    2: '<span class="status-pill pill-prep">● Pronto</span>',
    3: '<span class="status-pill pill-done">● Concluído</span>',
  };

  body.innerHTML = shown.map(o => `
    <tr>
      <td class="td-num">${o.id}</td>
      <td>${o.client}</td>
      <td>${o.items}</td>
      <td>${o.type === 'retirada'
        ? '<span class="order-type-badge badge-retirada">Retirada</span>'
        : '<span class="order-type-badge badge-entrega">Entrega</span>'}</td>
      <td class="td-price">${fmt(o.price)}</td>
      <td>${statusMap[o.status]}</td>
    </tr>
  `).join('');
}

/* ══════════════════════════════════════════════════════
   TOGGLE DE VIEW
══════════════════════════════════════════════════════ */
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewId).classList.add('active');

  document.querySelectorAll('.mode-toggle button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });

  // FAB do carrinho só aparece no cardápio
  const fab = document.getElementById('cartFab');
  if (viewId === 'menu') {
    updateFab();
  } else {
    fab.classList.add('hidden');
  }

  // Fecha drawer se aberto
  closeCart();
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  renderKanban();

  // Toggle de view
  document.querySelectorAll('.mode-toggle button').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // Abrir/fechar carrinho
  document.getElementById('cartFab').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('checkoutBtn').addEventListener('click', checkout);

  // Fechar drawer com Esc
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCart();
  });

  // Nav do sidebar — troca de painéis
  document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
    item.addEventListener('click', () => switchPanel(item.dataset.panel));
  });
});

/* ══════════════════════════════════════════
   NAVEGAÇÃO DE PAINÉIS
══════════════════════════════════════════ */
const PANELS = ['pedidos','cardapio','desempenho','caixa','loja','notificacoes','links'];

function switchPanel(id) {
  document.querySelectorAll('.nav-item[data-panel]').forEach(el =>
    el.classList.toggle('active', el.dataset.panel === id)
  );
  PANELS.forEach(p => {
    const el = document.getElementById('panel-' + p);
    if (el) el.hidden = (p !== id);
  });
  const panel = document.getElementById('panel-' + id);
  if (panel && !panel.dataset.rendered && id !== 'pedidos') {
    renderPanel(id, panel);
    panel.dataset.rendered = '1';
  }
}

function renderPanel(id, el) {
  const renders = {
    cardapio:     renderCardapioPanel,
    desempenho:   renderDesempenhoPanel,
    caixa:        renderCaixaPanel,
    loja:         renderLojaPanel,
    notificacoes: renderNotificacoesPanel,
    links:        renderLinksPanel,
  };
  if (renders[id]) renders[id](el);
}

/* ── Cardápio ── */
function renderCardapioPanel(el) {
  const products = MENU_DATA.flatMap(cat =>
    cat.products.map(p => ({ ...p, catLabel: cat.label }))
  );
  el.innerHTML = `
    <div class="dash-header">
      <div class="dash-title">Cardápio</div>
      <span style="font-size:13px;color:var(--muted)">${products.length} produto${products.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="settings-card">
      ${products.map(p => `
        <div class="cardapio-item" id="ci-${p.id}">
          <img class="ci-thumb" src="${p.img || ''}" alt="${p.name}"
            onerror="this.style.display='none'"
            style="${p.img ? '' : 'display:none'}">
          <span class="ci-emoji" style="${p.img ? 'display:none' : ''}">${p.emoji}</span>
          <div class="ci-info">
            <div class="ci-name">${p.name}</div>
            <div class="ci-cat">${p.catLabel}</div>
          </div>
          <div class="ci-price">R$ ${p.price.toFixed(2).replace('.',',')}</div>
          <label class="toggle-switch">
            <input type="checkbox" ${p.available ? 'checked' : ''}
              onchange="toggleProductAvail(${p.id}, this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      `).join('')}
    </div>`;
}

function toggleProductAvail(id, val) {
  for (const cat of MENU_DATA) {
    const p = cat.products.find(p => p.id === id);
    if (p) { p.available = val; break; }
  }
  showToast(val ? 'Produto ativado' : 'Produto desativado');
  renderMenu();
}

/* ── Desempenho ── */
function renderDesempenhoPanel(el) {
  const week = [
    { day:'Seg', val:120 }, { day:'Ter', val:210 },
    { day:'Qua', val:175 }, { day:'Qui', val:305 },
    { day:'Sex', val:412 }, { day:'Sáb', val:548 }, { day:'Dom', val:350 },
  ];
  const max = Math.max(...week.map(d => d.val));
  el.innerHTML = `
    <div class="dash-header"><div class="dash-title">Desempenho</div></div>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Faturamento semanal</div>
        <div class="stat-value">R$ 2.120</div>
        <div class="stat-sub"><span class="stat-up">↑ 18%</span> vs semana passada</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pedidos no período</div>
        <div class="stat-value">48</div>
        <div class="stat-sub"><span class="stat-up">↑ 6</span> vs semana passada</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ticket médio</div>
        <div class="stat-value">R$ 44</div>
        <div class="stat-sub"><span class="stat-up">↑ 4%</span> vs semana passada</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Taxa de retorno</div>
        <div class="stat-value">68%</div>
        <div class="stat-sub">clientes voltando</div>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-section-title">Faturamento — últimos 7 dias</div>
      <div class="bar-chart">
        ${week.map(d => `
          <div class="bar-col">
            <div class="bar-val">R$&nbsp;${d.val}</div>
            <div class="bar-wrap">
              <div class="bar-fill" style="height:${Math.round(d.val/max*100)}%"></div>
            </div>
            <div class="bar-day">${d.day}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ── Caixa ── */
function renderCaixaPanel(el) {
  const movs = [
    { num:'#533', client:'Matheus',  pay:'Pix',      val:23.00 },
    { num:'#532', client:'Ana Paula',pay:'Cartão',   val:49.90 },
    { num:'#531', client:'Roberto',  pay:'Pix',      val:44.99 },
    { num:'#530', client:'Fernanda', pay:'Dinheiro', val:25.00 },
    { num:'#529', client:'Carlos',   pay:'Pix',      val:49.99 },
  ];
  const total = movs.reduce((s,o) => s + o.val, 0);
  el.innerHTML = `
    <div class="dash-header">
      <div class="dash-title">Caixa</div>
      <button class="new-order-btn" style="background:var(--green);box-shadow:0 2px 10px rgba(5,150,105,.3)"
        onclick="showToast('Caixa fechado!')">Fechar Caixa</button>
    </div>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Entradas hoje</div>
        <div class="stat-value" style="color:var(--green)">R$ ${total.toFixed(2).replace('.',',')}</div>
        <div class="stat-sub">${movs.length} pedidos pagos</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pix</div>
        <div class="stat-value">R$ 337,98</div>
        <div class="stat-sub">3 transações</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cartão</div>
        <div class="stat-value">R$ 49,90</div>
        <div class="stat-sub">1 transação</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Dinheiro</div>
        <div class="stat-value">R$ 25,00</div>
        <div class="stat-sub">1 transação</div>
      </div>
    </div>
    <div class="history-table">
      <div class="history-header"><div class="history-title">Movimentações de hoje</div></div>
      <table>
        <thead><tr><th>Pedido</th><th>Cliente</th><th>Forma</th><th>Valor</th></tr></thead>
        <tbody>
          ${movs.map(o => `
            <tr>
              <td class="td-num">${o.num}</td>
              <td>${o.client}</td>
              <td><span class="status-pill pill-done">${o.pay}</span></td>
              <td class="td-price">R$ ${o.val.toFixed(2).replace('.',',')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ── Minha Loja ── */
function renderLojaPanel(el) {
  el.innerHTML = `
    <div class="dash-header"><div class="dash-title">Minha Loja</div></div>
    <div class="settings-card">
      <div class="settings-section-title">Informações básicas</div>
      <div class="form-group">
        <label class="form-label">Nome da loja</label>
        <input class="form-input" type="text" value="Bom Sabor Mini Salgados">
      </div>
      <div class="form-group">
        <label class="form-label">Endereço</label>
        <input class="form-input" type="text" value="R. João de Oliveira Machado, 454 · Jardim Ypê I · Mogi Guaçu">
      </div>
      <div class="form-group">
        <label class="form-label">WhatsApp</label>
        <input class="form-input" type="text" value="(19) 99695-2066">
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-section-title">Horário de funcionamento</div>
      <div class="form-group">
        <label class="form-label">Dias</label>
        <input class="form-input" type="text" value="Terça a Domingo">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Abre às</label>
          <input class="form-input" type="time" value="15:00">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha às</label>
          <input class="form-input" type="time" value="21:00">
        </div>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-section-title">Status</div>
      <div class="toggle-row">
        <div><div class="toggle-label">Loja aberta</div><div class="toggle-desc">Clientes podem fazer pedidos agora</div></div>
        <label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label>
      </div>
      <div class="toggle-row">
        <div><div class="toggle-label">Aceitar agendamentos</div><div class="toggle-desc">Permitir pedidos para datas futuras</div></div>
        <label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label>
      </div>
    </div>
    <button class="save-btn" onclick="showToast('Alterações salvas com sucesso!')">Salvar alterações</button>`;
}

/* ── Notificações ── */
function renderNotificacoesPanel(el) {
  const items = [
    { label:'Novo pedido recebido',      desc:'Notificar quando chegar um novo pedido', on:true  },
    { label:'Pedido em atraso',           desc:'Alertar quando pedido passar do tempo estimado', on:true  },
    { label:'Cancelamento de pedido',     desc:'Notificar quando cliente cancelar', on:false },
    { label:'Som de notificação',         desc:'Tocar áudio ao receber novo pedido', on:true  },
    { label:'Resumo diário via WhatsApp', desc:'Receber resumo no fim do dia', on:false },
  ];
  el.innerHTML = `
    <div class="dash-header"><div class="dash-title">Notificações</div></div>
    <div class="settings-card">
      <div class="settings-section-title">Preferências</div>
      ${items.map(i => `
        <div class="toggle-row">
          <div><div class="toggle-label">${i.label}</div><div class="toggle-desc">${i.desc}</div></div>
          <label class="toggle-switch">
            <input type="checkbox" ${i.on ? 'checked' : ''} onchange="showToast('Preferência salva')">
            <span class="toggle-slider"></span>
          </label>
        </div>`).join('')}
    </div>`;
}

/* ── Meus Links ── */
function renderLinksPanel(el) {
  const menuUrl = 'https://app.cardapioweb.com/bomsaborminisalgados';
  const waUrl   = 'https://wa.me/5519996952066';
  el.innerHTML = `
    <div class="dash-header"><div class="dash-title">Meus Links</div></div>
    <div class="settings-card">
      <div class="settings-section-title">Link do cardápio público</div>
      <div class="link-row">
        <input class="form-input" type="text" value="${menuUrl}" readonly id="link-menu">
        <button class="copy-btn" onclick="copyText('link-menu','Link copiado!')">Copiar</button>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-top:8px">Compartilhe com seus clientes nas redes sociais</p>
    </div>
    <div class="settings-card">
      <div class="settings-section-title">Link do WhatsApp</div>
      <div class="link-row">
        <input class="form-input" type="text" value="${waUrl}" readonly id="link-wa">
        <button class="copy-btn" onclick="copyText('link-wa','Link copiado!')">Copiar</button>
      </div>
    </div>
    <div class="settings-card" style="text-align:center">
      <div class="settings-section-title">QR Code do cardápio</div>
      <div class="qr-box">
        <div style="font-size:72px;line-height:1">📱</div>
        <p style="font-size:13px;color:var(--muted);margin-top:12px">Disponível na versão completa</p>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════
   UTILIDADES DOS PAINÉIS
══════════════════════════════════════════ */
function copyText(inputId, msg) {
  const val = document.getElementById(inputId).value;
  navigator.clipboard.writeText(val).then(() => showToast(msg));
}

function showToast(msg) {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'toast';
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-in'));
  setTimeout(() => {
    t.classList.remove('toast-in');
    setTimeout(() => t.remove(), 300);
  }, 2200);
}

'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentStore } from '@/lib/store'
import { NfeError, parseNfeXml } from '@/lib/stock/nfe'
import { UNIT_VALUES, cleanItemName, guessFromLine, parseDecimal, suggestConversion } from '@/lib/stock/format'

// Todas devolvem { ok: true, ... } ou { ok: false, error } — a tela mostra o
// erro num toast. RLS garante que cada loja só toca nos próprios registros;
// o store_id vem sempre da sessão, nunca do formulário.

const PATH = '/dashboard/estoque'
const fail = (error) => ({ ok: false, error })
const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max)

function friendly(error, fallback) {
  const msg = error?.message || ''
  if (error?.code === '23505') return 'Já existe um registro com esse nome ou número.'
  if (msg && !/violates|relation|column|syntax|permission/i.test(msg)) return msg
  return fallback
}

// ── Insumos ─────────────────────────────────────────────────
export async function saveStockItem(input) {
  const { supabase, store } = await getCurrentStore()
  const name = clean(input?.name, 120)
  const unit = String(input?.unit || 'un')
  const min = parseDecimal(input?.minQuantity ?? 0)
  if (!name) return fail('Dê um nome ao insumo.')
  if (!UNIT_VALUES.includes(unit)) return fail('Unidade inválida.')
  if (!(min >= 0)) return fail('Estoque mínimo inválido.')

  if (input?.id) {
    const { error } = await supabase
      .from('stock_items')
      .update({ name, unit, min_quantity: min })
      .eq('id', input.id)
      .eq('store_id', store.id)
    if (error) return fail(friendly(error, 'Não foi possível salvar o insumo.'))
    revalidatePath(PATH)
    return { ok: true, id: input.id }
  }

  const { data, error } = await supabase
    .from('stock_items')
    .insert({ store_id: store.id, name, unit, min_quantity: min })
    .select('id')
    .single()
  if (error) return fail(friendly(error, 'Não foi possível criar o insumo.'))

  // Saldo inicial entra como movimentação, pra ficar no histórico.
  const initial = parseDecimal(input?.initialQuantity ?? 0)
  const cost = parseDecimal(input?.unitCost ?? '')
  if (initial > 0) {
    await supabase.from('stock_movements').insert({
      store_id: store.id,
      item_id: data.id,
      kind: 'entrada',
      quantity: initial,
      unit_cost_cents: cost >= 0 ? Math.round(cost * 100 * 10000) / 10000 : null,
      note: 'Saldo inicial',
    })
  }
  revalidatePath(PATH)
  return { ok: true, id: data.id }
}

export async function setStockItemActive(id, active) {
  const { supabase, store } = await getCurrentStore()
  const { error } = await supabase
    .from('stock_items')
    .update({ is_active: Boolean(active) })
    .eq('id', id)
    .eq('store_id', store.id)
  if (error) return fail('Não foi possível atualizar o insumo.')
  revalidatePath(PATH)
  return { ok: true }
}

/**
 * Movimentação manual. `kind`:
 *   entrada  — compra sem nota, com custo opcional (atualiza o custo médio)
 *   saida    — uso fora da ficha técnica
 *   perda    — vencido, quebrado, descartado
 *   contagem — o lojista informa quanto TEM; vira um ajuste da diferença
 */
export async function moveStock(input) {
  const { supabase, store } = await getCurrentStore()
  const kind = String(input?.kind || '')
  const qty = parseDecimal(input?.quantity)
  const note = clean(input?.note, 200) || null

  const { data: item } = await supabase
    .from('stock_items')
    .select('id, quantity')
    .eq('id', input?.itemId)
    .eq('store_id', store.id)
    .maybeSingle()
  if (!item) return fail('Insumo não encontrado.')

  let row
  if (kind === 'contagem') {
    if (!(qty >= 0)) return fail('Informe a quantidade contada.')
    const delta = Math.round((qty - Number(item.quantity)) * 1000) / 1000
    if (delta === 0) return { ok: true, unchanged: true }
    row = { kind: 'ajuste', quantity: delta, note: note || `Contagem: ${qty}` }
  } else {
    if (!(qty > 0)) return fail('Informe uma quantidade maior que zero.')
    if (kind === 'entrada') {
      const cost = parseDecimal(input?.unitCost ?? '')
      row = {
        kind,
        quantity: qty,
        unit_cost_cents: cost >= 0 ? Math.round(cost * 100 * 10000) / 10000 : null,
        note,
      }
    } else if (kind === 'saida' || kind === 'perda') {
      row = { kind, quantity: -qty, note }
    } else {
      return fail('Tipo de movimentação inválido.')
    }
  }

  const { error } = await supabase
    .from('stock_movements')
    .insert({ store_id: store.id, item_id: item.id, ...row })
  if (error) return fail(friendly(error, 'Não foi possível registrar a movimentação.'))
  revalidatePath(PATH)
  return { ok: true }
}

// ── Fornecedores ────────────────────────────────────────────
export async function saveSupplier(input) {
  const { supabase, store } = await getCurrentStore()
  const name = clean(input?.name, 160)
  const cnpj = String(input?.cnpj ?? '').replace(/\D/g, '') || null
  if (!name) return fail('Informe o nome do fornecedor.')
  if (cnpj && cnpj.length !== 14) return fail('O CNPJ precisa ter 14 dígitos.')

  const row = {
    name,
    cnpj,
    phone: clean(input?.phone, 40) || null,
    email: clean(input?.email, 160) || null,
    notes: clean(input?.notes, 500) || null,
  }
  const q = input?.id
    ? supabase.from('suppliers').update(row).eq('id', input.id).eq('store_id', store.id)
    : supabase.from('suppliers').insert({ store_id: store.id, ...row })
  const { error } = await q
  if (error) return fail(friendly(error, 'Não foi possível salvar o fornecedor.'))
  revalidatePath(PATH)
  return { ok: true }
}

export async function deleteSupplier(id) {
  const { supabase, store } = await getCurrentStore()
  const { error } = await supabase.from('suppliers').delete().eq('id', id).eq('store_id', store.id)
  if (error) return fail('Não foi possível remover o fornecedor.')
  revalidatePath(PATH)
  return { ok: true }
}

// ── Notas (NF-e por XML) ────────────────────────────────────
export async function importInvoiceXml(formData) {
  const { supabase, store } = await getCurrentStore()
  const file = formData.get('xml')
  if (!file || typeof file === 'string') return fail('Escolha o arquivo XML da nota.')
  if (file.size > 2 * 1024 * 1024) return fail('Arquivo grande demais para uma NF-e (máx. 2 MB).')

  let nfe
  try {
    nfe = parseNfeXml(await file.text())
  } catch (e) {
    return fail(e instanceof NfeError ? e.message : 'Não foi possível ler o arquivo.')
  }

  // Fornecedor: reaproveita pelo CNPJ ou cria.
  let supplierId = null
  if (nfe.supplier.cnpj) {
    const { data: found } = await supabase
      .from('suppliers')
      .select('id')
      .eq('store_id', store.id)
      .eq('cnpj', nfe.supplier.cnpj)
      .maybeSingle()
    if (found) supplierId = found.id
    else {
      const { data: created } = await supabase
        .from('suppliers')
        .insert({ store_id: store.id, name: nfe.supplier.name, cnpj: nfe.supplier.cnpj })
        .select('id')
        .single()
      supplierId = created?.id ?? null
    }
  }

  const { data: inv, error } = await supabase
    .from('purchase_invoices')
    .insert({
      store_id: store.id,
      supplier_id: supplierId,
      supplier_name: nfe.supplier.name,
      supplier_cnpj: nfe.supplier.cnpj,
      access_key: nfe.accessKey,
      number: nfe.number,
      series: nfe.series,
      issued_at: nfe.issuedAt,
      products_cents: nfe.productsCents,
      total_cents: nfe.totalCents,
      source: 'xml',
    })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return fail('Esta nota já foi importada.')
    return fail(friendly(error, 'Não foi possível importar a nota.'))
  }

  // Mapeamento automático: 1) o que a loja já ligou antes pra esse
  // fornecedor+código; 2) insumo com o mesmo nome da descrição.
  const [{ data: links }, { data: items }] = await Promise.all([
    nfe.supplier.cnpj
      ? supabase
          .from('supplier_item_links')
          .select('code, item_id, conversion')
          .eq('store_id', store.id)
          .eq('supplier_cnpj', nfe.supplier.cnpj)
      : Promise.resolve({ data: [] }),
    supabase.from('stock_items').select('id, name').eq('store_id', store.id).eq('is_active', true),
  ])
  const byCode = new Map((links ?? []).map((l) => [l.code, l]))
  const byName = new Map((items ?? []).map((i) => [i.name.trim().toLowerCase(), i.id]))

  const rows = nfe.items.map((it) => {
    const link = it.code ? byCode.get(it.code) : null
    return {
      invoice_id: inv.id,
      store_id: store.id,
      line: it.line,
      code: it.code,
      ean: it.ean,
      description: it.description,
      unit: it.unit,
      quantity: it.quantity,
      unit_price_cents: it.unitPriceCents,
      total_cents: it.totalCents,
      item_id: link?.item_id ?? byName.get(it.description.trim().toLowerCase()) ?? null,
      conversion: link?.conversion ?? 1,
    }
  })
  const { error: itemsError } = await supabase.from('purchase_invoice_items').insert(rows)
  if (itemsError) {
    await supabase.from('purchase_invoices').delete().eq('id', inv.id)
    return fail('Não foi possível importar os itens da nota.')
  }

  revalidatePath(PATH)
  return { ok: true, id: inv.id, mapped: rows.filter((r) => r.item_id).length, total: rows.length }
}

/** Salva o mapeamento de uma linha da nota (insumo, conversão, ignorar). */
export async function updateInvoiceLine(lineId, input) {
  const { supabase, store } = await getCurrentStore()
  const patch = {}
  if ('itemId' in input) patch.item_id = input.itemId || null
  if ('ignored' in input) patch.ignored = Boolean(input.ignored)
  if ('conversion' in input) {
    const c = parseDecimal(input.conversion)
    if (!(c > 0)) return fail('A conversão precisa ser maior que zero.')
    patch.conversion = c
  }
  const { error } = await supabase
    .from('purchase_invoice_items')
    .update(patch)
    .eq('id', lineId)
    .eq('store_id', store.id)
  if (error) return fail('Não foi possível salvar o item.')
  return { ok: true }
}

/** Cria um insumo a partir de uma linha da nota e já liga a linha a ele. */
export async function createItemFromLine(lineId, input) {
  const res = await saveStockItem({ name: input?.name, unit: input?.unit, minQuantity: 0 })
  if (!res.ok) return res
  const conversion = parseDecimal(input?.conversion ?? 1)
  const link = await updateInvoiceLine(lineId, { itemId: res.id, ...(conversion > 0 ? { conversion } : {}) })
  if (!link.ok) return link
  return { ok: true, id: res.id }
}

/**
 * Um clique: cria (ou reaproveita, pelo nome) os insumos de todos os itens da
 * nota que ainda não estão ligados, já com unidade e conversão sugeridas
 * ("PÃO BRIOCHE PCT 12UN" → insumo "Pão brioche" em un, 1 PCT = 12 un).
 */
export async function createMissingItems(invoiceId) {
  const { supabase, store } = await getCurrentStore()
  const { data: inv } = await supabase
    .from('purchase_invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .eq('store_id', store.id)
    .maybeSingle()
  if (!inv) return fail('Nota não encontrada.')
  if (inv.status !== 'pendente') return fail('Esta nota já foi lançada ou descartada.')

  const [{ data: lines }, { data: existing }] = await Promise.all([
    supabase
      .from('purchase_invoice_items')
      .select('id, description, unit, item_id, ignored')
      .eq('invoice_id', inv.id)
      .eq('store_id', store.id)
      .order('line'),
    supabase.from('stock_items').select('id, name, unit').eq('store_id', store.id),
  ])
  const byName = new Map((existing ?? []).map((i) => [i.name.trim().toLowerCase(), i]))
  const updatedLines = []
  const newItems = []

  for (const l of lines ?? []) {
    if (l.ignored || l.item_id) continue
    const name = cleanItemName(l.description)
    let item = byName.get(name.toLowerCase())
    let conversion = 1
    if (item) {
      conversion = suggestConversion(l.unit, item.unit, l.description) ?? 1
    } else {
      const guess = guessFromLine(l.description, l.unit)
      const { data: created, error } = await supabase
        .from('stock_items')
        .insert({ store_id: store.id, name, unit: guess.unit })
        .select('id, name, unit')
        .single()
      if (error) return fail(friendly(error, `Não foi possível criar "${name}".`))
      item = created
      byName.set(name.toLowerCase(), item)
      newItems.push({ ...created, quantity: 0, avg_cost_cents: 0, is_active: true })
      conversion = guess.conversion
    }
    const { error: linkError } = await supabase
      .from('purchase_invoice_items')
      .update({ item_id: item.id, conversion })
      .eq('id', l.id)
      .eq('store_id', store.id)
    if (linkError) return fail('Não foi possível ligar os itens da nota.')
    updatedLines.push({ id: l.id, item_id: item.id, conversion })
  }

  revalidatePath(PATH)
  return { ok: true, lines: updatedLines, items: newItems }
}

export async function launchInvoice(invoiceId) {
  const { supabase } = await getCurrentStore()
  const { data, error } = await supabase.rpc('launch_purchase_invoice', { p_invoice_id: invoiceId })
  if (error) return fail(friendly(error, 'Não foi possível lançar a nota.'))
  revalidatePath(PATH)
  return { ok: true, count: data }
}

export async function discardInvoice(invoiceId) {
  const { supabase, store } = await getCurrentStore()
  const { error } = await supabase
    .from('purchase_invoices')
    .update({ status: 'descartada' })
    .eq('id', invoiceId)
    .eq('store_id', store.id)
    .eq('status', 'pendente')
  if (error) return fail('Não foi possível descartar a nota.')
  revalidatePath(PATH)
  return { ok: true }
}

export async function ackCostAlert(lineId) {
  const { supabase, store } = await getCurrentStore()
  const { error } = await supabase
    .from('purchase_invoice_items')
    .update({ cost_alert_ack: true })
    .eq('id', lineId)
    .eq('store_id', store.id)
  if (error) return fail('Não foi possível marcar como ciente.')
  revalidatePath(PATH)
  return { ok: true }
}

// ── Ficha técnica ───────────────────────────────────────────
/**
 * Substitui a ficha técnica de um produto (ou de um adicional).
 * rows: [{ itemId, quantity }]
 */
export async function saveRecipe(target, rows) {
  const { supabase, store } = await getCurrentStore()
  const key = target?.optionId ? 'option_id' : 'product_id'
  const id = target?.optionId || target?.productId
  if (!id) return fail('Escolha um produto.')

  const table = key === 'option_id' ? 'product_options' : 'products'
  const { data: owner } = await supabase.from(table).select('id').eq('id', id).eq('store_id', store.id).maybeSingle()
  if (!owner) return fail('Produto não encontrado.')

  const recipeRows = []
  const seen = new Set()
  for (const r of rows ?? []) {
    const q = parseDecimal(r?.quantity)
    if (!r?.itemId) continue
    if (!(q > 0)) return fail('Toda quantidade da ficha precisa ser maior que zero.')
    if (seen.has(r.itemId)) return fail('O mesmo insumo aparece duas vezes na ficha.')
    seen.add(r.itemId)
    recipeRows.push({ store_id: store.id, [key]: id, item_id: r.itemId, quantity: q })
  }

  const { error: delError } = await supabase.from('product_recipe_items').delete().eq(key, id).eq('store_id', store.id)
  if (delError) return fail('Não foi possível salvar a ficha técnica.')
  if (recipeRows.length) {
    const { error } = await supabase.from('product_recipe_items').insert(recipeRows)
    if (error) return fail(friendly(error, 'Não foi possível salvar a ficha técnica.'))
  }
  revalidatePath(PATH)
  return { ok: true }
}

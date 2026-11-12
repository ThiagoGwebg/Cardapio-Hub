'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowRight, BellRing, Check, ChevronDown, ClipboardList, FileUp, Package, ShoppingBag } from 'lucide-react'
import { BalanceVisual, SaleVisual } from './visuals'

// Guia "Como funciona o estoque": o caminho inteiro em 5 passos, cada um com
// a situação real da loja. Recolhível; a escolha fica no navegador.

const KEY = 'cardapio-stock-guide'
const listeners = new Set()
function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function readPref() {
  try { return localStorage.getItem(KEY) } catch { return null }
}
function writePref(v) {
  try { localStorage.setItem(KEY, v) } catch { /* sem storage: só não lembra */ }
  listeners.forEach((cb) => cb())
}

export default function StockGuide({ status }) {
  const steps = [
    {
      Icon: Package,
      title: 'Cadastre os insumos',
      text: 'Tudo o que você compra para produzir: pão, carne, queijo, embalagem. Escolha a unidade em que conta cada um.',
      done: status.items > 0,
      detail: status.items > 0 ? `${status.items} cadastrado${status.items === 1 ? '' : 's'}` : null,
      href: '/dashboard/estoque',
      cta: 'Cadastrar insumos',
    },
    {
      Icon: FileUp,
      title: 'Dê entrada nas compras',
      text: 'Importe o XML da nota fiscal (ou registre à mão em Atualizar). O saldo sobe e o custo médio é calculado.',
      done: status.entries > 0,
      detail: status.entries > 0 ? `${status.entries} entrada${status.entries === 1 ? '' : 's'}` : null,
      href: '/dashboard/estoque?tab=notas',
      cta: 'Importar uma nota',
    },
    {
      Icon: ClipboardList,
      title: 'Monte a ficha técnica',
      text: 'Diga quanto de cada insumo vai em 1 unidade de cada produto. É o que permite a baixa automática e o cálculo da margem.',
      done: status.productsWithRecipe > 0,
      detail: status.products > 0 ? `${status.productsWithRecipe} de ${status.products} produtos` : null,
      href: '/dashboard/estoque?tab=fichas',
      cta: 'Montar fichas',
    },
    {
      Icon: ShoppingBag,
      title: 'Venda: a baixa é sozinha',
      text: 'Quando o pedido entra em preparo (ou é concluído), os insumos da ficha saem do estoque. Cancelou? Eles voltam.',
      done: status.sales > 0,
      detail: status.sales > 0 ? `${status.sales} baixa${status.sales === 1 ? '' : 's'} automática${status.sales === 1 ? '' : 's'}` : null,
      href: '/dashboard/estoque?tab=movimentacoes&tipo=venda',
      cta: 'Ver as baixas',
    },
    {
      Icon: BellRing,
      title: 'Acompanhe os alertas',
      text: 'Defina o estoque mínimo dos insumos. Abaixo dele, e quando o custo de uma compra sobe 10% ou mais, aparece um aviso aqui no topo.',
      done: status.withMinimum > 0,
      detail: status.withMinimum > 0 ? `${status.withMinimum} com mínimo definido` : null,
      href: '/dashboard/estoque',
      cta: 'Definir mínimos',
    },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const nextIndex = steps.findIndex((s) => !s.done)

  // Aberto até a loja completar os 5 passos — depois começa recolhido.
  const pref = useSyncExternalStore(subscribe, readPref, () => null)
  const open = pref ? pref === 'open' : doneCount < steps.length

  return (
    <section className={`stk-guide ${open ? 'is-open' : ''}`} aria-labelledby="stk-guide-title">
      <button
        type="button"
        className="stk-guide-toggle"
        aria-expanded={open}
        aria-controls="stk-guide-body"
        onClick={() => writePref(open ? 'closed' : 'open')}
      >
        <span className="stk-guide-head">
          <span id="stk-guide-title" className="stk-guide-title">Como funciona o estoque</span>
          <span className="stk-guide-progress">
            <span className="stk-guide-bar" aria-hidden><span style={{ width: `${(doneCount / steps.length) * 100}%` }} /></span>
            {doneCount} de {steps.length} passos feitos
          </span>
        </span>
        <ChevronDown size={18} strokeWidth={2.2} className="stk-guide-chev" aria-hidden />
      </button>

      {open && (
        <div id="stk-guide-body" className="stk-guide-body">
          <ol className="stk-flow">
            {steps.map((s, i) => {
              const state = s.done ? 'done' : i === nextIndex ? 'next' : 'todo'
              return (
                <li key={s.title} className={`stk-flow-step is-${state}`}>
                  <span className="stk-flow-top">
                    <span className="stk-flow-num" aria-hidden>{s.done ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                    <span className="stk-flow-ico" aria-hidden><s.Icon size={18} strokeWidth={2} /></span>
                    {i < steps.length - 1 && <ArrowRight size={14} strokeWidth={2.2} className="stk-flow-arrow" aria-hidden />}
                  </span>
                  <span className="stk-flow-title">{s.title}</span>
                  <span className="stk-flow-text">{s.text}</span>
                  <span className="stk-flow-foot">
                    <span className={`stk-flow-state is-${state}`}>
                      {s.done ? (s.detail ?? 'Feito') : state === 'next' ? 'Próximo passo' : (s.detail ?? 'Pendente')}
                    </span>
                    {!s.done && (
                      <Link href={s.href} className="stk-flow-cta">
                        {s.cta} <ArrowRight size={13} strokeWidth={2.4} aria-hidden />
                      </Link>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="stk-guide-examples">
            <figure className="stk-guide-figure vx-on-light">
              <figcaption>O que acontece numa venda</figcaption>
              <SaleVisual />
            </figure>
            <figure className="stk-guide-figure vx-on-light">
              <figcaption>O que mexe no saldo</figcaption>
              <BalanceVisual />
            </figure>
          </div>
        </div>
      )}
    </section>
  )
}

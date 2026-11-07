import { headers } from 'next/headers'

import { CAMPO_ISCA, CAMPO_MONTADO_EM } from '@/lib/antispamCampos'

/**
 * Defesa em camadas contra envio automatizado nos dois formulários públicos
 * (lead da home e cadastro de entregador em /entregadores).
 *
 * Nenhuma camada resolve sozinha: a isca pega o robô que preenche todo input,
 * a armadilha de tempo pega o que posta instantaneamente, a checagem de
 * formato pega o lixo que passou pelas duas e o limite por IP segura a
 * enxurrada. Nenhuma delas pede nada ao lojista de verdade — sem captcha,
 * sem clique a mais.
 *
 * O que isto NÃO é: proteção criptográfica. Quem insistir, passa. Se o spam
 * continuar depois disto, o passo seguinte é Turnstile ou Vercel BotID na
 * frente do formulário, aí sim com custo de UX.
 */

// Reexportados para quem só importa este módulo; a definição mora no arquivo
// neutro porque os formulários (client) não podem puxar `next/headers`.
export { CAMPO_ISCA, CAMPO_MONTADO_EM } from "@/lib/antispamCampos"

const TEMPO_MINIMO_MS = 3000
const IDADE_MAXIMA_MS = 6 * 60 * 60 * 1000

const LIMITE_POR_IP = 3
const JANELA_IP_MS = 10 * 60 * 1000
const MAX_IPS_EM_MEMORIA = 5000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

const VOGAIS = new Set('aeiouyàáâãäéèêëíìîïóòôõöúùûü'.split(''))

/** Teto por campo: nada aqui precisa ser longo, e corta payload inflado. */
export const LIMITES = {
  name: 80,
  company: 120,
  email: 160,
  whatsapp: 32,
  city: 120,
  vehicle: 60,
  segment: 60,
  monthlyRevenue: 60,
  pixKeyType: 30,
  pixKey: 140,
  availability: 60,
}

/**
 * Heurística de "isso não é nome de gente" calibrada para português, com três
 * sinais e deliberadamente conservadora: falso positivo aqui custa um cliente
 * real, enquanto um spam a mais só custa uma linha no banco. Por isso roda só
 * sobre o nome, o campo mais previsivelmente humano.
 *
 * Os três sinais, contra as amostras que apareceram no painel:
 *  1. palavra de 4+ letras sem nenhuma vogal  -> "Hzjcnlf"
 *  2. 5+ consoantes seguidas                  -> "yrEshhpjeVJYVrYU" (shhpj)
 *  3. 8+ letras com menos de 20% de vogais    -> rede de segurança
 *
 * O limite de 5 consoantes tem folga: o pior caso do português fica em 3 ou 4
 * ("transtorno", "Schmidt"), então sobrenome de origem alemã não cai aqui.
 */
export function pareceAleatorio(texto) {
  const brutas = String(texto || '').split(/[\s.'-]+/)

  for (const bruta of brutas) {
    const palavra = bruta.toLowerCase()
    if (palavra.length < 4) continue
    if (!/^[a-zàáâãäéèêëíìîïóòôõöúùûüç]+$/.test(palavra)) continue

    const letras = palavra.split('')
    const vogais = letras.filter((c) => VOGAIS.has(c)).length

    // 1) Palavra sem nenhuma vogal: não existe em português.
    if (vogais === 0) return true

    // 2) Fila de consoantes. O pior caso do português fica em 3 ou 4
    //    ("transtorno", "Schmidt"), então 5 tem folga de sobra.
    let corrida = 0
    for (const c of letras) {
      corrida = VOGAIS.has(c) ? 0 : corrida + 1
      if (corrida >= 5) return true
    }

    // 3) Palavra longa com pouquíssima vogal — rede de segurança.
    if (letras.length >= 8 && vogais / letras.length < 0.2) return true

    // 4) Caixa embaralhada no meio da palavra. Nome de gente vem Capitalizado,
    //    todo minúsculo ou TODO MAIÚSCULO; "TMNuRkRYVrhewLUaMchED" alterna sem
    //    padrão nenhum. Exige 4+ trocas pra não pegar grafia legítima como
    //    "McDonald", que tem 3.
    if (bruta.length >= 8) {
      let trocas = 0
      for (let i = 1; i < bruta.length; i++) {
        const anterior = bruta[i - 1] === bruta[i - 1].toUpperCase()
        const atual = bruta[i] === bruta[i].toUpperCase()
        if (anterior !== atual) trocas++
      }
      if (trocas >= 4) return true
    }
  }

  return false
}

export function emailValido(email) {
  const e = String(email || '')
  return e.length <= LIMITES.email && EMAIL_RE.test(e)
}

/** Algum campo passou do teto declarado em LIMITES. */
export function campoLongoDemais(valores) {
  return Object.entries(valores).some(
    ([campo, valor]) => LIMITES[campo] && String(valor || '').length > LIMITES[campo]
  )
}

/**
 * Contagem por IP em memória do processo. Na Vercel cada instância tem a sua,
 * então isto segura rajada de uma origem só — não é um limite global exato.
 * Para valer entre instâncias precisaria de Redis/Upstash ou uma tabela no
 * Supabase; não vale a dependência enquanto a isca estiver dando conta.
 */
const acessos = new Map()

export function dentroDoLimite(chave) {
  const agora = Date.now()
  const recentes = (acessos.get(chave) || []).filter((t) => agora - t < JANELA_IP_MS)
  recentes.push(agora)
  acessos.set(chave, recentes)

  // Poda preguiçosa: sem isto o Map cresce para sempre numa instância quente.
  if (acessos.size > MAX_IPS_EM_MEMORIA) {
    for (const [k, ts] of acessos) {
      if (ts.every((t) => agora - t >= JANELA_IP_MS)) acessos.delete(k)
    }
  }

  return recentes.length <= LIMITE_POR_IP
}

export async function ipDoCliente() {
  const h = await headers()
  const encaminhado = h.get('x-forwarded-for') || ''
  return encaminhado.split(',')[0].trim() || h.get('x-real-ip') || 'desconhecido'
}

/**
 * Roda as camadas na ordem do mais barato para o mais caro e devolve `null`
 * quando o envio parece legítimo, ou `{ motivo, resposta }` para barrar.
 *
 * A isca responde `{ ok: true }` de propósito: o robô vê sucesso, não tenta
 * outra variação e nada entra no banco. As demais devolvem erro de verdade,
 * porque ali ainda pode ser gente que errou o e-mail ou clicou rápido demais.
 */
export async function checarEnvio(formData, valores) {
  if (String(formData.get(CAMPO_ISCA) || '').trim()) {
    return { motivo: 'isca preenchida', resposta: { ok: true } }
  }

  const montadoEm = Number(formData.get(CAMPO_MONTADO_EM) || 0)
  if (montadoEm > 0) {
    const decorrido = Date.now() - montadoEm
    if (decorrido < TEMPO_MINIMO_MS) {
      return {
        motivo: `preenchido em ${decorrido}ms`,
        resposta: { ok: false, error: 'Envio rápido demais. Confira os dados e tente de novo.' },
      }
    }
    if (decorrido > IDADE_MAXIMA_MS) {
      return {
        motivo: 'formulário velho',
        resposta: { ok: false, error: 'Esta página ficou muito tempo aberta. Recarregue e envie de novo.' },
      }
    }
  }

  if (!emailValido(valores.email)) {
    return { motivo: 'e-mail inválido', resposta: { ok: false, error: 'Digite um e-mail válido.' } }
  }

  if (campoLongoDemais(valores)) {
    return { motivo: 'campo longo demais', resposta: { ok: false, error: 'Algum campo ficou longo demais.' } }
  }

  if (pareceAleatorio(valores.name)) {
    return { motivo: 'nome aleatório', resposta: { ok: false, error: 'Digite seu nome completo.' } }
  }

  const ip = await ipDoCliente()
  if (!dentroDoLimite(ip)) {
    return {
      motivo: `limite por IP (${ip})`,
      resposta: { ok: false, error: 'Muitos envios seguidos. Tente de novo daqui a pouco.' },
    }
  }

  return null
}

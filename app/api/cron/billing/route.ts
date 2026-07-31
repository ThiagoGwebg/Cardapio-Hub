import { NextRequest, NextResponse } from 'next/server'
import { runBillingCycle } from '@/lib/billing/invoices'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Passo diário do ciclo de mensalidade: emite faturas, marca vencidas e suspende
// quem passou da carência. Agendado no vercel.json.
//
// Proteção: a Vercel envia `Authorization: Bearer $CRON_SECRET` nos cron jobs.
// Sem CRON_SECRET configurado a rota recusa tudo — nunca fica aberta por omissão.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const result = await runBillingCycle()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha no ciclo de cobrança' },
      { status: 500 }
    )
  }
}

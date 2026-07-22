'use client'

import { toast } from 'sonner'

type Row = Record<string, string | number>

/** Gera e baixa um CSV no navegador a partir das linhas já carregadas na página. */
export default function ExportCsvButton({ rows, filename }: { rows: Row[]; filename: string }) {
  function download() {
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [
      headers.join(';'),
      ...rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(';')),
    ].join('\r\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`CSV exportado (${rows.length} ${rows.length === 1 ? 'linha' : 'linhas'}).`)
  }

  return (
    <button className="ordertype-btn" type="button" onClick={download} disabled={!rows.length} style={{ flex: 'none', padding: '6px 14px' }}>
      Exportar CSV
    </button>
  )
}

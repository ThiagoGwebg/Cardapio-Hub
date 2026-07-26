'use client'

import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  DAY_KEYS,
  DAY_LABELS,
  MAX_RANGES_PER_DAY,
  sanitizeOpeningHours,
  type DayKey,
  type OpeningHours,
} from '@/lib/openingHours'

/**
 * Grade semanal de funcionamento.
 *
 * Vive dentro do <form action={updateStore}> da página da loja, então não tem
 * submit próprio: o estado é serializado num <input type="hidden"> e vai junto
 * com o resto das configurações — mesmo padrão do ProCustomizationPanel.
 */
export default function OpeningHoursField({
  name,
  value,
  autoHoursName,
  autoHours,
}: {
  name: string
  value: OpeningHours
  autoHoursName: string
  autoHours: boolean
}) {
  const [hours, setHours] = useState<OpeningHours>(() => sanitizeOpeningHours(value))
  const [enabled, setEnabled] = useState(autoHours)

  const serialized = useMemo(() => JSON.stringify(hours), [hours])

  function updateDay(day: DayKey, next: OpeningHours[DayKey]) {
    setHours((prev) => ({ ...prev, [day]: next }))
  }

  function toggleDay(day: DayKey, on: boolean) {
    updateDay(day, on ? [{ open: '18:00', close: '23:00' }] : [])
  }

  function setTime(day: DayKey, index: number, field: 'open' | 'close', time: string) {
    updateDay(
      day,
      hours[day].map((r, i) => (i === index ? { ...r, [field]: time } : r))
    )
  }

  return (
    <>
      <input type="hidden" name={name} value={serialized} />

      <div className="toggle-row">
        <div>
          <div className="toggle-label">Seguir horário automaticamente</div>
          <div className="toggle-desc">A loja abre e fecha sozinha conforme a grade abaixo</div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            name={autoHoursName}
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <div className={`hours-grid ${enabled ? '' : 'is-muted'}`}>
        {DAY_KEYS.map((day) => {
          const ranges = hours[day]
          const isOpenDay = ranges.length > 0

          return (
            <div className="hours-day" key={day}>
              <label className="hours-day-head">
                <input
                  type="checkbox"
                  checked={isOpenDay}
                  onChange={(e) => toggleDay(day, e.target.checked)}
                />
                <span className="hours-day-name">{DAY_LABELS[day]}</span>
                {!isOpenDay && <span className="hours-day-closed">Fechado</span>}
              </label>

              {isOpenDay && (
                <div className="hours-ranges">
                  {ranges.map((r, i) => (
                    <div className="hours-range" key={i}>
                      <input
                        className="form-input hours-time"
                        type="time"
                        value={r.open}
                        onChange={(e) => setTime(day, i, 'open', e.target.value)}
                        aria-label={`${DAY_LABELS[day]} — abre`}
                      />
                      <span className="hours-range-sep">às</span>
                      <input
                        className="form-input hours-time"
                        type="time"
                        value={r.close}
                        onChange={(e) => setTime(day, i, 'close', e.target.value)}
                        aria-label={`${DAY_LABELS[day]} — fecha`}
                      />
                      {ranges.length > 1 && (
                        <button
                          type="button"
                          className="hours-range-remove"
                          onClick={() => updateDay(day, ranges.filter((_, j) => j !== i))}
                          aria-label="Remover faixa"
                        >
                          <X size={14} strokeWidth={2.4} />
                        </button>
                      )}
                    </div>
                  ))}

                  {ranges.length < MAX_RANGES_PER_DAY && (
                    <button
                      type="button"
                      className="hours-add"
                      onClick={() => updateDay(day, [...ranges, { open: '11:00', close: '15:00' }])}
                    >
                      <Plus size={13} strokeWidth={2.4} /> faixa
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="settings-hint" style={{ margin: '10px 0 0' }}>
        Use duas faixas no mesmo dia para almoço e jantar. Se o horário de fechar for menor que o de
        abrir (ex.: <b>18:00 às 01:00</b>), a loja continua aberta madrugada adentro.
      </p>
    </>
  )
}

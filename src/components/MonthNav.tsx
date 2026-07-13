import { displayMonthLabel } from '../lib/format'
import type { Month } from '../types'

interface MonthNavProps {
  months: Month[]
  selectedMonthId: string | null
  onSelect: (id: string) => void
  onNewMonth: () => void
  busy?: boolean
}

export function MonthNav({
  months,
  selectedMonthId,
  onSelect,
  onNewMonth,
  busy,
}: MonthNavProps) {
  const index = months.findIndex((m) => m.id === selectedMonthId)
  const canPrev = index > 0
  const canNext = index >= 0 && index < months.length - 1

  return (
    <div className="month-nav">
      <div className="month-nav-controls">
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous month"
          disabled={!canPrev || busy}
          onClick={() => canPrev && onSelect(months[index - 1].id)}
        >
          ‹
        </button>

        <select
          value={selectedMonthId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={months.length === 0 || busy}
          aria-label="Select month"
        >
          {months.length === 0 && <option value="">No months yet</option>}
          {months.map((m) => (
            <option key={m.id} value={m.id}>
              {displayMonthLabel(m.label)}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="icon-btn"
          aria-label="Next month"
          disabled={!canNext || busy}
          onClick={() => canNext && onSelect(months[index + 1].id)}
        >
          ›
        </button>
      </div>

      <button type="button" className="primary" onClick={onNewMonth} disabled={busy}>
        + New Month
      </button>
    </div>
  )
}

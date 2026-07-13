import { displayMonthLabel } from '../lib/format'
import type { Month } from '../types'
import { IconTrash } from './Icons'

interface MonthNavProps {
  months: Month[]
  selectedMonthId: string | null
  onSelect: (id: string) => void
  onNewMonth: () => void
  onDeleteMonth: (id: string) => void
  busy?: boolean
}

export function MonthNav({
  months,
  selectedMonthId,
  onSelect,
  onNewMonth,
  onDeleteMonth,
  busy,
}: MonthNavProps) {
  const index = months.findIndex((m) => m.id === selectedMonthId)
  const canPrev = index > 0
  const canNext = index >= 0 && index < months.length - 1
  const selected = months.find((m) => m.id === selectedMonthId)

  function handleDelete() {
    if (!selectedMonthId || !selected) return
    const label = displayMonthLabel(selected.label)
    const ok = window.confirm(
      `Delete ${label}? This permanently removes all categories and costs for that month.`,
    )
    if (ok) onDeleteMonth(selectedMonthId)
  }

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

      <div className="month-nav-actions">
        <button type="button" className="primary" onClick={onNewMonth} disabled={busy}>
          + New Month
        </button>
        <button
          type="button"
          className="action-btn delete"
          aria-label="Delete current month"
          title="Delete month"
          disabled={!selectedMonthId || busy}
          onClick={handleDelete}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  )
}

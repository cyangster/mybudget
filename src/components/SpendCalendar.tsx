import { useMemo } from 'react'
import { displayMonthLabel, formatCurrency } from '../lib/format'

interface SpendCalendarProps {
  monthLabel: string
  dailyTotals: Record<string, number>
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function formatDayKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function formatDaySpend(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000
    return `$${k.toFixed(k >= 10 ? 0 : 1)}k`
  }
  return formatCurrency(amount).replace(/\.00$/, '')
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function SpendCalendar({ monthLabel, dailyTotals }: SpendCalendarProps) {
  const cells = useMemo(() => {
    const [y, m] = monthLabel.split('-').map(Number)
    if (!y || !m) return []

    const monthIndex = m - 1
    const firstDow = new Date(y, monthIndex, 1).getDay()
    const totalDays = daysInMonth(y, monthIndex)
    const result: Array<{ day: number | null; key: string; amount: number }> =
      []

    for (let i = 0; i < firstDow; i++) {
      result.push({ day: null, key: `pad-${i}`, amount: 0 })
    }

    for (let day = 1; day <= totalDays; day++) {
      const key = formatDayKey(y, monthIndex, day)
      result.push({
        day,
        key,
        amount: dailyTotals[key] ?? 0,
      })
    }

    return result
  }, [monthLabel, dailyTotals])

  return (
    <aside className="spend-calendar" aria-label="Daily spending calendar">
      <header className="spend-calendar-header">
        <h2>Daily spend</h2>
        <span className="muted">{displayMonthLabel(monthLabel)}</span>
      </header>

      <div className="spend-calendar-weekdays">
        {WEEKDAYS.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>

      <div className="spend-calendar-grid">
        {cells.map((cell) =>
          cell.day === null ? (
            <div key={cell.key} className="spend-day empty" />
          ) : (
            <div
              key={cell.key}
              className="spend-day"
              title={`${formatCurrency(cell.amount)} on day ${cell.day}`}
            >
              <span className="spend-day-num">{cell.day}</span>
              <span className="spend-day-amt">
                {formatDaySpend(cell.amount)}
              </span>
            </div>
          ),
        )}
      </div>
    </aside>
  )
}

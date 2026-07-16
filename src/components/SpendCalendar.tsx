import { useMemo } from 'react'
import { displayMonthLabel, formatCurrency } from '../lib/format'

interface SpendCalendarProps {
  monthLabel: string
  dailyTotals: Record<string, number>
  totalBudgeted: number
  leftover: number
}

type DayTone = 'none' | 'low' | 'mid' | 'high' | 'spike'

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function formatDayKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function formatDaySpend(amount: number): string {
  const dollars = Math.round(amount)
  return `$${dollars}`
}

function toneForSpend(amount: number, dailyPace: number, maxSpend: number): DayTone {
  if (amount <= 0) return 'none'

  if (dailyPace > 0) {
    const ratio = amount / dailyPace
    if (ratio <= 0.5) return 'low'
    if (ratio <= 1) return 'mid'
    if (ratio <= 1.5) return 'high'
    return 'spike'
  }

  if (maxSpend <= 0) return 'none'
  const ratio = amount / maxSpend
  if (ratio <= 0.33) return 'low'
  if (ratio <= 0.66) return 'mid'
  if (ratio <= 0.9) return 'high'
  return 'spike'
}

function toneLabel(tone: DayTone, amount: number, dailyPace: number): string {
  if (amount <= 0) return 'No spend'
  if (dailyPace > 0) {
    switch (tone) {
      case 'low':
        return 'Light vs daily budget'
      case 'mid':
        return 'On pace with daily budget'
      case 'high':
        return 'Above daily budget'
      case 'spike':
        return 'Heavy spend day'
      default:
        return ''
    }
  }
  return 'Relative to this month’s biggest day'
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function leftoverClass(amount: number) {
  return amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'positive'
}

export function SpendCalendar({
  monthLabel,
  dailyTotals,
  totalBudgeted,
  leftover,
}: SpendCalendarProps) {
  const { cells, dailyPace } = useMemo(() => {
    const [y, m] = monthLabel.split('-').map(Number)
    if (!y || !m) {
      return {
        cells: [] as Array<{
          day: number | null
          key: string
          amount: number
          tone: DayTone
          isToday: boolean
        }>,
        dailyPace: 0,
      }
    }

    const monthIndex = m - 1
    const firstDow = new Date(y, monthIndex, 1).getDay()
    const totalDays = daysInMonth(y, monthIndex)
    const pace = totalBudgeted > 0 ? totalBudgeted / totalDays : 0
    const maxSpend = Math.max(0, ...Object.values(dailyTotals))

    const now = new Date()
    const isCurrentMonth =
      now.getFullYear() === y && now.getMonth() === monthIndex
    const todayDay = now.getDate()

    const result: Array<{
      day: number | null
      key: string
      amount: number
      tone: DayTone
      isToday: boolean
    }> = []

    for (let i = 0; i < firstDow; i++) {
      result.push({
        day: null,
        key: `pad-${i}`,
        amount: 0,
        tone: 'none',
        isToday: false,
      })
    }

    for (let day = 1; day <= totalDays; day++) {
      const key = formatDayKey(y, monthIndex, day)
      const amount = dailyTotals[key] ?? 0
      result.push({
        day,
        key,
        amount,
        tone: toneForSpend(amount, pace, maxSpend),
        isToday: isCurrentMonth && day === todayDay,
      })
    }

    return { cells: result, dailyPace: pace }
  }, [monthLabel, dailyTotals, totalBudgeted])

  return (
    <aside className="spend-calendar" aria-label="Daily spending calendar">
      <header className="spend-calendar-header">
        <h2>Daily spend</h2>
        <span className="muted">{displayMonthLabel(monthLabel)}</span>
        {dailyPace > 0 && (
          <span className="spend-calendar-pace muted">
            Daily budget pace {formatCurrency(dailyPace)}
          </span>
        )}
      </header>

      <div className="spend-calendar-scroll">
        <div className="spend-calendar-legend" aria-label="Spend color legend">
          <span className="spend-legend-item tone-none">None</span>
          <span className="spend-legend-item tone-low">Light</span>
          <span className="spend-legend-item tone-mid">On pace</span>
          <span className="spend-legend-item tone-high">High</span>
          <span className="spend-legend-item tone-spike">Spike</span>
        </div>

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
                className={`spend-day tone-${cell.tone}${cell.isToday ? ' is-today' : ''}`}
                title={`${formatCurrency(cell.amount)} on day ${cell.day} — ${toneLabel(cell.tone, cell.amount, dailyPace)}`}
              >
                <span className="spend-day-num">{cell.day}</span>
                <span className="spend-day-amt">
                  {formatDaySpend(cell.amount)}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <footer
        className="spend-calendar-footer"
        title="Net monthly income minus total spent"
      >
        <span className="spend-calendar-footer-label">Leftover</span>
        <span
          className={`spend-calendar-footer-value ${leftoverClass(leftover)}`}
        >
          {formatCurrency(leftover)}
        </span>
      </footer>
    </aside>
  )
}

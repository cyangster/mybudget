import { formatCurrency } from '../lib/format'

interface SummaryProps {
  totalBudgeted: number
  totalSpent: number
  leftover: number
}

export function Summary({ totalBudgeted, totalSpent, leftover }: SummaryProps) {
  const leftoverClass =
    leftover > 0 ? 'positive' : leftover < 0 ? 'negative' : ''

  return (
    <section className="summary" aria-label="Budget summary">
      <div className="summary-item">
        <span className="summary-label">Total Budgeted</span>
        <span className="summary-value">{formatCurrency(totalBudgeted)}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Total Spent</span>
        <span className="summary-value">{formatCurrency(totalSpent)}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Leftover (monthly)</span>
        <span className={`summary-value ${leftoverClass}`}>
          {formatCurrency(leftover)}
        </span>
      </div>
    </section>
  )
}

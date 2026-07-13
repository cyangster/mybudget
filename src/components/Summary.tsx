import { formatCurrency } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'

interface SummaryProps {
  totalBudgeted: number
  totalSpent: number
  leftover: number
}

export function Summary({ totalBudgeted, totalSpent, leftover }: SummaryProps) {
  const spendStatus = amountStatus(totalBudgeted, totalSpent)
  const leftoverClass =
    leftover > 0 ? 'positive' : leftover < 0 ? 'negative' : 'positive'

  return (
    <section className="summary" aria-label="Budget summary">
      <div className="summary-item">
        <span className="summary-label">Total Budgeted</span>
        <span className="summary-value">{formatCurrency(totalBudgeted)}</span>
      </div>
      <div className={`summary-item tone-${spendStatus}`}>
        <span className="summary-label">Total Spent</span>
        <span className="summary-value">{formatCurrency(totalSpent)}</span>
        {spendStatus !== 'empty' && (
          <span className={`status-pill status-${spendStatus}`}>
            {statusLabel(spendStatus)}
          </span>
        )}
      </div>
      <div
        className={`summary-item ${leftover >= 0 ? 'tone-done' : 'tone-over'}`}
      >
        <span className="summary-label">Leftover (monthly)</span>
        <span className={`summary-value ${leftoverClass}`}>
          {formatCurrency(leftover)}
        </span>
      </div>
    </section>
  )
}

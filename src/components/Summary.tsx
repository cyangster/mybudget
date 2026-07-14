import { formatCurrency } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'

interface SummaryProps {
  totalBudgeted: number
  totalSpent: number
  canSpendOnBudget: number
  canSpendNow: number
}

export function Summary({
  totalBudgeted,
  totalSpent,
  canSpendOnBudget,
  canSpendNow,
}: SummaryProps) {
  const spendStatus = amountStatus(totalBudgeted, totalSpent)
  const onBudgetClass =
    canSpendOnBudget > 0
      ? 'positive'
      : canSpendOnBudget < 0
        ? 'negative'
        : 'positive'
  const nowClass =
    canSpendNow > 0 ? 'positive' : canSpendNow < 0 ? 'negative' : 'positive'

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
        className={`summary-item ${canSpendOnBudget >= 0 ? 'tone-done' : 'tone-over'}`}
        title="Monthly net income minus everything you've budgeted. If you stick to every budget, this is what's left to spend freely."
      >
        <span className="summary-label">Can spend (on budget)</span>
        <span className={`summary-value ${onBudgetClass}`}>
          {formatCurrency(canSpendOnBudget)}
        </span>
      </div>
      <div
        className={`summary-item ${canSpendNow >= 0 ? 'tone-done' : 'tone-over'}`}
        title="Monthly net income minus what you've actually spent so far this month."
      >
        <span className="summary-label">Can spend (now)</span>
        <span className={`summary-value ${nowClass}`}>
          {formatCurrency(canSpendNow)}
        </span>
      </div>
    </section>
  )
}

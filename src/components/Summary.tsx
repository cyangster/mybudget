import { formatCurrency } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'
import { MONTHLY_SPEND_BUFFER } from '../lib/buffer'

interface SummaryProps {
  totalBudgeted: number
  totalSpent: number
  unbudgeted: number
  sectionOverage: number
  canSpend: number
}

function spendClass(amount: number) {
  return amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'positive'
}

export function Summary({
  totalBudgeted,
  totalSpent,
  unbudgeted,
  sectionOverage,
  canSpend,
}: SummaryProps) {
  const spendStatus = amountStatus(totalBudgeted, totalSpent)

  const detailParts = [
    `${formatCurrency(unbudgeted)} unbudgeted`,
    `− ${formatCurrency(MONTHLY_SPEND_BUFFER)} buffer`,
  ]
  if (sectionOverage > 0) {
    detailParts.push(`− ${formatCurrency(sectionOverage)} overspent`)
  }

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
        className={`summary-item summary-item-can-spend ${canSpend >= 0 ? 'tone-done' : 'tone-over'}`}
        title={`Unbudgeted money you can use for extras, after always keeping $${MONTHLY_SPEND_BUFFER} unspent.`}
      >
        <span className="summary-label">Can spend</span>
        <span className={`summary-value ${spendClass(canSpend)}`}>
          {formatCurrency(canSpend)}
        </span>
        <span className="summary-buffer">
          <span className="summary-buffer-label">
            Keeps ${MONTHLY_SPEND_BUFFER} unspent
          </span>
          <span className="summary-buffer-detail">{detailParts.join(' ')}</span>
        </span>
      </div>
    </section>
  )
}

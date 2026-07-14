import { formatCurrency } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'
import { MONTHLY_SPEND_BUFFER } from '../lib/buffer'

interface SummaryProps {
  totalBudgeted: number
  totalSpent: number
  unbudgeted: number
  sectionOverage: number
  canSpend: number
  canSpendNoBuffer: number
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
  canSpendNoBuffer,
}: SummaryProps) {
  const spendStatus = amountStatus(totalBudgeted, totalSpent)

  const bufferDetail = [
    `${formatCurrency(unbudgeted)} unbudgeted`,
    `− ${formatCurrency(MONTHLY_SPEND_BUFFER)} buffer`,
  ]
  if (sectionOverage > 0) {
    bufferDetail.push(`− ${formatCurrency(sectionOverage)} overspent`)
  }

  const noBufferDetail = [`${formatCurrency(unbudgeted)} unbudgeted`]
  if (sectionOverage > 0) {
    noBufferDetail.push(`− ${formatCurrency(sectionOverage)} overspent`)
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
        className={`summary-item ${canSpend >= 0 ? 'tone-done' : 'tone-over'}`}
        title={`Unbudgeted money for extras, after always keeping $${MONTHLY_SPEND_BUFFER} unspent.`}
      >
        <span className="summary-label">Can spend</span>
        <span className={`summary-value ${spendClass(canSpend)}`}>
          {formatCurrency(canSpend)}
        </span>
        <span className="summary-buffer">
          <span className="summary-buffer-label">
            Keeps ${MONTHLY_SPEND_BUFFER} unspent
          </span>
          <span className="summary-buffer-detail">{bufferDetail.join(' ')}</span>
        </span>
      </div>
      <div
        className={`summary-item ${canSpendNoBuffer >= 0 ? 'tone-done' : 'tone-over'}`}
        title="All unbudgeted money for extras, with no $200 buffer held back."
      >
        <span className="summary-label">Can spend (no buffer)</span>
        <span className={`summary-value ${spendClass(canSpendNoBuffer)}`}>
          {formatCurrency(canSpendNoBuffer)}
        </span>
        <span className="summary-buffer">
          <span className="summary-buffer-label">Ignores $200 buffer</span>
          <span className="summary-buffer-detail">
            {noBufferDetail.join(' ')}
          </span>
        </span>
      </div>
    </section>
  )
}

import { formatCurrency } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'
import { MONTHLY_SPEND_BUFFER } from '../lib/buffer'

interface SummaryProps {
  totalBudgeted: number
  totalSpent: number
  canSpendOnBudget: number
  canSpendNow: number
  sectionOverage: number
}

function spendClass(amount: number) {
  return amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'positive'
}

export function Summary({
  totalBudgeted,
  totalSpent,
  canSpendOnBudget,
  canSpendNow,
  sectionOverage,
}: SummaryProps) {
  const spendStatus = amountStatus(totalBudgeted, totalSpent)
  const plannedAfterBuffer = canSpendOnBudget - MONTHLY_SPEND_BUFFER
  const nowAfterBuffer = canSpendNow - MONTHLY_SPEND_BUFFER

  const nowTitle =
    sectionOverage > 0
      ? `Planned extras (${formatCurrency(canSpendOnBudget)}) minus ${formatCurrency(sectionOverage)} over across sections.`
      : 'Same as planned extras until a main section goes over its budget.'

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
        title="Extras left if every section stays on budget (before your $200 buffer)."
      >
        <span className="summary-label">Can spend (planned)</span>
        <span className={`summary-value ${spendClass(canSpendOnBudget)}`}>
          {formatCurrency(canSpendOnBudget)}
        </span>
        <span className="summary-buffer">
          <span className="summary-buffer-label">
            After ${MONTHLY_SPEND_BUFFER} buffer
          </span>
          <span className={`summary-buffer-value ${spendClass(plannedAfterBuffer)}`}>
            {formatCurrency(plannedAfterBuffer)}
          </span>
        </span>
      </div>
      <div
        className={`summary-item ${canSpendNow >= 0 ? 'tone-done' : 'tone-over'}`}
        title={nowTitle}
      >
        <span className="summary-label">Can spend (after overruns)</span>
        <span className={`summary-value ${spendClass(canSpendNow)}`}>
          {formatCurrency(canSpendNow)}
        </span>
        <span className="summary-buffer">
          <span className="summary-buffer-label">
            After ${MONTHLY_SPEND_BUFFER} buffer
            {sectionOverage > 0
              ? ` · −${formatCurrency(sectionOverage)} over`
              : ''}
          </span>
          <span className={`summary-buffer-value ${spendClass(nowAfterBuffer)}`}>
            {formatCurrency(nowAfterBuffer)}
          </span>
        </span>
      </div>
    </section>
  )
}

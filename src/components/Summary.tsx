import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { formatCurrency, parseAmount } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'

interface SummaryProps {
  totalBudgeted: number
  totalSpent: number
  leftover: number
  unbudgeted: number
  sectionOverage: number
  canSpend: number
  canSpendNoBuffer: number
  monthlySpendBuffer: number
  onUpdateBuffer: (amount: number) => Promise<void>
  busy?: boolean
}

function spendClass(amount: number) {
  return amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'positive'
}

export function Summary({
  totalBudgeted,
  totalSpent,
  leftover,
  unbudgeted,
  sectionOverage,
  canSpend,
  canSpendNoBuffer,
  monthlySpendBuffer,
  onUpdateBuffer,
  busy,
}: SummaryProps) {
  const spendStatus = amountStatus(totalBudgeted, totalSpent)
  const [editingBuffer, setEditingBuffer] = useState(false)
  const [bufferInput, setBufferInput] = useState(String(monthlySpendBuffer))

  useEffect(() => {
    if (!editingBuffer) setBufferInput(String(monthlySpendBuffer))
  }, [monthlySpendBuffer, editingBuffer])

  const bufferDetail = [
    `${formatCurrency(unbudgeted)} unbudgeted`,
    `− ${formatCurrency(monthlySpendBuffer)} buffer`,
  ]
  if (sectionOverage > 0) {
    bufferDetail.push(`− ${formatCurrency(sectionOverage)} overspent`)
  }

  const noBufferDetail = [`${formatCurrency(unbudgeted)} unbudgeted`]
  if (sectionOverage > 0) {
    noBufferDetail.push(`− ${formatCurrency(sectionOverage)} overspent`)
  }

  async function commitBuffer(e?: FormEvent) {
    e?.preventDefault()
    const next = parseAmount(bufferInput)
    setBufferInput(String(next))
    await onUpdateBuffer(next)
    setEditingBuffer(false)
  }

  function onBufferKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitBuffer()
    }
    if (e.key === 'Escape') {
      setBufferInput(String(monthlySpendBuffer))
      setEditingBuffer(false)
    }
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
        <span className="summary-buffer">
          <span className="summary-buffer-label">Leftover</span>
          <span className={`summary-buffer-value ${spendClass(leftover)}`}>
            {formatCurrency(leftover)}
          </span>
        </span>
      </div>
      <div
        className={`summary-item ${canSpend >= 0 ? 'tone-done' : 'tone-over'}`}
        title={`Unbudgeted money for extras, after always keeping ${formatCurrency(monthlySpendBuffer)} unspent.`}
      >
        <span className="summary-label">Can spend</span>
        <span className={`summary-value ${spendClass(canSpend)}`}>
          {formatCurrency(canSpend)}
        </span>
        <span className="summary-buffer">
          {editingBuffer ? (
            <form
              className="summary-buffer-edit"
              onSubmit={(e) => void commitBuffer(e)}
            >
              <span className="summary-buffer-label">Buffer kept unspent</span>
              <span className="money-input summary-buffer-money">
                <span className="money-input-prefix" aria-hidden="true">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={bufferInput}
                  disabled={busy}
                  autoFocus
                  aria-label="Monthly spend buffer"
                  onChange={(e) => setBufferInput(e.target.value)}
                  onBlur={() => void commitBuffer()}
                  onKeyDown={onBufferKeyDown}
                />
              </span>
            </form>
          ) : (
            <button
              type="button"
              className="summary-buffer-edit-btn"
              disabled={busy}
              title="Click to edit buffer"
              onClick={() => setEditingBuffer(true)}
            >
              <span className="summary-buffer-label">
                Keeps {formatCurrency(monthlySpendBuffer)} unspent · edit
              </span>
              <span className="summary-buffer-detail">
                {bufferDetail.join(' ')}
              </span>
            </button>
          )}
        </span>
      </div>
      <div
        className={`summary-item ${canSpendNoBuffer >= 0 ? 'tone-done' : 'tone-over'}`}
        title="All unbudgeted money for extras, with no buffer held back."
      >
        <span className="summary-label">Can spend (no buffer)</span>
        <span className={`summary-value ${spendClass(canSpendNoBuffer)}`}>
          {formatCurrency(canSpendNoBuffer)}
        </span>
        <span className="summary-buffer">
          <span className="summary-buffer-label">
            Ignores {formatCurrency(monthlySpendBuffer)} buffer
          </span>
          <span className="summary-buffer-detail">
            {noBufferDetail.join(' ')}
          </span>
        </span>
      </div>
    </section>
  )
}

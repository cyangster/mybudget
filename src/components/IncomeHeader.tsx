import { useEffect, useState, type FormEvent } from 'react'
import { formatCurrency, parseAmount } from '../lib/format'

interface IncomeHeaderProps {
  grossSemi: number
  netSemi: number
  grossMonthly: number
  netMonthly: number
  grossCategoryId: string | null
  netCategoryId: string | null
  onSaveIncome: (
    categoryId: string,
    amount: number,
  ) => Promise<void>
  busy?: boolean
}

export function IncomeHeader({
  grossSemi,
  netSemi,
  grossMonthly,
  netMonthly,
  grossCategoryId,
  netCategoryId,
  onSaveIncome,
  busy,
}: IncomeHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [grossInput, setGrossInput] = useState(String(grossSemi))
  const [netInput, setNetInput] = useState(String(netSemi))

  useEffect(() => {
    if (!editing) {
      setGrossInput(String(grossSemi))
      setNetInput(String(netSemi))
    }
  }, [grossSemi, netSemi, editing])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (grossCategoryId) {
      await onSaveIncome(grossCategoryId, parseAmount(grossInput))
    }
    if (netCategoryId) {
      await onSaveIncome(netCategoryId, parseAmount(netInput))
    }
    setEditing(false)
  }

  return (
    <section className="income-header" aria-label="Income overview">
      <div className="income-header-top">
        <h2 className="income-header-title">Income</h2>
        {!editing ? (
          <button
            type="button"
            className="ghost small"
            onClick={() => setEditing(true)}
            disabled={busy || (!grossCategoryId && !netCategoryId)}
          >
            Edit
          </button>
        ) : null}
      </div>

      {editing ? (
        <form className="income-edit-form" onSubmit={save}>
          <label>
            Gross (semi-monthly)
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={grossInput}
              onChange={(e) => setGrossInput(e.target.value)}
              autoFocus
            />
          </label>
          <label>
            Net (semi-monthly)
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={netInput}
              onChange={(e) => setNetInput(e.target.value)}
            />
          </label>
          <div className="inline-actions">
            <button type="submit" disabled={busy}>
              Save
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => {
                setGrossInput(String(grossSemi))
                setNetInput(String(netSemi))
                setEditing(false)
              }}
            >
              Cancel
            </button>
          </div>
          <p className="muted income-hint">
            Monthly amounts update automatically (×2).
          </p>
        </form>
      ) : (
        <div className="income-header-grid">
          <div className="income-block">
            <h3>Gross</h3>
            <div className="income-figures">
              <div>
                <span className="income-period">Semi-monthly</span>
                <span className="income-amount">{formatCurrency(grossSemi)}</span>
              </div>
              <div>
                <span className="income-period">Monthly</span>
                <span className="income-amount">
                  {formatCurrency(grossMonthly)}
                </span>
              </div>
            </div>
          </div>
          <div className="income-block">
            <h3>Net</h3>
            <div className="income-figures">
              <div>
                <span className="income-period">Semi-monthly</span>
                <span className="income-amount">{formatCurrency(netSemi)}</span>
              </div>
              <div>
                <span className="income-period">Monthly</span>
                <span className="income-amount">
                  {formatCurrency(netMonthly)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

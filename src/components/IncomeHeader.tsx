import { useEffect, useState, type FormEvent } from 'react'
import { formatCurrency, parseAmount } from '../lib/format'
import { PAY_CYCLE_OPTIONS, payCycleOption } from '../lib/payCycle'
import type { PayCycle } from '../types'

interface IncomeHeaderProps {
  grossSemi: number
  netSemi: number
  grossMonthly: number
  netMonthly: number
  grossCategoryId: string | null
  netCategoryId: string | null
  payCycle: PayCycle
  onPayCycleChange: (cycle: PayCycle) => Promise<void>
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
  payCycle,
  onPayCycleChange,
  onSaveIncome,
  busy,
}: IncomeHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [grossInput, setGrossInput] = useState(String(grossSemi))
  const [netInput, setNetInput] = useState(String(netSemi))
  const cycle = payCycleOption(payCycle)

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
        <label className="income-cycle-field">
          <span className="visually-hidden">Pay cycle</span>
          <select
            className="income-cycle-select"
            value={payCycle}
            disabled={busy}
            aria-label="Pay cycle"
            onChange={(e) =>
              void onPayCycleChange(e.target.value as PayCycle)
            }
          >
            {PAY_CYCLE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {editing ? (
        <form className="income-edit-form" onSubmit={save}>
          <label>
            Gross ({cycle.shortLabel.toLowerCase()})
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
            Net ({cycle.shortLabel.toLowerCase()})
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
            Monthly amounts update from your {cycle.shortLabel.toLowerCase()}{' '}
            pay ({cycle.perYear} pays / year).
          </p>
        </form>
      ) : (
        <div
          className="income-header-grid"
          title="Double-click to edit"
          onDoubleClick={() => {
            if (busy || (!grossCategoryId && !netCategoryId)) return
            setEditing(true)
          }}
        >
          <div className="income-block">
            <h3>Gross</h3>
            <div className="income-figures">
              <div>
                <span className="income-period">{cycle.shortLabel}</span>
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
                <span className="income-period">{cycle.shortLabel}</span>
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

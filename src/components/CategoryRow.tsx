import { useState, type FormEvent } from 'react'
import { formatCurrency, parseAmount } from '../lib/format'
import type { Category, CategoryEntry } from '../types'

interface CategoryRowProps {
  category: Category
  entries?: CategoryEntry[]
  isIncome?: boolean
  onSave: (
    id: string,
    patch: Partial<Pick<Category, 'name' | 'budgeted_amount' | 'actual_amount'>>,
  ) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onAddEntry?: (categoryId: string, amount: number, label?: string) => Promise<void>
  onDeleteEntry?: (entryId: string, categoryId: string) => Promise<void>
  busy?: boolean
}

export function CategoryRow({
  category,
  entries = [],
  isIncome,
  onSave,
  onDelete,
  onAddEntry,
  onDeleteEntry,
  busy,
}: CategoryRowProps) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState(category.name)
  const [budgeted, setBudgeted] = useState(String(category.budgeted_amount))
  const [actual, setActual] = useState(String(category.actual_amount))
  const [entryAmount, setEntryAmount] = useState('')
  const [entryLabel, setEntryLabel] = useState('')

  const remaining = category.budgeted_amount - category.actual_amount
  const remainingClass =
    remaining > 0 ? 'positive' : remaining < 0 ? 'negative' : ''

  function startEdit() {
    setName(category.name)
    setBudgeted(String(category.budgeted_amount))
    setActual(String(category.actual_amount))
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (isIncome) {
      await onSave(category.id, { actual_amount: parseAmount(actual) })
    } else {
      await onSave(category.id, {
        name: name.trim() || category.name,
        budgeted_amount: parseAmount(budgeted),
      })
    }
    setEditing(false)
  }

  async function handleAddEntry(e: FormEvent) {
    e.preventDefault()
    if (!onAddEntry) return
    const amount = parseAmount(entryAmount)
    if (amount === 0 && entryAmount.trim() === '') return
    await onAddEntry(category.id, amount, entryLabel)
    setEntryAmount('')
    setEntryLabel('')
  }

  if (editing) {
    return (
      <tr className="category-row editing">
        <td colSpan={isIncome ? 3 : 5}>
          <form className="inline-edit" onSubmit={save}>
            {!isIncome && (
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </label>
            )}
            {isIncome ? (
              <label>
                Amount
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  autoFocus
                />
              </label>
            ) : (
              <label>
                Budgeted
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={budgeted}
                  onChange={(e) => setBudgeted(e.target.value)}
                />
              </label>
            )}
            <div className="inline-actions">
              <button type="submit" disabled={busy}>
                Save
              </button>
              <button type="button" className="ghost" onClick={cancel} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    )
  }

  return (
    <>
      <tr className={`category-row ${expanded ? 'expanded' : ''}`}>
        <td className="name-cell">
          {!isIncome ? (
            <button
              type="button"
              className="expand-btn"
              aria-expanded={expanded}
              aria-label={expanded ? 'Hide costs' : 'Show costs'}
              onClick={() => setExpanded((v) => !v)}
            >
              <span className="chevron">{expanded ? '▾' : '▸'}</span>
              {category.name}
              {entries.length > 0 && (
                <span className="entry-count">{entries.length}</span>
              )}
            </button>
          ) : (
            category.name
          )}
        </td>
        {isIncome ? (
          <td className="num">{formatCurrency(category.actual_amount)}</td>
        ) : (
          <>
            <td className="num">{formatCurrency(category.budgeted_amount)}</td>
            <td className="num">{formatCurrency(category.actual_amount)}</td>
            <td className={`num ${remainingClass}`}>
              {formatCurrency(remaining)}
            </td>
          </>
        )}
        <td className="actions-cell">
          {!isIncome && (
            <button
              type="button"
              className="ghost small"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              disabled={busy}
            >
              {expanded ? 'Hide costs' : 'Costs'}
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            aria-label={`Edit ${category.name}`}
            onClick={startEdit}
            disabled={busy}
            title="Edit"
          >
            ✎
          </button>
          {!isIncome && onDelete && (
            <button
              type="button"
              className="icon-btn danger"
              aria-label={`Delete ${category.name}`}
              onClick={() => void onDelete(category.id)}
              disabled={busy}
              title="Delete"
            >
              ×
            </button>
          )}
        </td>
      </tr>

      {!isIncome && expanded && (
        <tr className="entry-panel-row">
          <td colSpan={5}>
            <div className="entry-panel">
              <div className="entry-panel-header">
                <strong>Costs in {category.name}</strong>
                <span className="muted">
                  Remaining {formatCurrency(remaining)}
                </span>
              </div>

              {entries.length === 0 ? (
                <p className="muted entry-empty">
                  No costs yet. Add each payment (e.g. $400 + $400).
                </p>
              ) : (
                <ul className="entry-list">
                  {entries.map((entry, i) => (
                    <li key={entry.id}>
                      <span className="entry-label">
                        {entry.label || `Payment ${i + 1}`}
                      </span>
                      <span className="num">{formatCurrency(entry.amount)}</span>
                      {onDeleteEntry && (
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label="Delete cost"
                          disabled={busy}
                          onClick={() =>
                            void onDeleteEntry(entry.id, category.id)
                          }
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {onAddEntry && (
                <form className="add-entry-form" onSubmit={handleAddEntry}>
                  <input
                    type="text"
                    placeholder="Label (optional)"
                    value={entryLabel}
                    onChange={(e) => setEntryLabel(e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={busy}>
                    + Add cost
                  </button>
                </form>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

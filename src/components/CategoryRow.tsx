import { useState, type FormEvent } from 'react'
import { formatCurrency, parseAmount } from '../lib/format'
import type { Category } from '../types'

interface CategoryRowProps {
  category: Category
  isIncome?: boolean
  onSave: (
    id: string,
    patch: Partial<Pick<Category, 'name' | 'budgeted_amount' | 'actual_amount'>>,
  ) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  busy?: boolean
}

export function CategoryRow({
  category,
  isIncome,
  onSave,
  onDelete,
  busy,
}: CategoryRowProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [budgeted, setBudgeted] = useState(String(category.budgeted_amount))
  const [actual, setActual] = useState(String(category.actual_amount))

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
        actual_amount: parseAmount(actual),
      })
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="category-row editing">
        <td colSpan={isIncome ? 3 : 4}>
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
              <>
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
                <label>
                  Actual
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                  />
                </label>
              </>
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
    <tr className="category-row">
      <td className="name-cell">{category.name}</td>
      {isIncome ? (
        <td className="num">{formatCurrency(category.actual_amount)}</td>
      ) : (
        <>
          <td className="num">{formatCurrency(category.budgeted_amount)}</td>
          <td className="num">{formatCurrency(category.actual_amount)}</td>
        </>
      )}
      <td className="actions-cell">
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
  )
}

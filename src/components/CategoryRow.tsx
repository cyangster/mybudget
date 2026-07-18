import { useRef, useState, type FormEvent } from 'react'
import { formatCurrency, parseAmount } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'
import type { Category, CategoryEntry, PaymentCard } from '../types'
import { CategoryCostsModal } from './CategoryCostsModal'
import { IconEdit, IconTrash } from './Icons'

interface CategoryRowProps {
  category: Category
  entries?: CategoryEntry[]
  paymentCards?: PaymentCard[]
  isIncome?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  onDragStart?: (id: string) => void
  onDragOver?: (id: string) => void
  onDrop?: (id: string) => void
  onDragEnd?: () => void
  onSave: (
    id: string,
    patch: Partial<
      Pick<
        Category,
        'name' | 'budgeted_amount' | 'actual_amount' | 'excluded_from_budget'
      >
    >,
  ) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onAddEntry?: (
    categoryId: string,
    amount: number,
    label?: string,
    entryDate?: string,
    notes?: string,
    cardId?: string | null,
  ) => Promise<void>
  onUpdateEntry?: (
    entryId: string,
    categoryId: string,
    patch: Partial<
      Pick<
        CategoryEntry,
        'label' | 'amount' | 'entry_date' | 'notes' | 'card_id'
      >
    >,
  ) => Promise<void>
  onDeleteEntry?: (entryId: string, categoryId: string) => Promise<void>
  onAddPaymentCard?: (name: string) => Promise<PaymentCard | null>
  busy?: boolean
}

export function CategoryRow({
  category,
  entries = [],
  paymentCards = [],
  isIncome,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSave,
  onDelete,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onAddPaymentCard,
  busy,
}: CategoryRowProps) {
  const [editing, setEditing] = useState(false)
  const [costsOpen, setCostsOpen] = useState(false)
  const [name, setName] = useState(category.name)
  const [budgeted, setBudgeted] = useState(String(category.budgeted_amount))
  const [actual, setActual] = useState(String(category.actual_amount))
  const costsClickTimer = useRef<number | null>(null)

  const colCount = isIncome ? 3 : 6
  const remaining = category.budgeted_amount - category.actual_amount
  const status = isIncome
    ? 'empty'
    : amountStatus(category.budgeted_amount, category.actual_amount)
  const remainingClass =
    status === 'done'
      ? 'status-done'
      : status === 'over'
        ? 'status-over'
        : status === 'open'
          ? 'status-open'
          : ''

  function startEdit() {
    if (costsClickTimer.current != null) {
      window.clearTimeout(costsClickTimer.current)
      costsClickTimer.current = null
    }
    setCostsOpen(false)
    setName(category.name)
    setBudgeted(String(category.budgeted_amount))
    setActual(String(category.actual_amount))
    setEditing(true)
  }

  function openCostsDelayed() {
    if (costsClickTimer.current != null) {
      window.clearTimeout(costsClickTimer.current)
    }
    costsClickTimer.current = window.setTimeout(() => {
      costsClickTimer.current = null
      setCostsOpen(true)
    }, 250)
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

  if (editing) {
    return (
      <tr className="category-row editing">
        <td colSpan={colCount}>
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
      <tr
        className={`category-row row-${status} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''} ${!isIncome && category.excluded_from_budget ? 'excluded-from-budget' : ''}`}
        title="Double-click to edit"
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('button, a, input, label')) return
          startEdit()
        }}
        onDragOver={(e) => {
          if (!onDragOver) return
          e.preventDefault()
          onDragOver(category.id)
        }}
        onDrop={(e) => {
          if (!onDrop) return
          e.preventDefault()
          onDrop(category.id)
        }}
      >
        {!isIncome && (
          <td className="reorder-cell">
            <button
              type="button"
              className="drag-handle"
              draggable={!busy}
              aria-label={`Drag to reorder ${category.name}`}
              title="Drag to reorder"
              disabled={busy}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', category.id)
                onDragStart?.(category.id)
              }}
              onDragEnd={() => onDragEnd?.()}
            >
              <span className="grip-dots" aria-hidden="true" />
            </button>
          </td>
        )}
        <td className="name-cell">
          {!isIncome ? (
            <div className="name-with-toggle">
              <input
                type="checkbox"
                className="include-check"
                checked={!category.excluded_from_budget}
                disabled={busy}
                title={
                  category.excluded_from_budget
                    ? 'Off: shown only, not in totals'
                    : 'On: included in totals'
                }
                aria-label={`Include ${category.name} in budget totals`}
                onChange={(e) => {
                  void onSave(category.id, {
                    excluded_from_budget: !e.target.checked,
                  })
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                className="expand-btn"
                aria-haspopup="dialog"
                aria-expanded={costsOpen}
                aria-label={`Open costs for ${category.name}`}
                title="Click for costs · double-click to edit"
                onClick={openCostsDelayed}
                onDoubleClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  startEdit()
                }}
              >
                <span className="chevron">▸</span>
                {category.name}
                {entries.length > 0 && (
                  <span className="entry-count">{entries.length}</span>
                )}
                {status !== 'empty' && !category.excluded_from_budget && (
                  <span className={`status-pill status-${status}`}>
                    {statusLabel(status)}
                  </span>
                )}
              </button>
            </div>
          ) : (
            category.name
          )}
        </td>
        {isIncome ? (
          <td className="num amount-income">
            {formatCurrency(category.actual_amount)}
          </td>
        ) : (
          <>
            <td className="num amount-budgeted">
              {formatCurrency(category.budgeted_amount)}
            </td>
            <td className="num amount-spent">
              {formatCurrency(category.actual_amount)}
            </td>
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
              aria-haspopup="dialog"
              aria-expanded={costsOpen}
              onClick={() => setCostsOpen(true)}
              disabled={busy}
            >
              Costs
            </button>
          )}
          <button
            type="button"
            className="action-btn edit"
            aria-label={`Edit ${category.name}`}
            onClick={startEdit}
            disabled={busy}
            title="Edit"
          >
            <IconEdit />
          </button>
          {!isIncome && onDelete && (
            <button
              type="button"
              className="action-btn delete"
              aria-label={`Delete ${category.name}`}
              onClick={() => void onDelete(category.id)}
              disabled={busy}
              title="Delete"
            >
              <IconTrash />
            </button>
          )}
        </td>
      </tr>

      {!isIncome && (
        <CategoryCostsModal
          category={category}
          entries={entries}
          paymentCards={paymentCards}
          open={costsOpen}
          onClose={() => setCostsOpen(false)}
          onAddEntry={onAddEntry}
          onUpdateEntry={onUpdateEntry}
          onDeleteEntry={onDeleteEntry}
          onAddPaymentCard={onAddPaymentCard}
          busy={busy}
        />
      )}
    </>
  )
}

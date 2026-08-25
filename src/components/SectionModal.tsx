import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrency } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'
import type {
  BudgetSection,
  Category,
  CategoryEntry,
  PaymentCard,
} from '../types'
import { SECTION_LABELS } from '../types'
import { CategoryRow } from './CategoryRow'

interface SectionModalProps {
  section: BudgetSection
  categories: Category[]
  entriesByCategory: Record<string, CategoryEntry[]>
  paymentCards: PaymentCard[]
  open: boolean
  onClose: () => void
  onAdd: (section: BudgetSection, name: string) => Promise<void>
  onSave: (
    id: string,
    patch: Partial<
      Pick<
        Category,
        'name' | 'budgeted_amount' | 'actual_amount' | 'excluded_from_budget'
      >
    >,
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddEntry: (
    categoryId: string,
    amount: number,
    label?: string,
    entryDate?: string,
    notes?: string,
    cardId?: string | null,
  ) => Promise<void>
  onUpdateEntry: (
    entryId: string,
    categoryId: string,
    patch: Partial<
      Pick<
        CategoryEntry,
        'label' | 'amount' | 'entry_date' | 'notes' | 'card_id'
      >
    >,
  ) => Promise<void>
  onDeleteEntry: (entryId: string, categoryId: string) => Promise<void>
  onAddPaymentCard: (name: string) => Promise<PaymentCard | null>
  onReorder: (section: BudgetSection, orderedIds: string[]) => Promise<void>
  busy?: boolean
}

export function SectionModal({
  section,
  categories,
  entriesByCategory,
  paymentCards,
  open,
  onClose,
  onAdd,
  onSave,
  onDelete,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onAddPaymentCard,
  onReorder,
  busy,
}: SectionModalProps) {
  const [visible, setVisible] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  const counted = categories.filter((c) => !c.excluded_from_budget)
  const budgeted = counted.reduce((sum, c) => sum + c.budgeted_amount, 0)
  const spent = counted.reduce((sum, c) => sum + c.actual_amount, 0)
  const remaining = budgeted - spent
  const sectionStatus = amountStatus(budgeted, spent)
  const remainingClass =
    remaining > 0 ? 'positive' : remaining < 0 ? 'negative' : ''

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    await onAdd(section, newName.trim() || 'New category')
    setNewName('')
    setAdding(false)
  }

  function handleDragStart(id: string) {
    setDraggingId(id)
  }

  function handleDragOver(id: string) {
    if (!draggingId || draggingId === id) return
    setDropTargetId(id)
  }

  async function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      setDropTargetId(null)
      return
    }

    const ids = categories.map((c) => c.id)
    const from = ids.indexOf(draggingId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) {
      setDraggingId(null)
      setDropTargetId(null)
      return
    }

    const next = [...ids]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)

    setDraggingId(null)
    setDropTargetId(null)
    await onReorder(section, next)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDropTargetId(null)
  }

  return createPortal(
    <div
      className={`costs-modal-root ${visible ? 'is-open' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`costs-modal section-modal section-${section}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`section-modal-title-${section}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-modal-hero">
          <header className="section-modal-hero-top">
            <div className="section-modal-hero-title">
              <p className="section-modal-hero-kicker">Budget section</p>
              <div className="section-modal-hero-name-row">
                <h2 id={`section-modal-title-${section}`}>
                  {SECTION_LABELS[section]}
                </h2>
                {sectionStatus !== 'empty' && (
                  <span className={`status-pill status-${sectionStatus}`}>
                    {statusLabel(sectionStatus)}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="section-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="section-modal-hero-stats">
            <div className="section-modal-stat">
              <span className="section-modal-stat-label">Budgeted</span>
              <span className="section-modal-stat-value amount-budgeted">
                {formatCurrency(budgeted)}
              </span>
            </div>
            <div className="section-modal-stat">
              <span className="section-modal-stat-label">Spent</span>
              <span className="section-modal-stat-value amount-spent">
                {formatCurrency(spent)}
              </span>
            </div>
            <div className="section-modal-stat">
              <span className="section-modal-stat-label">Left over</span>
              <span className={`section-modal-stat-value ${remainingClass}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>
        </div>

        <div className="section-modal-body table-wrap">
          <table>
            <thead>
              <tr>
                <th className="reorder-col" aria-label="Reorder" />
                <th>Category</th>
                <th className="num th-budgeted">Budgeted</th>
                <th className="num th-spent">Spent</th>
                <th className="num">Remaining</th>
                <th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No categories yet.
                  </td>
                </tr>
              )}
              {categories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  entries={entriesByCategory[cat.id] ?? []}
                  paymentCards={paymentCards}
                  isDragging={draggingId === cat.id}
                  isDropTarget={dropTargetId === cat.id}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onSave={onSave}
                  onDelete={onDelete}
                  onAddEntry={onAddEntry}
                  onUpdateEntry={onUpdateEntry}
                  onDeleteEntry={onDeleteEntry}
                  onAddPaymentCard={onAddPaymentCard}
                  busy={busy}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-footer">
          {adding ? (
            <form className="add-form" onSubmit={handleAdd}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                autoFocus
              />
              <button type="submit" disabled={busy}>
                Add
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setAdding(false)
                  setNewName('')
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="ghost"
              onClick={() => setAdding(true)}
              disabled={busy}
            >
              + Add category
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

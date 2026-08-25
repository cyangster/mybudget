import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  displayEntryDate,
  formatCurrency,
  parseAmount,
  todayDateInput,
} from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'
import type { Category, CategoryEntry, PaymentCard } from '../types'
import { IconEdit, IconTrash } from './Icons'
import { ModalHero } from './ModalHero'

interface CategoryCostsModalProps {
  category: Category
  entries: CategoryEntry[]
  paymentCards: PaymentCard[]
  open: boolean
  onClose: () => void
  onSaveCategory?: (
    id: string,
    patch: Partial<Pick<Category, 'name' | 'budgeted_amount'>>,
  ) => Promise<void>
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

export function CategoryCostsModal({
  category,
  entries,
  paymentCards,
  open,
  onClose,
  onSaveCategory,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onAddPaymentCard,
  busy,
}: CategoryCostsModalProps) {
  const [visible, setVisible] = useState(false)
  const [categoryName, setCategoryName] = useState(category.name)
  const [categoryBudgeted, setCategoryBudgeted] = useState(
    String(category.budgeted_amount),
  )
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [entryAmount, setEntryAmount] = useState('')
  const [entryLabel, setEntryLabel] = useState('')
  const [entryDate, setEntryDate] = useState(todayDateInput())
  const [entryNotes, setEntryNotes] = useState('')
  const [entryCardId, setEntryCardId] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState(todayDateInput())
  const [editNotes, setEditNotes] = useState('')
  const [editCardId, setEditCardId] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const editingRowRef = useRef<HTMLLIElement>(null)

  const remaining = category.budgeted_amount - category.actual_amount
  const status = amountStatus(category.budgeted_amount, category.actual_amount)

  const defaultCardId = useMemo(
    () =>
      paymentCards.find((c) => c.is_default)?.id ?? paymentCards[0]?.id ?? '',
    [paymentCards],
  )

  const cardNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const card of paymentCards) map.set(card.id, card.name)
    return map
  }, [paymentCards])

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

  useEffect(() => {
    if (!open) {
      setEditingEntryId(null)
      return
    }
    setCategoryName(category.name)
    setCategoryBudgeted(String(category.budgeted_amount))
  }, [open, category.name, category.budgeted_amount])

  useEffect(() => {
    if (!open) return
    if (!entryCardId && defaultCardId) setEntryCardId(defaultCardId)
  }, [open, defaultCardId, entryCardId])

  useEffect(() => {
    if (!editingEntryId) return
    const list = listRef.current
    const row = editingRowRef.current
    if (!list || !row) return

    let cancelled = false
    const centerRow = () => {
      if (cancelled) return
      const listRect = list.getBoundingClientRect()
      const rowRect = row.getBoundingClientRect()
      const offset =
        rowRect.top -
        listRect.top -
        (listRect.height - rowRect.height) / 2
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      list.scrollBy({
        top: offset,
        behavior: reduceMotion ? 'auto' : 'smooth',
      })
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(centerRow)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [editingEntryId])

  if (!open) return null

  async function saveCategoryPatch(
    patch: Partial<Pick<Category, 'name' | 'budgeted_amount'>>,
  ) {
    if (!onSaveCategory) return
    await onSaveCategory(category.id, patch)
  }

  async function commitCategoryName() {
    const next = categoryName.trim() || category.name
    if (next === category.name) {
      setCategoryName(category.name)
      return
    }
    setCategoryName(next)
    await saveCategoryPatch({ name: next })
  }

  async function commitCategoryBudgeted() {
    const next = parseAmount(categoryBudgeted)
    if (next === category.budgeted_amount) {
      setCategoryBudgeted(String(category.budgeted_amount))
      return
    }
    setCategoryBudgeted(String(next))
    await saveCategoryPatch({ budgeted_amount: next })
  }

  function startEditEntry(entry: CategoryEntry) {
    setEditingEntryId(entry.id)
    setEditLabel(entry.label)
    setEditAmount(String(entry.amount))
    setEditDate(entry.entry_date || todayDateInput())
    setEditNotes(entry.notes ?? '')
    setEditCardId(entry.card_id ?? defaultCardId)
  }

  async function handleAddCard() {
    if (!onAddPaymentCard) return
    const name = window.prompt('New card name')
    if (!name?.trim()) return
    const card = await onAddPaymentCard(name.trim())
    if (card) {
      setEntryCardId(card.id)
      if (editingEntryId) setEditCardId(card.id)
    }
  }

  async function handleAddEntry(e: FormEvent) {
    e.preventDefault()
    if (!onAddEntry) return
    const amount = parseAmount(entryAmount)
    if (amount === 0 && entryAmount.trim() === '') return
    await onAddEntry(
      category.id,
      amount,
      entryLabel,
      entryDate,
      entryNotes,
      entryCardId || defaultCardId || null,
    )
    setEntryAmount('')
    setEntryLabel('')
    setEntryDate(todayDateInput())
    setEntryNotes('')
    setEntryCardId(defaultCardId)
  }

  async function handleUpdateEntry(e: FormEvent) {
    e.preventDefault()
    if (!onUpdateEntry || !editingEntryId) return
    await onUpdateEntry(editingEntryId, category.id, {
      label: editLabel.trim(),
      amount: parseAmount(editAmount),
      entry_date: editDate,
      notes: editNotes.trim(),
      card_id: editCardId || null,
    })
    setEditingEntryId(null)
  }

  return createPortal(
    <div
      className={`costs-modal-root ${visible ? 'is-open' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="costs-modal app-modal app-modal--large category-costs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`costs-modal-title-${category.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHero
          kicker="Category costs"
          tone="sky"
          onClose={onClose}
          title={
            <>
              {onSaveCategory ? (
                <input
                  id={`costs-modal-title-${category.id}`}
                  className="costs-category-name-input"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  onBlur={() => void commitCategoryName()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                  disabled={busy}
                  aria-label="Category name"
                />
              ) : (
                <h2 id={`costs-modal-title-${category.id}`}>{category.name}</h2>
              )}
              {status !== 'empty' && (
                <span className={`status-pill status-${status}`}>
                  {statusLabel(status)}
                </span>
              )}
            </>
          }
          stats={[
            {
              label: 'Budgeted',
              value: onSaveCategory ? (
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className="costs-stat-input amount-budgeted"
                  value={categoryBudgeted}
                  onChange={(e) => setCategoryBudgeted(e.target.value)}
                  onBlur={() => void commitCategoryBudgeted()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                  disabled={busy}
                  aria-label="Budgeted amount"
                />
              ) : (
                formatCurrency(category.budgeted_amount)
              ),
              valueClassName: onSaveCategory ? '' : 'amount-budgeted',
            },
            {
              label: 'Spent',
              value: formatCurrency(category.actual_amount),
              valueClassName: 'amount-spent',
            },
            {
              label: 'Left over',
              value: formatCurrency(remaining),
              valueClassName:
                remaining > 0
                  ? 'positive'
                  : remaining < 0
                    ? 'negative'
                    : '',
            },
          ]}
        />

        <div className="app-modal-body category-costs-list" ref={listRef}>
          {entries.length === 0 ? (
            <p className="app-modal-empty muted entry-empty">
              No costs yet. Add each payment (e.g. $400 + $400).
            </p>
          ) : (
            <ul className="entry-list modal-entry-list">
              {entries.map((entry, i) =>
                editingEntryId === entry.id ? (
                  <li
                    key={entry.id}
                    className="entry-editing"
                    ref={editingRowRef}
                  >
                    <form className="edit-entry-form" onSubmit={handleUpdateEntry}>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        required
                        aria-label="Date"
                      />
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="Amount"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        required
                        aria-label="Amount"
                      />
                      <input
                        type="text"
                        placeholder="Label"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                      />
                      <div className="card-tag-row">
                        <select
                          value={editCardId}
                          onChange={(e) => setEditCardId(e.target.value)}
                          aria-label="Card"
                        >
                          {paymentCards.map((card) => (
                            <option key={card.id} value={card.id}>
                              {card.name}
                            </option>
                          ))}
                        </select>
                        {onAddPaymentCard && (
                          <button
                            type="button"
                            className="ghost small"
                            onClick={() => void handleAddCard()}
                            disabled={busy}
                            title="Add card"
                          >
                            +
                          </button>
                        )}
                      </div>
                      <textarea
                        className="entry-notes-input"
                        placeholder="Note (optional)"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                      />
                      <div className="inline-actions">
                        <button type="submit" disabled={busy}>
                          Save
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          disabled={busy}
                          onClick={() => setEditingEntryId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li
                    key={entry.id}
                    className="entry-item"
                    title={onUpdateEntry ? 'Double-click to edit' : undefined}
                    onDoubleClick={(e) => {
                      if (!onUpdateEntry || busy) return
                      const target = e.target as HTMLElement
                      if (target.closest('button')) return
                      startEditEntry(entry)
                    }}
                  >
                    <span className="entry-date">
                      {displayEntryDate(entry.entry_date)}
                    </span>
                    <div className="entry-main">
                      <span className="entry-label">
                        {entry.label || `Payment ${i + 1}`}
                      </span>
                      {entry.card_id && cardNameById.get(entry.card_id) ? (
                        <span className="entry-card-tag">
                          {cardNameById.get(entry.card_id)}
                        </span>
                      ) : null}
                      {entry.notes ? (
                        <span className="entry-notes">{entry.notes}</span>
                      ) : null}
                    </div>
                    <span className="num amount-spent">
                      {formatCurrency(entry.amount)}
                    </span>
                    {onUpdateEntry && (
                      <button
                        type="button"
                        className="action-btn edit"
                        aria-label="Edit cost"
                        disabled={busy}
                        title="Edit"
                        onClick={() => startEditEntry(entry)}
                      >
                        <IconEdit />
                      </button>
                    )}
                    {onDeleteEntry && (
                      <button
                        type="button"
                        className="action-btn delete"
                        aria-label="Delete cost"
                        disabled={busy}
                        onClick={() =>
                          void onDeleteEntry(entry.id, category.id)
                        }
                      >
                        <IconTrash />
                      </button>
                    )}
                  </li>
                ),
              )}
            </ul>
          )}
        </div>

        {onAddEntry && (
          <div className="app-modal-panel category-costs-add-panel">
            <h3 className="category-costs-add-heading">Add cost</h3>
            <form
              className="add-entry-form category-costs-add-form"
              onSubmit={handleAddEntry}
            >
              <label className="category-costs-field">
                <span>Date</span>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                />
              </label>
              <label className="category-costs-field">
                <span>Amount</span>
                <span className="money-input">
                  <span className="money-input-prefix" aria-hidden="true">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    required
                  />
                </span>
              </label>
              <label className="category-costs-field category-costs-field-grow">
                <span>Label</span>
                <input
                  type="text"
                  placeholder="Optional"
                  value={entryLabel}
                  onChange={(e) => setEntryLabel(e.target.value)}
                />
              </label>
              <label className="category-costs-field category-costs-field-card">
                <span>Card</span>
                <div className="category-costs-card-row">
                  <select
                    id={`card-tag-${category.id}`}
                    value={entryCardId || defaultCardId}
                    onChange={(e) => setEntryCardId(e.target.value)}
                    aria-label="Card used"
                  >
                    {paymentCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                  {onAddPaymentCard && (
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => void handleAddCard()}
                      disabled={busy}
                      title="Add another card"
                    >
                      +
                    </button>
                  )}
                </div>
              </label>
              <label className="category-costs-field category-costs-field-notes">
                <span>Note</span>
                <textarea
                  className="entry-notes-input"
                  placeholder="Optional"
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  rows={2}
                />
              </label>
              <button
                type="submit"
                className="category-costs-submit"
                disabled={busy}
              >
                + Add cost
              </button>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

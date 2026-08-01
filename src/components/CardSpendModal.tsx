import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { displayEntryDate, formatCurrency, parseAmount } from '../lib/format'
import type { CardSpendTotal, Category, CategoryEntry } from '../types'

interface CardSpendModalProps {
  card: CardSpendTotal
  categories: Category[]
  entriesByCategory: Record<string, CategoryEntry[]>
  open: boolean
  onClose: () => void
  onSaveDisplay: (displayTotal: number | null) => Promise<void>
  busy?: boolean
}

interface SpendRow {
  id: string
  date: string
  label: string
  categoryName: string
  amount: number
}

export function CardSpendModal({
  card,
  categories,
  entriesByCategory,
  open,
  onClose,
  onSaveDisplay,
  busy,
}: CardSpendModalProps) {
  const [visible, setVisible] = useState(false)
  const [draft, setDraft] = useState(String(Math.round(card.display)))

  const rows = useMemo((): SpendRow[] => {
    const list: SpendRow[] = []
    for (const category of categories) {
      const entries = entriesByCategory[category.id] ?? []
      for (const entry of entries) {
        if (entry.card_id !== card.cardId) continue
        list.push({
          id: entry.id,
          date: entry.entry_date,
          label: entry.label.trim() || category.name,
          categoryName: category.name,
          amount: entry.amount,
        })
      }
    }
    return list.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return a.label.localeCompare(b.label)
    })
  }, [card.cardId, categories, entriesByCategory])

  useEffect(() => {
    setDraft(String(Math.round(card.display)))
  }, [card.display, card.cardId, open])

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    const raf = requestAnimationFrame(() => setVisible(true))
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  async function commitDraft() {
    const value = Math.round(parseAmount(draft))
    setDraft(String(value))
    if (value === Math.round(card.display)) return
    await onSaveDisplay(value)
  }

  async function resetTracked() {
    setDraft(String(Math.round(card.tracked)))
    await onSaveDisplay(null)
  }

  if (!open) return null

  return createPortal(
    <div
      className={`costs-modal-root ${visible ? 'is-open' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="costs-modal section-spend-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${card.name} costs`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="costs-modal-header">
          <div className="costs-modal-title-block">
            <p className="costs-modal-kicker">{card.name}</p>
            <h2>{formatCurrency(Math.round(card.display))}</h2>
          </div>
          <button
            type="button"
            className="ghost small"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </header>

        <div className="costs-modal-body">
          {rows.length === 0 ? (
            <p className="muted center">No tagged costs on this card.</p>
          ) : (
            <ul className="section-spend-list">
              {rows.map((row) => (
                <li key={row.id} className="section-spend-row">
                  <div className="section-spend-main">
                    <span className="section-spend-label">{row.label}</span>
                    {row.label !== row.categoryName && (
                      <span className="section-spend-category muted">
                        {row.categoryName}
                      </span>
                    )}
                  </div>
                  <span className="section-spend-date muted">
                    {displayEntryDate(row.date)}
                  </span>
                  <span className="section-spend-amount">
                    {formatCurrency(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="card-spend-adjust">
            <label className="card-spend-adjust-label">
              Card total
              <span className="money-input">
                <span className="money-input-prefix" aria-hidden="true">
                  $
                </span>
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={draft}
                  disabled={busy}
                  aria-label={`${card.name} total`}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => void commitDraft()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                />
              </span>
            </label>
            {card.isOverridden && (
              <button
                type="button"
                className="ghost small"
                disabled={busy}
                onClick={() => void resetTracked()}
                title={`Reset to tracked $${Math.round(card.tracked)}`}
              >
                Reset to tracked
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

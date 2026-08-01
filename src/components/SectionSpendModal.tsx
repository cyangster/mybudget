import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { displayEntryDate, formatCurrency } from '../lib/format'
import type { BudgetSection, Category, CategoryEntry } from '../types'
import { SECTION_LABELS } from '../types'

interface SectionSpendModalProps {
  section: BudgetSection
  categories: Category[]
  entriesByCategory: Record<string, CategoryEntry[]>
  totalSpent: number
  open: boolean
  onClose: () => void
}

interface SpendRow {
  id: string
  date: string
  label: string
  categoryName: string
  amount: number
}

export function SectionSpendModal({
  section,
  categories,
  entriesByCategory,
  totalSpent,
  open,
  onClose,
}: SectionSpendModalProps) {
  const [visible, setVisible] = useState(false)

  const rows = useMemo((): SpendRow[] => {
    const list: SpendRow[] = []
    for (const category of categories) {
      const entries = entriesByCategory[category.id] ?? []
      for (const entry of entries) {
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
  }, [categories, entriesByCategory])

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
        aria-label={`${SECTION_LABELS[section]} spend`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="costs-modal-header">
          <div className="costs-modal-title-block">
            <p className="costs-modal-kicker">{SECTION_LABELS[section]}</p>
            <h2>{formatCurrency(totalSpent)}</h2>
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
            <p className="muted center">No costs yet.</p>
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
        </div>
      </div>
    </div>,
    document.body,
  )
}

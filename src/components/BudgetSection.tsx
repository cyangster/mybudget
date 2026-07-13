import { useMemo, useState, type FormEvent } from 'react'
import { formatCurrency } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'
import type { BudgetSection, Category, CategoryEntry } from '../types'
import { SECTION_LABELS } from '../types'
import { CategoryRow } from './CategoryRow'

interface BudgetSectionProps {
  section: BudgetSection
  categories: Category[]
  entriesByCategory: Record<string, CategoryEntry[]>
  onAdd: (section: BudgetSection, name: string) => Promise<void>
  onSave: (
    id: string,
    patch: Partial<Pick<Category, 'name' | 'budgeted_amount' | 'actual_amount'>>,
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddEntry: (
    categoryId: string,
    amount: number,
    label?: string,
    entryDate?: string,
    notes?: string,
  ) => Promise<void>
  onUpdateEntry: (
    entryId: string,
    categoryId: string,
    patch: Partial<
      Pick<CategoryEntry, 'label' | 'amount' | 'entry_date' | 'notes'>
    >,
  ) => Promise<void>
  onDeleteEntry: (entryId: string, categoryId: string) => Promise<void>
  busy?: boolean
}

export function BudgetSectionView({
  section,
  categories,
  entriesByCategory,
  onAdd,
  onSave,
  onDelete,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  busy,
}: BudgetSectionProps) {
  const isIncome = section === 'income'
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const totals = useMemo(() => {
    const budgeted = categories.reduce((sum, c) => sum + c.budgeted_amount, 0)
    const spent = categories.reduce((sum, c) => sum + c.actual_amount, 0)
    return {
      budgeted,
      spent,
      remaining: budgeted - spent,
    }
  }, [categories])

  const remainingClass =
    totals.remaining > 0
      ? 'positive'
      : totals.remaining < 0
        ? 'negative'
        : ''

  const sectionStatus = amountStatus(totals.budgeted, totals.spent)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    await onAdd(section, newName.trim() || 'New category')
    setNewName('')
    setAdding(false)
  }

  return (
    <section className={`budget-section section-${section} status-${isIncome ? 'empty' : sectionStatus}`}>
      <header className="section-header">
        <div className="section-title-row">
          <h2>{SECTION_LABELS[section]}</h2>
          {!isIncome && sectionStatus !== 'empty' && (
            <span className={`status-pill status-${sectionStatus}`}>
              {statusLabel(sectionStatus)}
            </span>
          )}
        </div>
        {!isIncome && (
          <div className="section-totals" aria-label={`${SECTION_LABELS[section]} totals`}>
            <div>
              <span className="section-total-label">Budgeted</span>
              <span className="section-total-value">
                {formatCurrency(totals.budgeted)}
              </span>
            </div>
            <div>
              <span className="section-total-label">Spent</span>
              <span className="section-total-value">
                {formatCurrency(totals.spent)}
              </span>
            </div>
            <div>
              <span className="section-total-label">Left over</span>
              <span className={`section-total-value ${remainingClass}`}>
                {formatCurrency(totals.remaining)}
              </span>
            </div>
          </div>
        )}
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              {isIncome ? (
                <th className="num">Amount</th>
              ) : (
                <>
                  <th className="num">Budgeted</th>
                  <th className="num">Spent</th>
                  <th className="num">Remaining</th>
                </>
              )}
              <th className="actions-col" />
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={isIncome ? 3 : 5} className="empty">
                  No categories yet.
                </td>
              </tr>
            )}
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                entries={entriesByCategory[cat.id] ?? []}
                isIncome={isIncome}
                onSave={onSave}
                onDelete={isIncome ? undefined : onDelete}
                onAddEntry={isIncome ? undefined : onAddEntry}
                onUpdateEntry={isIncome ? undefined : onUpdateEntry}
                onDeleteEntry={isIncome ? undefined : onDeleteEntry}
                busy={busy}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!isIncome && (
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
      )}
    </section>
  )
}

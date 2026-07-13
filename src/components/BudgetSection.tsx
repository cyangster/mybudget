import { useState, type FormEvent } from 'react'
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
  ) => Promise<void>
  onUpdateEntry: (
    entryId: string,
    categoryId: string,
    patch: Partial<Pick<CategoryEntry, 'label' | 'amount' | 'entry_date'>>,
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

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    await onAdd(section, newName.trim() || 'New category')
    setNewName('')
    setAdding(false)
  }

  return (
    <section className="budget-section">
      <header className="section-header">
        <h2>{SECTION_LABELS[section]}</h2>
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

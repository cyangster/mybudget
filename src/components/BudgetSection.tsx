import { useState, type FormEvent } from 'react'
import type { BudgetSection, Category } from '../types'
import { SECTION_LABELS } from '../types'
import { CategoryRow } from './CategoryRow'

interface BudgetSectionProps {
  section: BudgetSection
  categories: Category[]
  onAdd: (section: BudgetSection, name: string) => Promise<void>
  onSave: (
    id: string,
    patch: Partial<Pick<Category, 'name' | 'budgeted_amount' | 'actual_amount'>>,
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  busy?: boolean
}

export function BudgetSectionView({
  section,
  categories,
  onAdd,
  onSave,
  onDelete,
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
                  <th className="num">Actual</th>
                </>
              )}
              <th className="actions-col" />
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={isIncome ? 3 : 4} className="empty">
                  No categories yet.
                </td>
              </tr>
            )}
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                isIncome={isIncome}
                onSave={onSave}
                onDelete={isIncome ? undefined : onDelete}
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

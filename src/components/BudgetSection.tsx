import { useMemo, useState } from 'react'
import { formatCurrency } from '../lib/format'
import { amountStatus, statusLabel } from '../lib/status'
import type {
  BudgetSection,
  Category,
  CategoryEntry,
  PaymentCard,
} from '../types'
import { SECTION_LABELS } from '../types'
import { SectionModal } from './SectionModal'

interface BudgetSectionProps {
  section: BudgetSection
  categories: Category[]
  entriesByCategory: Record<string, CategoryEntry[]>
  paymentCards: PaymentCard[]
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

export function BudgetSectionView({
  section,
  categories,
  entriesByCategory,
  paymentCards,
  onAdd,
  onSave,
  onDelete,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onAddPaymentCard,
  onReorder,
  busy,
}: BudgetSectionProps) {
  const isIncome = section === 'income'
  const [sectionOpen, setSectionOpen] = useState(false)

  const totals = useMemo(() => {
    const counted = categories.filter((c) => !c.excluded_from_budget)
    const budgeted = counted.reduce((sum, c) => sum + c.budgeted_amount, 0)
    const spent = counted.reduce((sum, c) => sum + c.actual_amount, 0)
    return {
      budgeted,
      spent,
      remaining: budgeted - spent,
    }
  }, [categories])

  const sectionStatus = amountStatus(totals.budgeted, totals.spent)

  function openSection() {
    if (isIncome) return
    setSectionOpen(true)
  }

  return (
    <>
      <section
        className={`budget-section section-summary-card section-${section} status-${isIncome ? 'empty' : sectionStatus}`}
      >
        <div className="section-summary-body">
          <header className="section-summary-header">
            <button
              type="button"
              className="section-summary-open-zone"
              onClick={openSection}
              disabled={isIncome}
              aria-haspopup={isIncome ? undefined : 'dialog'}
              title={isIncome ? undefined : `Open ${SECTION_LABELS[section]}`}
            >
              <div className="section-summary-title-row">
                <h2>{SECTION_LABELS[section]}</h2>
                {!isIncome && sectionStatus !== 'empty' && (
                  <span className={`status-pill status-${sectionStatus}`}>
                    {statusLabel(sectionStatus)}
                  </span>
                )}
              </div>
              {!isIncome && (
                <div className="section-summary-totals">
                  <span>
                    <span className="section-summary-total-label">Budgeted</span>
                    <span className="section-summary-total-value amount-budgeted">
                      {formatCurrency(totals.budgeted)}
                    </span>
                  </span>
                  <span>
                    <span className="section-summary-total-label">Spent</span>
                    <span className="section-summary-total-value amount-spent">
                      {formatCurrency(totals.spent)}
                    </span>
                  </span>
                  <span>
                    <span className="section-summary-total-label">Left</span>
                    <span
                      className={`section-summary-total-value ${
                        totals.remaining > 0
                          ? 'positive'
                          : totals.remaining < 0
                            ? 'negative'
                            : ''
                      }`}
                    >
                      {formatCurrency(totals.remaining)}
                    </span>
                  </span>
                </div>
              )}
            </button>
          </header>

          <div className="section-summary-list">
            {categories.length === 0 ? (
              <p className="section-summary-empty muted">No categories yet</p>
            ) : (
              <>
                <div className="section-summary-cols" aria-hidden="true">
                  <span className="section-summary-check-col" />
                  <span>Category</span>
                  <span>Budgeted</span>
                  <span>Spent</span>
                  <span>Left</span>
                </div>
                <ul>
                  {categories.map((cat) => {
                    const left = cat.budgeted_amount - cat.actual_amount
                    const leftClass =
                      left > 0 ? 'positive' : left < 0 ? 'negative' : ''
                    return (
                      <li
                        key={cat.id}
                        className={
                          cat.excluded_from_budget
                            ? 'section-summary-row is-excluded'
                            : 'section-summary-row'
                        }
                      >
                        {!isIncome ? (
                          <input
                            type="checkbox"
                            className="include-check section-summary-check"
                            checked={!cat.excluded_from_budget}
                            disabled={busy}
                            title={
                              cat.excluded_from_budget
                                ? 'Off: shown only, not in totals'
                                : 'On: included in totals'
                            }
                            aria-label={`Include ${cat.name} in budget totals`}
                            onChange={(e) => {
                              void onSave(cat.id, {
                                excluded_from_budget: !e.target.checked,
                              })
                            }}
                          />
                        ) : (
                          <span className="section-summary-check-col" />
                        )}
                        <button
                          type="button"
                          className="section-summary-name"
                          onClick={openSection}
                          disabled={isIncome || busy}
                          title={`Open ${cat.name}`}
                        >
                          {cat.name}
                        </button>
                        <span className="section-summary-amount amount-budgeted">
                          {formatCurrency(cat.budgeted_amount)}
                        </span>
                        <span className="section-summary-amount amount-spent">
                          {formatCurrency(cat.actual_amount)}
                        </span>
                        <span
                          className={`section-summary-amount ${leftClass}`}
                        >
                          {formatCurrency(left)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>

          {!isIncome && (
            <footer className="section-summary-footer">
              <button
                type="button"
                className="section-summary-open-zone"
                onClick={openSection}
                aria-haspopup="dialog"
              >
                Open for details
              </button>
            </footer>
          )}
        </div>
      </section>

      {!isIncome && (
        <SectionModal
          section={section}
          categories={categories}
          entriesByCategory={entriesByCategory}
          paymentCards={paymentCards}
          open={sectionOpen}
          onClose={() => setSectionOpen(false)}
          onAdd={onAdd}
          onSave={onSave}
          onDelete={onDelete}
          onAddEntry={onAddEntry}
          onUpdateEntry={onUpdateEntry}
          onDeleteEntry={onDeleteEntry}
          onAddPaymentCard={onAddPaymentCard}
          onReorder={onReorder}
          busy={busy}
        />
      )}
    </>
  )
}

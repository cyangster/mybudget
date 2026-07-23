import { useEffect, useMemo, useState } from 'react'
import {
  CARD_FIELD_CATALOG,
  loadCardDashboardFields,
  resolveCycleDate,
  saveCardDashboardFields,
  type CardDashboardField,
} from '../lib/cardDashboard'
import { displayEntryDate, formatCurrency, parseAmount } from '../lib/format'
import type { CardSpendTotal, PaymentCard } from '../types'

type DueTone = 'ok' | 'soon' | 'urgent' | 'overdue' | 'none'

interface CreditCardsPageProps {
  monthLabel: string | null
  paymentCards: PaymentCard[]
  cardSpendTotals: CardSpendTotal[]
  onAddPaymentCard: (name: string) => Promise<PaymentCard | null>
  onUpdatePaymentCard: (
    id: string,
    patch: Partial<
      Pick<
        PaymentCard,
        | 'name'
        | 'total_balance'
        | 'statement_balance'
        | 'minimum_payment'
        | 'payment_due_day'
        | 'payment_due_month_offset'
        | 'next_closing_day'
        | 'next_closing_month_offset'
      >
    >,
  ) => Promise<void>
  busy?: boolean
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return null
  const due = new Date(y, m - 1, d)
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due.getTime() - start.getTime()) / 86_400_000)
}

function dueTone(isoDate: string | null): DueTone {
  const days = daysUntil(isoDate)
  if (days === null) return 'none'
  if (days < 0) return 'overdue'
  if (days <= 2) return 'urgent'
  if (days <= 7) return 'soon'
  return 'ok'
}

function dueLabel(isoDate: string | null): string {
  const days = daysUntil(isoDate)
  if (days === null) return 'No due date'
  if (days < 0)
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

function clampDay(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return null
  return Math.min(31, Math.max(1, n))
}

export function CreditCardsPage({
  monthLabel,
  paymentCards,
  cardSpendTotals,
  onAddPaymentCard,
  onUpdatePaymentCard,
  busy,
}: CreditCardsPageProps) {
  const spendByCard = useMemo(() => {
    const map = new Map<string, CardSpendTotal>()
    for (const row of cardSpendTotals) map.set(row.cardId, row)
    return map
  }, [cardSpendTotals])

  const [visibleFields, setVisibleFields] = useState<CardDashboardField[]>(() =>
    loadCardDashboardFields(),
  )
  const [catalogOpen, setCatalogOpen] = useState(false)

  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        name: string
        total_balance: string
        statement_balance: string
        minimum_payment: string
        payment_due_day: string
        payment_due_month_offset: string
        next_closing_day: string
        next_closing_month_offset: string
      }
    >
  >({})

  useEffect(() => {
    const next: typeof drafts = {}
    for (const card of paymentCards) {
      next[card.id] = {
        name: card.name,
        total_balance: String(card.total_balance),
        statement_balance: String(card.statement_balance),
        minimum_payment: String(card.minimum_payment),
        payment_due_day:
          card.payment_due_day != null ? String(card.payment_due_day) : '',
        payment_due_month_offset: String(card.payment_due_month_offset ?? 0),
        next_closing_day:
          card.next_closing_day != null ? String(card.next_closing_day) : '',
        next_closing_month_offset: String(
          card.next_closing_month_offset ?? 1,
        ),
      }
    }
    setDrafts(next)
  }, [paymentCards])

  function setDraft(
    cardId: string,
    field: keyof (typeof drafts)[string],
    value: string,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        [field]: value,
      },
    }))
  }

  function toggleField(id: CardDashboardField) {
    setVisibleFields((prev) => {
      const next = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id]
      const ordered = CARD_FIELD_CATALOG.map((f) => f.id).filter((f) =>
        next.includes(f),
      )
      saveCardDashboardFields(ordered)
      return ordered
    })
  }

  async function commitName(card: PaymentCard) {
    const draft = drafts[card.id]
    if (!draft) return
    const next = draft.name.trim() || card.name
    if (next === card.name) {
      setDraft(card.id, 'name', card.name)
      return
    }
    await onUpdatePaymentCard(card.id, { name: next })
  }

  async function commitAmount(
    card: PaymentCard,
    field: 'total_balance' | 'statement_balance' | 'minimum_payment',
  ) {
    const draft = drafts[card.id]
    if (!draft) return
    const next = parseAmount(draft[field])
    if (next === card[field]) {
      setDraft(card.id, field, String(card[field]))
      return
    }
    setDraft(card.id, field, String(next))
    await onUpdatePaymentCard(card.id, { [field]: next })
  }

  async function commitDueDay(card: PaymentCard) {
    const draft = drafts[card.id]
    if (!draft) return
    const next = clampDay(draft.payment_due_day)
    setDraft(
      card.id,
      'payment_due_day',
      next != null ? String(next) : '',
    )
    if (next === card.payment_due_day) return
    await onUpdatePaymentCard(card.id, { payment_due_day: next })
  }

  async function commitClosingDay(card: PaymentCard) {
    const draft = drafts[card.id]
    if (!draft) return
    const next = clampDay(draft.next_closing_day)
    setDraft(
      card.id,
      'next_closing_day',
      next != null ? String(next) : '',
    )
    if (next === card.next_closing_day) return
    await onUpdatePaymentCard(card.id, { next_closing_day: next })
  }

  async function commitDueOffset(card: PaymentCard, value: string) {
    const next = Number(value)
    setDraft(card.id, 'payment_due_month_offset', String(next))
    if (next === card.payment_due_month_offset) return
    await onUpdatePaymentCard(card.id, { payment_due_month_offset: next })
  }

  async function commitClosingOffset(card: PaymentCard, value: string) {
    const next = Number(value)
    setDraft(card.id, 'next_closing_month_offset', String(next))
    if (next === card.next_closing_month_offset) return
    await onUpdatePaymentCard(card.id, { next_closing_month_offset: next })
  }

  async function handleAddCard() {
    const name = window.prompt('New card name')
    if (!name?.trim()) return
    await onAddPaymentCard(name.trim())
  }

  const show = (id: CardDashboardField) => visibleFields.includes(id)

  return (
    <section className="credit-cards-page" aria-label="Credit cards">
      <header className="credit-cards-page-header">
        <div>
          <h2>Credit cards</h2>
          <p className="muted">
            Pick which fields to show. Due and closing dates follow the selected
            budget month (closing is usually next month).
          </p>
        </div>
        <div className="credit-cards-page-actions">
          <button
            type="button"
            className="ghost small"
            onClick={() => setCatalogOpen((v) => !v)}
          >
            {catalogOpen ? 'Hide catalog' : 'Field catalog'}
          </button>
          <button
            type="button"
            className="ghost small"
            onClick={() => void handleAddCard()}
            disabled={busy}
          >
            + Add card
          </button>
        </div>
      </header>

      {catalogOpen && (
        <div className="card-field-catalog" aria-label="Field catalog">
          <p className="card-field-catalog-title">Show on dashboard</p>
          <div className="card-field-catalog-list">
            {CARD_FIELD_CATALOG.map((item) => {
              const checked = visibleFields.includes(item.id)
              return (
                <label key={item.id} className="card-field-catalog-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleField(item.id)}
                  />
                  <span>
                    <strong>{item.label}</strong>
                    <em>{item.description}</em>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {paymentCards.length === 0 ? (
        <p className="muted center">No cards yet. Add Freedom or another card.</p>
      ) : visibleFields.length === 0 ? (
        <p className="muted center">
          No fields selected. Open Field catalog and check what you want to show.
        </p>
      ) : (
        <div className="credit-cards-grid">
          {paymentCards.map((card) => {
            const draft = drafts[card.id]
            if (!draft) return null

            const dueDate = monthLabel
              ? resolveCycleDate(
                  monthLabel,
                  card.payment_due_day,
                  card.payment_due_month_offset,
                )
              : null
            const closingDate = monthLabel
              ? resolveCycleDate(
                  monthLabel,
                  card.next_closing_day,
                  card.next_closing_month_offset,
                )
              : null
            const tone = dueTone(dueDate)
            const spend = spendByCard.get(card.id)

            return (
              <article
                key={card.id}
                className={`credit-card-panel tone-due-${tone}`}
              >
                <header className="credit-card-panel-header">
                  <input
                    className="credit-card-name-input"
                    value={draft.name}
                    disabled={busy}
                    aria-label="Card name"
                    onChange={(e) => setDraft(card.id, 'name', e.target.value)}
                    onBlur={() => void commitName(card)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                  />
                  {show('payment_due') && (
                    <span className={`credit-card-due-pill tone-due-${tone}`}>
                      {dueLabel(dueDate)}
                    </span>
                  )}
                </header>

                <div className="credit-card-fields">
                  {show('total_balance') && (
                    <label>
                      Total balance
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={draft.total_balance}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft(card.id, 'total_balance', e.target.value)
                        }
                        onBlur={() => void commitAmount(card, 'total_balance')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                      />
                    </label>
                  )}
                  {show('statement_balance') && (
                    <label>
                      Statement balance
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={draft.statement_balance}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft(
                            card.id,
                            'statement_balance',
                            e.target.value,
                          )
                        }
                        onBlur={() =>
                          void commitAmount(card, 'statement_balance')
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                      />
                    </label>
                  )}
                  {show('minimum_payment') && (
                    <label>
                      Minimum
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={draft.minimum_payment}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft(card.id, 'minimum_payment', e.target.value)
                        }
                        onBlur={() =>
                          void commitAmount(card, 'minimum_payment')
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                      />
                    </label>
                  )}
                  {show('payment_due') && (
                    <label className="credit-card-cycle-field">
                      Payment due day
                      <div className="credit-card-cycle-row">
                        <input
                          type="number"
                          min={1}
                          max={31}
                          inputMode="numeric"
                          placeholder="Day"
                          value={draft.payment_due_day}
                          disabled={busy}
                          onChange={(e) =>
                            setDraft(
                              card.id,
                              'payment_due_day',
                              e.target.value,
                            )
                          }
                          onBlur={() => void commitDueDay(card)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                        />
                        <select
                          value={draft.payment_due_month_offset}
                          disabled={busy}
                          aria-label="Payment due month"
                          onChange={(e) =>
                            void commitDueOffset(card, e.target.value)
                          }
                        >
                          <option value="0">This month</option>
                          <option value="1">Next month</option>
                        </select>
                      </div>
                      {dueDate && (
                        <span className="credit-card-resolved muted">
                          → {displayEntryDate(dueDate)}
                        </span>
                      )}
                    </label>
                  )}
                  {show('next_closing') && (
                    <label className="credit-card-cycle-field">
                      Next closing day
                      <div className="credit-card-cycle-row">
                        <input
                          type="number"
                          min={1}
                          max={31}
                          inputMode="numeric"
                          placeholder="Day"
                          value={draft.next_closing_day}
                          disabled={busy}
                          onChange={(e) =>
                            setDraft(
                              card.id,
                              'next_closing_day',
                              e.target.value,
                            )
                          }
                          onBlur={() => void commitClosingDay(card)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                        />
                        <select
                          value={draft.next_closing_month_offset}
                          disabled={busy}
                          aria-label="Closing month"
                          onChange={(e) =>
                            void commitClosingOffset(card, e.target.value)
                          }
                        >
                          <option value="0">This month</option>
                          <option value="1">Next month</option>
                        </select>
                      </div>
                      {closingDate && (
                        <span className="credit-card-resolved muted">
                          → {displayEntryDate(closingDate)}
                        </span>
                      )}
                    </label>
                  )}
                </div>

                {show('month_spend') && (
                  <footer className="credit-card-panel-footer">
                    <span className="muted">
                      This month:{' '}
                      {spend
                        ? `${spend.entryCount} cost${spend.entryCount === 1 ? '' : 's'} · ${formatCurrency(Math.round(spend.display))}`
                        : '0 costs'}
                    </span>
                    {show('next_closing') && closingDate ? (
                      <span className="muted">
                        Closes {displayEntryDate(closingDate)}
                      </span>
                    ) : null}
                  </footer>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

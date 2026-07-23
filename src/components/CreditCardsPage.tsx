import { useEffect, useMemo, useState } from 'react'
import { displayEntryDate, formatCurrency, parseAmount } from '../lib/format'
import type { CardSpendTotal, PaymentCard } from '../types'

type DueTone = 'ok' | 'soon' | 'urgent' | 'overdue' | 'none'

interface CreditCardsPageProps {
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
        | 'payment_due_date'
        | 'next_closing_date'
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
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

export function CreditCardsPage({
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

  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        name: string
        total_balance: string
        statement_balance: string
        minimum_payment: string
        payment_due_date: string
        next_closing_date: string
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
        payment_due_date: card.payment_due_date ?? '',
        next_closing_date: card.next_closing_date ?? '',
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

  async function commitDate(
    card: PaymentCard,
    field: 'payment_due_date' | 'next_closing_date',
  ) {
    const draft = drafts[card.id]
    if (!draft) return
    const raw = draft[field].trim()
    const next = raw || null
    if (next === card[field]) return
    await onUpdatePaymentCard(card.id, { [field]: next })
  }

  async function handleAddCard() {
    const name = window.prompt('New card name')
    if (!name?.trim()) return
    await onAddPaymentCard(name.trim())
  }

  return (
    <section className="credit-cards-page" aria-label="Credit cards">
      <header className="credit-cards-page-header">
        <div>
          <h2>Credit cards</h2>
          <p className="muted">
            Same cards as cost tags. Update balances from your statement — not
            linked to Chase yet.
          </p>
        </div>
        <button
          type="button"
          className="ghost small"
          onClick={() => void handleAddCard()}
          disabled={busy}
        >
          + Add card
        </button>
      </header>

      {paymentCards.length === 0 ? (
        <p className="muted center">No cards yet. Add Freedom or another card.</p>
      ) : (
        <div className="credit-cards-grid">
          {paymentCards.map((card) => {
            const draft = drafts[card.id]
            if (!draft) return null
            const tone = dueTone(card.payment_due_date)
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
                  <span className={`credit-card-due-pill tone-due-${tone}`}>
                    {dueLabel(card.payment_due_date)}
                  </span>
                </header>

                <div className="credit-card-fields">
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
                  <label>
                    Statement balance
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={draft.statement_balance}
                      disabled={busy}
                      onChange={(e) =>
                        setDraft(card.id, 'statement_balance', e.target.value)
                      }
                      onBlur={() =>
                        void commitAmount(card, 'statement_balance')
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                    />
                  </label>
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
                      onBlur={() => void commitAmount(card, 'minimum_payment')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                    />
                  </label>
                  <label>
                    Payment due
                    <input
                      type="date"
                      value={draft.payment_due_date}
                      disabled={busy}
                      onChange={(e) =>
                        setDraft(card.id, 'payment_due_date', e.target.value)
                      }
                      onBlur={() => void commitDate(card, 'payment_due_date')}
                    />
                  </label>
                  <label>
                    Next closing
                    <input
                      type="date"
                      value={draft.next_closing_date}
                      disabled={busy}
                      onChange={(e) =>
                        setDraft(card.id, 'next_closing_date', e.target.value)
                      }
                      onBlur={() => void commitDate(card, 'next_closing_date')}
                    />
                  </label>
                </div>

                <footer className="credit-card-panel-footer">
                  <span className="muted">
                    This month:{' '}
                    {spend
                      ? `${spend.entryCount} cost${spend.entryCount === 1 ? '' : 's'} · ${formatCurrency(Math.round(spend.display))}`
                      : '0 costs'}
                  </span>
                  {card.next_closing_date ? (
                    <span className="muted">
                      Closes {displayEntryDate(card.next_closing_date)}
                    </span>
                  ) : null}
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

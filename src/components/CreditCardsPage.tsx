import { useEffect, useMemo, useState } from 'react'
import {
  BUILTIN_CARD_FIELD_CATALOG,
  loadCardDashboardFields,
  loadCardFieldCatalog,
  loadVisibleDashboardCardIds,
  newCustomFieldId,
  resolveCycleDate,
  saveCardDashboardFields,
  saveCardFieldCatalog,
  saveVisibleDashboardCardIds,
  type CardDashboardField,
  type CardFieldCatalogItem,
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
        | 'statement_balance_as_of'
        | 'minimum_payment'
        | 'payment_due_day'
        | 'payment_due_month_offset'
        | 'next_closing_day'
        | 'next_closing_month_offset'
        | 'custom_fields'
      >
    >,
  ) => Promise<void>
  onDeletePaymentCard: (id: string) => Promise<void>
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
  onDeletePaymentCard,
  busy,
}: CreditCardsPageProps) {
  const spendByCard = useMemo(() => {
    const map = new Map<string, CardSpendTotal>()
    for (const row of cardSpendTotals) map.set(row.cardId, row)
    return map
  }, [cardSpendTotals])

  const [fieldCatalog, setFieldCatalog] = useState<CardFieldCatalogItem[]>(() =>
    loadCardFieldCatalog(),
  )
  const [visibleFields, setVisibleFields] = useState<CardDashboardField[]>(() =>
    loadCardDashboardFields(loadCardFieldCatalog()),
  )
  const [visibleCardIds, setVisibleCardIds] = useState<string[]>([])
  const [catalogOpen, setCatalogOpen] = useState(false)

  useEffect(() => {
    setVisibleCardIds(
      loadVisibleDashboardCardIds(paymentCards.map((c) => c.id)),
    )
  }, [paymentCards])

  const dashboardCards = useMemo(
    () => paymentCards.filter((c) => visibleCardIds.includes(c.id)),
    [paymentCards, visibleCardIds],
  )

  const removedBuiltIns = useMemo(() => {
    const present = new Set(fieldCatalog.map((f) => f.id))
    return BUILTIN_CARD_FIELD_CATALOG.filter((f) => !present.has(f.id))
  }, [fieldCatalog])

  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        name: string
        total_balance: string
        statement_balance: string
        statement_balance_as_of: string
        minimum_payment: string
        payment_due_day: string
        payment_due_month_offset: string
        next_closing_day: string
        next_closing_month_offset: string
        custom: Record<string, string>
      }
    >
  >({})

  useEffect(() => {
    const next: typeof drafts = {}
    for (const card of paymentCards) {
      const custom: Record<string, string> = {}
      for (const field of fieldCatalog) {
        if (field.kind !== 'custom') continue
        custom[field.id] = String(card.custom_fields[field.id] ?? 0)
      }
      next[card.id] = {
        name: card.name,
        total_balance: String(card.total_balance),
        statement_balance: String(card.statement_balance),
        statement_balance_as_of: card.statement_balance_as_of ?? '',
        minimum_payment: String(card.minimum_payment),
        payment_due_day:
          card.payment_due_day != null ? String(card.payment_due_day) : '',
        payment_due_month_offset: String(card.payment_due_month_offset ?? 0),
        next_closing_day:
          card.next_closing_day != null ? String(card.next_closing_day) : '',
        next_closing_month_offset: String(card.next_closing_month_offset ?? 1),
        custom,
      }
    }
    setDrafts(next)
  }, [paymentCards, fieldCatalog])

  function setDraft(
    cardId: string,
    field: Exclude<keyof (typeof drafts)[string], 'custom'>,
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

  function setCustomDraft(cardId: string, fieldId: string, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        custom: {
          ...prev[cardId].custom,
          [fieldId]: value,
        },
      },
    }))
  }

  function persistFieldCatalog(next: CardFieldCatalogItem[]) {
    saveCardFieldCatalog(next)
    setFieldCatalog(next)
    setVisibleFields((prev) => {
      const allowed = new Set(next.map((f) => f.id))
      const filtered = prev.filter((id) => allowed.has(id))
      saveCardDashboardFields(filtered)
      return filtered
    })
  }

  function toggleField(id: CardDashboardField) {
    setVisibleFields((prev) => {
      const next = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id]
      const ordered = fieldCatalog
        .map((f) => f.id)
        .filter((f) => next.includes(f))
      saveCardDashboardFields(ordered)
      return ordered
    })
  }

  function toggleCard(id: string) {
    setVisibleCardIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id]
      const ordered = paymentCards
        .map((c) => c.id)
        .filter((cardId) => next.includes(cardId))
      saveVisibleDashboardCardIds(ordered)
      return ordered
    })
  }

  function renameCatalogField(id: CardDashboardField, label: string) {
    persistFieldCatalog(
      fieldCatalog.map((f) =>
        f.id === id ? { ...f, label: label.trim() || f.label } : f,
      ),
    )
  }

  function deleteCatalogField(id: CardDashboardField) {
    const item = fieldCatalog.find((f) => f.id === id)
    if (!item) return
    const ok = window.confirm(
      item.kind === 'custom'
        ? `Remove custom field “${item.label}” from the catalog?`
        : `Remove “${item.label}” from the catalog? You can add it back later.`,
    )
    if (!ok) return
    persistFieldCatalog(fieldCatalog.filter((f) => f.id !== id))
  }

  function restoreBuiltInField(id: string) {
    const item = BUILTIN_CARD_FIELD_CATALOG.find((f) => f.id === id)
    if (!item) return
    if (fieldCatalog.some((f) => f.id === id)) return
    persistFieldCatalog([...fieldCatalog, item])
  }

  function addCustomField() {
    const label = window.prompt('Custom field name (amount)')
    if (!label?.trim()) return
    const item: CardFieldCatalogItem = {
      id: newCustomFieldId(),
      label: label.trim(),
      description: 'Custom amount',
      kind: 'custom',
    }
    persistFieldCatalog([...fieldCatalog, item])
  }

  async function handleDeleteCard(card: PaymentCard) {
    const ok = window.confirm(
      `Delete “${card.name}” permanently? Costs tagged to it will keep their amounts but lose the card tag.`,
    )
    if (!ok) return
    await onDeletePaymentCard(card.id)
    setVisibleCardIds((prev) => {
      const next = prev.filter((id) => id !== card.id)
      saveVisibleDashboardCardIds(next)
      return next
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

  async function commitStatementAsOf(card: PaymentCard) {
    const draft = drafts[card.id]
    if (!draft) return
    const next = draft.statement_balance_as_of.trim() || null
    if (next === card.statement_balance_as_of) return
    await onUpdatePaymentCard(card.id, { statement_balance_as_of: next })
  }

  async function commitCustomAmount(card: PaymentCard, fieldId: string) {
    const draft = drafts[card.id]
    if (!draft) return
    const next = parseAmount(draft.custom[fieldId] ?? '0')
    const current = card.custom_fields[fieldId] ?? 0
    if (next === current) {
      setCustomDraft(card.id, fieldId, String(current))
      return
    }
    setCustomDraft(card.id, fieldId, String(next))
    await onUpdatePaymentCard(card.id, {
      custom_fields: {
        ...card.custom_fields,
        [fieldId]: next,
      },
    })
  }

  async function commitDueDay(card: PaymentCard) {
    const draft = drafts[card.id]
    if (!draft) return
    const next = clampDay(draft.payment_due_day)
    setDraft(card.id, 'payment_due_day', next != null ? String(next) : '')
    if (next === card.payment_due_day) return
    await onUpdatePaymentCard(card.id, { payment_due_day: next })
  }

  async function commitClosingDay(card: PaymentCard) {
    const draft = drafts[card.id]
    if (!draft) return
    const next = clampDay(draft.next_closing_day)
    setDraft(card.id, 'next_closing_day', next != null ? String(next) : '')
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
            Use Catalog to add, rename, show, or delete cards and fields.
            Nothing appears until you choose what to show.
          </p>
        </div>
        <div className="credit-cards-page-actions">
          <button
            type="button"
            className="ghost small"
            onClick={() => setCatalogOpen((v) => !v)}
          >
            {catalogOpen ? 'Hide catalog' : 'Catalog'}
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
        <div className="card-field-catalog" aria-label="Dashboard catalog">
          <div className="card-field-catalog-section-head">
            <p className="card-field-catalog-title">Cards</p>
            <button
              type="button"
              className="ghost small"
              onClick={() => void handleAddCard()}
              disabled={busy}
            >
              + Add
            </button>
          </div>
          {paymentCards.length === 0 ? (
            <p className="muted">No cards yet. Add one first.</p>
          ) : (
            <div className="card-field-catalog-list">
              {paymentCards.map((card) => {
                const checked = visibleCardIds.includes(card.id)
                const draftName = drafts[card.id]?.name ?? card.name
                return (
                  <div key={card.id} className="card-field-catalog-item is-manage">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCard(card.id)}
                      aria-label={`Show ${card.name} on dashboard`}
                      title="Show on dashboard"
                    />
                    <input
                      className="card-catalog-rename"
                      value={draftName}
                      disabled={busy}
                      aria-label={`Rename ${card.name}`}
                      onChange={(e) =>
                        setDraft(card.id, 'name', e.target.value)
                      }
                      onBlur={() => void commitName(card)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                    />
                    <button
                      type="button"
                      className="ghost small danger-text"
                      disabled={busy}
                      onClick={() => void handleDeleteCard(card)}
                    >
                      Delete
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div className="card-field-catalog-section-head">
            <p className="card-field-catalog-title">Fields</p>
            <button
              type="button"
              className="ghost small"
              onClick={addCustomField}
            >
              + Custom field
            </button>
          </div>
          <div className="card-field-catalog-list">
            {fieldCatalog.map((item) => {
              const checked = visibleFields.includes(item.id)
              return (
                <div key={item.id} className="card-field-catalog-item is-manage">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleField(item.id)}
                    aria-label={`Show ${item.label}`}
                    title="Show on dashboard"
                  />
                  <input
                    className="card-catalog-rename"
                    value={item.label}
                    aria-label={`Rename field ${item.label}`}
                    onChange={(e) =>
                      renameCatalogField(item.id, e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="ghost small danger-text"
                    onClick={() => deleteCatalogField(item.id)}
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>

          {removedBuiltIns.length > 0 && (
            <div className="card-field-restore">
              <p className="card-field-catalog-title">Add back</p>
              <div className="card-field-restore-list">
                {removedBuiltIns.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="ghost small"
                    onClick={() => restoreBuiltInField(item.id)}
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {paymentCards.length === 0 ? (
        <p className="muted center">No cards yet. Add Freedom or another card.</p>
      ) : dashboardCards.length === 0 ? (
        <p className="muted center">
          No cards selected. Open Catalog and check the cards you want.
        </p>
      ) : visibleFields.length === 0 ? (
        <p className="muted center">
          No fields selected. Open Catalog and check what you want to show.
        </p>
      ) : (
        <div className="credit-cards-grid">
          {dashboardCards.map((card) => {
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
                      {fieldCatalog.find((f) => f.id === 'total_balance')
                        ?.label ?? 'Total balance'}
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
                    <label className="credit-card-statement-field">
                      {fieldCatalog.find((f) => f.id === 'statement_balance')
                        ?.label ?? 'Statement balance'}
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
                      <span className="credit-card-as-of-row">
                        <span className="credit-card-as-of-label">as of</span>
                        <input
                          type="date"
                          value={draft.statement_balance_as_of}
                          disabled={busy}
                          aria-label="Statement balance as of date"
                          onChange={(e) =>
                            setDraft(
                              card.id,
                              'statement_balance_as_of',
                              e.target.value,
                            )
                          }
                          onBlur={() => void commitStatementAsOf(card)}
                        />
                      </span>
                      {card.statement_balance_as_of ? (
                        <span className="credit-card-resolved muted">
                          as of {displayEntryDate(card.statement_balance_as_of)}
                        </span>
                      ) : null}
                    </label>
                  )}
                  {show('minimum_payment') && (
                    <label>
                      {fieldCatalog.find((f) => f.id === 'minimum_payment')
                        ?.label ?? 'Minimum'}
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
                      {fieldCatalog.find((f) => f.id === 'payment_due')
                        ?.label ?? 'Payment due'}{' '}
                      day
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
                      {fieldCatalog.find((f) => f.id === 'next_closing')
                        ?.label ?? 'Next closing'}{' '}
                      day
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
                  {fieldCatalog
                    .filter((f) => f.kind === 'custom' && show(f.id))
                    .map((field) => (
                      <label key={field.id}>
                        {field.label}
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={draft.custom[field.id] ?? '0'}
                          disabled={busy}
                          onChange={(e) =>
                            setCustomDraft(card.id, field.id, e.target.value)
                          }
                          onBlur={() =>
                            void commitCustomAmount(card, field.id)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                        />
                      </label>
                    ))}
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

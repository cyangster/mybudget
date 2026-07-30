import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  loadCalendarVisibleCardIds,
  saveCalendarVisibleCardIds,
} from '../lib/calendarPrefs'
import { displayMonthLabel, formatCurrency, parseAmount } from '../lib/format'
import type { CardSpendTotal } from '../types'

interface SpendCalendarProps {
  monthId: string
  monthLabel: string
  monthNotes: string
  dailyTotals: Record<string, number>
  totalBudgeted: number
  leftover: number
  cardSpendTotals: CardSpendTotal[]
  onSaveCardDisplay: (cardId: string, displayTotal: number | null) => Promise<void>
  onAddPaymentCard: (name: string) => Promise<unknown>
  onSaveMonthNotes: (notes: string) => Promise<void>
  busy?: boolean
}

type DayTone = 'none' | 'low' | 'mid' | 'high' | 'spike'

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function formatDayKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function formatDaySpend(amount: number): string {
  const dollars = Math.round(amount)
  return `$${dollars}`
}

function toneForSpend(amount: number, dailyPace: number, maxSpend: number): DayTone {
  if (amount <= 0) return 'none'

  if (dailyPace > 0) {
    const ratio = amount / dailyPace
    if (ratio <= 0.5) return 'low'
    if (ratio <= 1) return 'mid'
    if (ratio <= 1.5) return 'high'
    return 'spike'
  }

  if (maxSpend <= 0) return 'none'
  const ratio = amount / maxSpend
  if (ratio <= 0.33) return 'low'
  if (ratio <= 0.66) return 'mid'
  if (ratio <= 0.9) return 'high'
  return 'spike'
}

function toneLabel(tone: DayTone, amount: number, dailyPace: number): string {
  if (amount <= 0) return 'No spend'
  if (dailyPace > 0) {
    switch (tone) {
      case 'low':
        return 'Light vs daily budget'
      case 'mid':
        return 'On pace with daily budget'
      case 'high':
        return 'Above daily budget'
      case 'spike':
        return 'Heavy spend day'
      default:
        return ''
    }
  }
  return 'Relative to this month’s biggest day'
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function leftoverClass(amount: number) {
  return amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'positive'
}

function useModalOpen(open: boolean, onClose: () => void) {
  const [visible, setVisible] = useState(false)

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

  return visible
}

export function SpendCalendar({
  monthId,
  monthLabel,
  monthNotes,
  dailyTotals,
  totalBudgeted,
  leftover,
  cardSpendTotals,
  onSaveCardDisplay,
  onAddPaymentCard,
  onSaveMonthNotes,
  busy,
}: SpendCalendarProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [cardsOpen, setCardsOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [visibleCardIds, setVisibleCardIds] = useState<string[]>([])
  const [notesDraft, setNotesDraft] = useState(monthNotes)
  const notesDraftRef = useRef(notesDraft)
  notesDraftRef.current = notesDraft

  const knownIdsKey = cardSpendTotals.map((c) => c.cardId).join('\0')
  const knownIds = useMemo(
    () => (knownIdsKey ? knownIdsKey.split('\0') : []),
    [knownIdsKey],
  )

  const closeCards = useCallback(() => setCardsOpen(false), [])
  const closeNotes = useCallback(() => {
    setNotesOpen(false)
    const draft = notesDraftRef.current
    if (draft !== monthNotes) void onSaveMonthNotes(draft)
  }, [monthNotes, onSaveMonthNotes])

  useEffect(() => {
    setVisibleCardIds(loadCalendarVisibleCardIds(monthId, knownIds))
  }, [monthId, knownIds])

  useEffect(() => {
    setNotesDraft(monthNotes)
  }, [monthNotes, monthId])

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const card of cardSpendTotals) {
      next[card.cardId] = String(Math.round(card.display))
    }
    setDrafts(next)
  }, [cardSpendTotals])

  const visibleCards = useMemo(
    () =>
      cardSpendTotals.filter(
        (c) =>
          visibleCardIds.includes(c.cardId) && Math.round(c.display) !== 0,
      ),
    [cardSpendTotals, visibleCardIds],
  )

  const { cells, dailyPace } = useMemo(() => {
    const [y, m] = monthLabel.split('-').map(Number)
    if (!y || !m) {
      return {
        cells: [] as Array<{
          day: number | null
          key: string
          amount: number
          tone: DayTone
          isToday: boolean
        }>,
        dailyPace: 0,
      }
    }

    const monthIndex = m - 1
    const firstDow = new Date(y, monthIndex, 1).getDay()
    const totalDays = daysInMonth(y, monthIndex)
    const pace = totalBudgeted > 0 ? totalBudgeted / totalDays : 0
    const maxSpend = Math.max(0, ...Object.values(dailyTotals))

    const now = new Date()
    const isCurrentMonth =
      now.getFullYear() === y && now.getMonth() === monthIndex
    const todayDay = now.getDate()

    const result: Array<{
      day: number | null
      key: string
      amount: number
      tone: DayTone
      isToday: boolean
    }> = []

    for (let i = 0; i < firstDow; i++) {
      result.push({
        day: null,
        key: `pad-${i}`,
        amount: 0,
        tone: 'none',
        isToday: false,
      })
    }

    for (let day = 1; day <= totalDays; day++) {
      const key = formatDayKey(y, monthIndex, day)
      const amount = dailyTotals[key] ?? 0
      result.push({
        day,
        key,
        amount,
        tone: toneForSpend(amount, pace, maxSpend),
        isToday: isCurrentMonth && day === todayDay,
      })
    }

    return { cells: result, dailyPace: pace }
  }, [monthLabel, dailyTotals, totalBudgeted])

  function persistVisible(next: string[]) {
    setVisibleCardIds(next)
    saveCalendarVisibleCardIds(monthId, knownIds, next)
  }

  function toggleCardVisible(cardId: string) {
    persistVisible(
      visibleCardIds.includes(cardId)
        ? visibleCardIds.filter((id) => id !== cardId)
        : [...visibleCardIds, cardId],
    )
  }

  async function commitCardDraft(card: CardSpendTotal) {
    const raw = drafts[card.cardId]
    if (raw === undefined) return
    const value = Math.round(parseAmount(raw))
    setDrafts((prev) => ({ ...prev, [card.cardId]: String(value) }))
    await onSaveCardDisplay(card.cardId, value)
  }

  async function resetCard(card: CardSpendTotal) {
    setDrafts((prev) => ({
      ...prev,
      [card.cardId]: String(Math.round(card.tracked)),
    }))
    await onSaveCardDisplay(card.cardId, null)
  }

  async function handleAddCard() {
    const name = window.prompt('New card name')
    if (!name?.trim()) return
    await onAddPaymentCard(name.trim())
  }

  async function commitNotes() {
    if (notesDraft === monthNotes) return
    await onSaveMonthNotes(notesDraft)
  }

  const cardsModalVisible = useModalOpen(cardsOpen, closeCards)
  const notesModalVisible = useModalOpen(notesOpen, closeNotes)

  return (
    <aside className="spend-calendar" aria-label="Daily spending calendar">
      <div className="spend-calendar-scroll">
        <header className="spend-calendar-header">
          <h2>Daily spend</h2>
          <span className="muted">{displayMonthLabel(monthLabel)}</span>
          {dailyPace > 0 && (
            <span className="spend-calendar-pace muted">
              Daily budget pace {formatCurrency(dailyPace)}
            </span>
          )}
        </header>

        <div className="spend-calendar-legend" aria-label="Spend color legend">
          <span className="spend-legend-item tone-none">None</span>
          <span className="spend-legend-item tone-low">Light</span>
          <span className="spend-legend-item tone-mid">On pace</span>
          <span className="spend-legend-item tone-high">High</span>
          <span className="spend-legend-item tone-spike">Spike</span>
        </div>

        <div className="spend-calendar-weekdays">
          {WEEKDAYS.map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>

        <div className="spend-calendar-grid">
          {cells.map((cell) =>
            cell.day === null ? (
              <div key={cell.key} className="spend-day empty" />
            ) : (
              <div
                key={cell.key}
                className={`spend-day tone-${cell.tone}${cell.isToday ? ' is-today' : ''}`}
                title={`${formatCurrency(cell.amount)} on day ${cell.day} — ${toneLabel(cell.tone, cell.amount, dailyPace)}`}
              >
                <span className="spend-day-num">{cell.day}</span>
                <span className="spend-day-amt">
                  {formatDaySpend(cell.amount)}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="spend-calendar-actions">
        <button
          type="button"
          className="spend-calendar-action-btn"
          onClick={() => setCardsOpen(true)}
        >
          Cards
          {visibleCards.length > 0 ? (
            <span className="spend-calendar-action-count">
              {visibleCards.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={`spend-calendar-action-btn${monthNotes.trim() ? ' has-content' : ''}`}
          onClick={() => setNotesOpen(true)}
        >
          Note
        </button>
      </div>

      <div className="spend-calendar-cards" aria-label="Card totals">
        {cardSpendTotals.length === 0 ? (
          <p className="muted spend-calendar-cards-empty">No cards yet.</p>
        ) : visibleCards.length === 0 ? (
          <p className="muted spend-calendar-cards-empty">
            No card totals this month.
          </p>
        ) : (
          <ul className="spend-calendar-card-list">
            {visibleCards.map((card) => (
              <li key={card.cardId} className="spend-calendar-card-row">
                <div className="spend-calendar-card-meta">
                  <span className="spend-calendar-card-name">{card.name}</span>
                  <span
                    className="spend-calendar-card-count"
                    title={`${card.entryCount} cost${card.entryCount === 1 ? '' : 's'} tagged to ${card.name}`}
                  >
                    {card.entryCount}
                  </span>
                  {card.isOverridden && (
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => void resetCard(card)}
                      disabled={busy}
                      title={`Reset to tracked $${Math.round(card.tracked)}`}
                    >
                      Reset
                    </button>
                  )}
                </div>
                <span className="money-input spend-calendar-money">
                  <span className="money-input-prefix" aria-hidden="true">
                    $
                  </span>
                  <input
                    type="number"
                    step="1"
                    inputMode="numeric"
                    className="spend-calendar-card-input"
                    value={drafts[card.cardId] ?? ''}
                    disabled={busy}
                    aria-label={`${card.name} total`}
                    title={
                      card.isOverridden
                        ? `Custom total (tracked $${Math.round(card.tracked)})`
                        : 'Tracked from tagged costs — edit if statement differs'
                    }
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [card.cardId]: e.target.value,
                      }))
                    }
                    onBlur={() => void commitCardDraft(card)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur()
                      }
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer
        className="spend-calendar-footer"
        title="Net monthly income minus total spent"
      >
        <span className="spend-calendar-footer-label">Leftover</span>
        <span
          className={`spend-calendar-footer-value ${leftoverClass(leftover)}`}
        >
          {formatCurrency(leftover)}
        </span>
      </footer>

      {cardsOpen &&
        createPortal(
          <div
            className={`costs-modal-root ${cardsModalVisible ? 'is-open' : ''}`}
            onClick={() => setCardsOpen(false)}
          >
            <div
              className="costs-modal spend-calendar-picker-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Choose cards"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="costs-modal-header">
                <div className="costs-modal-title-block">
                  <p className="costs-modal-kicker">
                    {displayMonthLabel(monthLabel)}
                  </p>
                  <h2>Cards</h2>
                </div>
                <button
                  type="button"
                  className="ghost small"
                  onClick={closeCards}
                >
                  Close
                </button>
              </header>
              <div className="costs-modal-body">
                <p className="muted spend-calendar-picker-hint">
                  Choose which cards show under the calendar this month.
                </p>
                {cardSpendTotals.length === 0 ? (
                  <p className="muted">No cards yet. Add one below.</p>
                ) : (
                  <ul className="spend-calendar-picker-list">
                    {cardSpendTotals.map((card) => {
                      const checked = visibleCardIds.includes(card.cardId)
                      return (
                        <li key={card.cardId}>
                          <label className="spend-calendar-picker-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCardVisible(card.cardId)}
                            />
                            <span>{card.name}</span>
                            <span className="muted">
                              {formatCurrency(Math.round(card.display))}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => void handleAddCard()}
                  disabled={busy}
                >
                  + Add card
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {notesOpen &&
        createPortal(
          <div
            className={`costs-modal-root ${notesModalVisible ? 'is-open' : ''}`}
            onClick={closeNotes}
          >
            <div
              className="costs-modal notebook-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Month notes"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="costs-modal-header">
                <div className="costs-modal-title-block">
                  <p className="costs-modal-kicker">Notebook</p>
                  <h2>{displayMonthLabel(monthLabel)}</h2>
                </div>
                <button
                  type="button"
                  className="ghost small"
                  onClick={closeNotes}
                >
                  Close
                </button>
              </header>
              <div className="notebook-page">
                <textarea
                  className="notebook-textarea"
                  value={notesDraft}
                  disabled={busy}
                  placeholder="Jot down plans, reminders, or anything for this month…"
                  aria-label={`Notes for ${displayMonthLabel(monthLabel)}`}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={() => void commitNotes()}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </aside>
  )
}

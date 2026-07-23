/** Metric keys that can appear on the Cards dashboard. */
export type CardDashboardField =
  | 'total_balance'
  | 'statement_balance'
  | 'minimum_payment'
  | 'payment_due'
  | 'next_closing'
  | 'month_spend'

export interface CardFieldCatalogItem {
  id: CardDashboardField
  label: string
  description: string
}

export const CARD_FIELD_CATALOG: CardFieldCatalogItem[] = [
  {
    id: 'total_balance',
    label: 'Total balance',
    description: 'Current amount owed on the card',
  },
  {
    id: 'statement_balance',
    label: 'Statement balance',
    description: 'Last statement balance',
  },
  {
    id: 'minimum_payment',
    label: 'Minimum',
    description: 'Minimum payment due',
  },
  {
    id: 'payment_due',
    label: 'Payment due',
    description: 'Due day relative to the selected budget month',
  },
  {
    id: 'next_closing',
    label: 'Next closing',
    description: 'Closing day (usually next month)',
  },
  {
    id: 'month_spend',
    label: 'This month spend',
    description: 'Tagged costs for the selected month',
  },
]

export const DEFAULT_CARD_DASHBOARD_FIELDS: CardDashboardField[] = [
  'total_balance',
  'statement_balance',
  'minimum_payment',
  'payment_due',
  'next_closing',
  'month_spend',
]

const STORAGE_KEY = 'mybudget.cardDashboardFields'

export function loadCardDashboardFields(): CardDashboardField[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_CARD_DASHBOARD_FIELDS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...DEFAULT_CARD_DASHBOARD_FIELDS]
    const allowed = new Set(CARD_FIELD_CATALOG.map((f) => f.id))
    const filtered = parsed.filter(
      (id): id is CardDashboardField =>
        typeof id === 'string' && allowed.has(id as CardDashboardField),
    )
    return filtered.length > 0 ? filtered : [...DEFAULT_CARD_DASHBOARD_FIELDS]
  } catch {
    return [...DEFAULT_CARD_DASHBOARD_FIELDS]
  }
}

export function saveCardDashboardFields(fields: CardDashboardField[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fields))
}

/** Build YYYY-MM-DD from budget month label + day + month offset. */
export function resolveCycleDate(
  monthLabel: string,
  day: number | null | undefined,
  monthOffset: number,
): string | null {
  if (day == null || day < 1 || day > 31) return null
  const [y, m] = monthLabel.split('-').map(Number)
  if (!y || !m) return null
  const base = new Date(y, m - 1 + monthOffset, 1)
  const lastDay = new Date(
    base.getFullYear(),
    base.getMonth() + 1,
    0,
  ).getDate()
  const clamped = Math.min(day, lastDay)
  const yy = base.getFullYear()
  const mm = String(base.getMonth() + 1).padStart(2, '0')
  const dd = String(clamped).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

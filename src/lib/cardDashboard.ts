/** Built-in metric keys that can appear on the Cards dashboard. */
export type BuiltInCardField =
  | 'total_balance'
  | 'statement_balance'
  | 'minimum_payment'
  | 'payment_due'
  | 'next_closing'
  | 'month_spend'

export type CardDashboardField = BuiltInCardField | string

export interface CardFieldCatalogItem {
  id: CardDashboardField
  label: string
  description: string
  kind: 'builtin' | 'custom'
}

export const BUILTIN_CARD_FIELD_CATALOG: CardFieldCatalogItem[] = [
  {
    id: 'total_balance',
    label: 'Total balance',
    description: 'Current amount owed on the card',
    kind: 'builtin',
  },
  {
    id: 'statement_balance',
    label: 'Statement balance',
    description: 'Last statement balance',
    kind: 'builtin',
  },
  {
    id: 'minimum_payment',
    label: 'Minimum',
    description: 'Minimum payment due',
    kind: 'builtin',
  },
  {
    id: 'payment_due',
    label: 'Payment due',
    description: 'Due day relative to the selected budget month',
    kind: 'builtin',
  },
  {
    id: 'next_closing',
    label: 'Next closing',
    description: 'Closing day (usually next month)',
    kind: 'builtin',
  },
  {
    id: 'month_spend',
    label: 'This month spend',
    description: 'Tagged costs for the selected month',
    kind: 'builtin',
  },
]

/** @deprecated use BUILTIN_CARD_FIELD_CATALOG */
export const CARD_FIELD_CATALOG = BUILTIN_CARD_FIELD_CATALOG

export const DEFAULT_CARD_DASHBOARD_FIELDS: CardDashboardField[] = []

const FIELDS_KEY = 'mybudget.cardDashboardFields.v2'
const FIELD_CATALOG_KEY = 'mybudget.cardFieldCatalog.v1'
const CARD_VISIBILITY_KEY = 'mybudget.cardDashboardVisibleCards.v1'

function isBuiltIn(id: string): id is BuiltInCardField {
  return BUILTIN_CARD_FIELD_CATALOG.some((f) => f.id === id)
}

export function loadCardFieldCatalog(): CardFieldCatalogItem[] {
  try {
    const raw = localStorage.getItem(FIELD_CATALOG_KEY)
    if (!raw) return [...BUILTIN_CARD_FIELD_CATALOG]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...BUILTIN_CARD_FIELD_CATALOG]
    const items: CardFieldCatalogItem[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const id = (row as { id?: unknown }).id
      const label = (row as { label?: unknown }).label
      if (typeof id !== 'string' || typeof label !== 'string') continue
      if (isBuiltIn(id)) {
        const base = BUILTIN_CARD_FIELD_CATALOG.find((f) => f.id === id)!
        items.push({ ...base, label: label.trim() || base.label })
      } else {
        items.push({
          id,
          label: label.trim() || 'Custom field',
          description: 'Custom amount',
          kind: 'custom',
        })
      }
    }
    return items.length > 0 ? items : [...BUILTIN_CARD_FIELD_CATALOG]
  } catch {
    return [...BUILTIN_CARD_FIELD_CATALOG]
  }
}

export function saveCardFieldCatalog(items: CardFieldCatalogItem[]) {
  localStorage.setItem(
    FIELD_CATALOG_KEY,
    JSON.stringify(
      items.map((i) => ({
        id: i.id,
        label: i.label,
        kind: i.kind,
      })),
    ),
  )
}

export function loadCardDashboardFields(
  catalog: CardFieldCatalogItem[],
): CardDashboardField[] {
  try {
    const raw = localStorage.getItem(FIELDS_KEY)
    if (!raw) return [...DEFAULT_CARD_DASHBOARD_FIELDS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...DEFAULT_CARD_DASHBOARD_FIELDS]
    const allowed = new Set(catalog.map((f) => f.id))
    return parsed.filter(
      (id): id is CardDashboardField =>
        typeof id === 'string' && allowed.has(id),
    )
  } catch {
    return [...DEFAULT_CARD_DASHBOARD_FIELDS]
  }
}

export function saveCardDashboardFields(fields: CardDashboardField[]) {
  localStorage.setItem(FIELDS_KEY, JSON.stringify(fields))
}

/** Empty by default — nothing appears until you pick cards from the catalog. */
export function loadVisibleDashboardCardIds(knownIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(CARD_VISIBILITY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const known = new Set(knownIds)
    return parsed.filter(
      (id): id is string => typeof id === 'string' && known.has(id),
    )
  } catch {
    return []
  }
}

export function saveVisibleDashboardCardIds(ids: string[]) {
  localStorage.setItem(CARD_VISIBILITY_KEY, JSON.stringify(ids))
}

export function newCustomFieldId(): string {
  return `custom_${crypto.randomUUID()}`
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

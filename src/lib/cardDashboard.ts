/** Built-in metric keys that can appear on the Cards dashboard. */
export type BuiltInCardField =
  | 'total_balance'
  | 'statement_balance'
  | 'minimum_payment'
  | 'payment_due'
  | 'payment_paid'
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
    description: 'Last statement balance, with an as-of date',
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
    description: 'Due date (mm/dd/yyyy)',
    kind: 'builtin',
  },
  {
    id: 'payment_paid',
    label: 'Paid status',
    description: 'Mark the payment as paid or not paid',
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
    return ensureNewBuiltIns(
      items.length > 0 ? items : [...BUILTIN_CARD_FIELD_CATALOG],
    )
  } catch {
    return [...BUILTIN_CARD_FIELD_CATALOG]
  }
}

/** Append newly introduced built-ins so existing catalogs pick them up. */
function ensureNewBuiltIns(
  items: CardFieldCatalogItem[],
): CardFieldCatalogItem[] {
  let next = items
  for (const id of ['payment_paid'] as BuiltInCardField[]) {
    if (next.some((f) => f.id === id)) continue
    const item = BUILTIN_CARD_FIELD_CATALOG.find((f) => f.id === id)
    if (!item) continue
    const dueIdx = next.findIndex((f) => f.id === 'payment_due')
    next =
      id === 'payment_paid' && dueIdx >= 0
        ? [...next.slice(0, dueIdx + 1), item, ...next.slice(dueIdx + 1)]
        : [...next, item]
  }
  return next
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

const AUTO_ENABLED_FIELDS_KEY = 'mybudget.cardDashboardAutoEnabled.v1'

/** One-time: turn on newly shipped fields for people who already use the dashboard. */
function ensureAutoEnabledFields(
  fields: CardDashboardField[],
  catalog: CardFieldCatalogItem[],
): CardDashboardField[] {
  if (fields.length === 0) return fields
  try {
    const raw = localStorage.getItem(AUTO_ENABLED_FIELDS_KEY)
    const already = new Set(
      raw ? (JSON.parse(raw) as unknown[]).filter((x) => typeof x === 'string') : [],
    )
    const allowed = new Set(catalog.map((f) => f.id))
    let next = fields
    const newly: string[] = []
    for (const id of ['payment_paid'] as BuiltInCardField[]) {
      if (already.has(id) || !allowed.has(id)) continue
      newly.push(id)
      if (next.includes(id)) continue
      const dueIdx = next.indexOf('payment_due')
      next =
        dueIdx >= 0
          ? [...next.slice(0, dueIdx + 1), id, ...next.slice(dueIdx + 1)]
          : [...next, id]
    }
    if (newly.length === 0) return fields
    localStorage.setItem(
      AUTO_ENABLED_FIELDS_KEY,
      JSON.stringify([...already, ...newly]),
    )
    if (next !== fields) saveCardDashboardFields(next)
    return next
  } catch {
    return fields
  }
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
    const loaded = parsed.filter(
      (id): id is CardDashboardField =>
        typeof id === 'string' && allowed.has(id),
    )
    return ensureAutoEnabledFields(loaded, catalog)
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

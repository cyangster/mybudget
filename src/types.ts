export type BudgetSection =
  | 'income'
  | 'fixed'
  | 'variable'
  | 'investments'
  | 'savings'

export interface Month {
  id: string
  user_id: string
  label: string
  created_at: string
}

export interface Category {
  id: string
  month_id: string
  section: BudgetSection
  name: string
  budgeted_amount: number
  actual_amount: number
  sort_order: number
  /** When true, show on the section card but skip budget/spend totals. */
  excluded_from_budget: boolean
}

export interface CategoryEntry {
  id: string
  category_id: string
  label: string
  amount: number
  entry_date: string
  notes: string
  card_id: string | null
  sort_order: number
  created_at: string
}

export interface PaymentCard {
  id: string
  user_id: string
  name: string
  is_default: boolean
  sort_order: number
  created_at: string
}

export interface CardMonthOverride {
  id: string
  month_id: string
  card_id: string
  display_total: number
}

export interface CardSpendTotal {
  cardId: string
  name: string
  tracked: number
  display: number
  isOverridden: boolean
}

export const SECTION_ORDER: BudgetSection[] = [
  'income',
  'fixed',
  'variable',
  'investments',
  'savings',
]

/** Four cost panels shown in the 2×2 dashboard grid (income lives in the header). */
export const DASHBOARD_SECTIONS: BudgetSection[] = [
  'fixed',
  'variable',
  'investments',
  'savings',
]

export const SECTION_LABELS: Record<BudgetSection, string> = {
  income: 'Income',
  fixed: 'Fixed Costs',
  variable: 'Variable Costs',
  investments: 'Investments',
  savings: 'Savings',
}

export const SPEND_SECTIONS: BudgetSection[] = [
  'fixed',
  'variable',
  'investments',
  'savings',
]

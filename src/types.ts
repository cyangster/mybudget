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
}

export interface CategoryEntry {
  id: string
  category_id: string
  label: string
  amount: number
  entry_date: string
  notes: string
  sort_order: number
  created_at: string
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

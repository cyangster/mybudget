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

export const SECTION_ORDER: BudgetSection[] = [
  'income',
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

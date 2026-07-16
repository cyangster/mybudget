import type { BudgetSection } from '../types'

export interface SeedCategory {
  section: BudgetSection
  name: string
  budgeted_amount: number
  actual_amount: number
  sort_order: number
  excluded_from_budget?: boolean
}

/** Default categories when creating the first month (nothing to copy). */
export const FIRST_MONTH_SEED: SeedCategory[] = [
  {
    section: 'income',
    name: 'Gross Semi-Monthly Income',
    budgeted_amount: 0,
    actual_amount: 0,
    sort_order: 0,
  },
  {
    section: 'income',
    name: 'Net Income',
    budgeted_amount: 0,
    actual_amount: 0,
    sort_order: 1,
  },
  {
    section: 'fixed',
    name: 'Rent',
    budgeted_amount: 0,
    actual_amount: 0,
    sort_order: 0,
  },
  {
    section: 'fixed',
    name: 'Utilities',
    budgeted_amount: 0,
    actual_amount: 0,
    sort_order: 1,
  },
  {
    section: 'fixed',
    name: 'Internet',
    budgeted_amount: 0,
    actual_amount: 0,
    sort_order: 2,
  },
  {
    section: 'fixed',
    name: 'Transportation',
    budgeted_amount: 0,
    actual_amount: 0,
    sort_order: 3,
  },
]

export const NET_INCOME_NAME = 'Net Income'
export const GROSS_INCOME_NAME = 'Gross Semi-Monthly Income'

import type { PayCycle } from '../types'

/** How often you are paid; period amount × multiplier ≈ monthly. */

export interface PayCycleOption {
  id: PayCycle
  label: string
  shortLabel: string
  /** Pays per year (used for monthly conversion). */
  perYear: number
}

export const PAY_CYCLE_OPTIONS: PayCycleOption[] = [
  {
    id: 'weekly',
    label: 'Weekly',
    shortLabel: 'Weekly',
    perYear: 52,
  },
  {
    id: 'biweekly',
    label: 'Biweekly',
    shortLabel: 'Biweekly',
    perYear: 26,
  },
  {
    id: 'semimonthly',
    label: 'Semi-monthly',
    shortLabel: 'Semi-monthly',
    perYear: 24,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    shortLabel: 'Monthly',
    perYear: 12,
  },
]

export const DEFAULT_PAY_CYCLE: PayCycle = 'semimonthly'

export function isPayCycle(value: unknown): value is PayCycle {
  return (
    value === 'weekly' ||
    value === 'biweekly' ||
    value === 'semimonthly' ||
    value === 'monthly'
  )
}

export function payCycleOption(cycle: PayCycle): PayCycleOption {
  return (
    PAY_CYCLE_OPTIONS.find((o) => o.id === cycle) ??
    PAY_CYCLE_OPTIONS.find((o) => o.id === DEFAULT_PAY_CYCLE)!
  )
}

/** Convert one paycheck / period amount into an approximate monthly figure. */
export function toMonthly(periodAmount: number, cycle: PayCycle): number {
  const { perYear } = payCycleOption(cycle)
  return Math.round(((periodAmount * perYear) / 12) * 100) / 100
}

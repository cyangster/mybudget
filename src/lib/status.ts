export type AmountStatus = 'done' | 'open' | 'over' | 'empty'

/** Classify remaining = budgeted - spent for visual status. */
export function amountStatus(budgeted: number, spent: number): AmountStatus {
  if (budgeted === 0 && spent === 0) return 'empty'
  const remaining = Math.round((budgeted - spent) * 100) / 100
  if (remaining === 0) return 'done'
  if (remaining < 0) return 'over'
  return 'open'
}

export function statusLabel(status: AmountStatus): string {
  switch (status) {
    case 'done':
      return 'Done'
    case 'open':
      return 'Left'
    case 'over':
      return 'Over'
    default:
      return ''
  }
}

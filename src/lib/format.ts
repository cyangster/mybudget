const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatCurrency(value: number): string {
  return currency.format(value || 0)
}

export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

/** Next calendar month label from YYYY-MM */
export function nextMonthLabel(label: string): string {
  const [y, m] = label.split('-').map(Number)
  const date = new Date(y, m - 1 + 1, 1)
  return formatMonthLabel(date)
}

export function formatMonthLabel(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function displayMonthLabel(label: string): string {
  const [y, m] = label.split('-').map(Number)
  if (!y || !m) return label
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export function currentMonthLabel(): string {
  return formatMonthLabel(new Date())
}

import { formatCurrency } from '../lib/format'

interface IncomeHeaderProps {
  grossSemi: number
  netSemi: number
  grossMonthly: number
  netMonthly: number
}

export function IncomeHeader({
  grossSemi,
  netSemi,
  grossMonthly,
  netMonthly,
}: IncomeHeaderProps) {
  return (
    <section className="income-header" aria-label="Income overview">
      <div className="income-block">
        <h2>Gross</h2>
        <div className="income-figures">
          <div>
            <span className="income-period">Semi-monthly</span>
            <span className="income-amount">{formatCurrency(grossSemi)}</span>
          </div>
          <div>
            <span className="income-period">Monthly</span>
            <span className="income-amount">{formatCurrency(grossMonthly)}</span>
          </div>
        </div>
      </div>
      <div className="income-block">
        <h2>Net</h2>
        <div className="income-figures">
          <div>
            <span className="income-period">Semi-monthly</span>
            <span className="income-amount">{formatCurrency(netSemi)}</span>
          </div>
          <div>
            <span className="income-period">Monthly</span>
            <span className="income-amount">{formatCurrency(netMonthly)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

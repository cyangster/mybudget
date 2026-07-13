import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { MonthNav } from './components/MonthNav'
import { IncomeHeader } from './components/IncomeHeader'
import { Summary } from './components/Summary'
import { BudgetSectionView } from './components/BudgetSection'
import { SpendCalendar } from './components/SpendCalendar'
import { useBudget } from './hooks/useBudget'
import { supabaseConfigured } from './lib/supabase'
import { DASHBOARD_SECTIONS } from './types'
import './App.css'

function BudgetApp() {
  const { user, signOut } = useAuth()
  const {
    months,
    selectedMonth,
    selectedMonthId,
    setSelectedMonthId,
    categoriesBySection,
    entriesByCategory,
    dailySpendTotals,
    summary,
    loading,
    busy,
    error,
    createMonth,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    deleteMonth,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useBudget(user!.id)

  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted center">Loading…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <h1>My Budget</h1>
          <button type="button" className="ghost small" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
        <MonthNav
          months={months}
          selectedMonthId={selectedMonthId}
          onSelect={setSelectedMonthId}
          onNewMonth={() => void createMonth()}
          onDeleteMonth={(id) => void deleteMonth(id)}
          busy={busy}
        />
      </header>

      {error && <p className="error banner">{error}</p>}

      {months.length === 0 ? (
        <div className="empty-state">
          <p>No budget months yet.</p>
          <button
            type="button"
            className="primary"
            onClick={() => void createMonth()}
            disabled={busy}
          >
            + Create your first month
          </button>
        </div>
      ) : (
        <>
          <div className="dashboard-body">
            <div className="dashboard-main">
              <div className="sticky-top">
                <IncomeHeader
                  grossSemi={summary.grossSemi}
                  netSemi={summary.netSemi}
                  grossMonthly={summary.grossMonthly}
                  netMonthly={summary.netMonthly}
                  grossCategoryId={summary.grossCategoryId}
                  netCategoryId={summary.netCategoryId}
                  onSaveIncome={(id, amount) =>
                    updateCategory(id, { actual_amount: amount })
                  }
                  busy={busy}
                />
                <Summary
                  totalBudgeted={summary.totalBudgeted}
                  totalSpent={summary.totalSpent}
                  leftover={summary.leftover}
                />
              </div>

              <main className="sections-grid">
                {DASHBOARD_SECTIONS.map((section) => (
                  <BudgetSectionView
                    key={section}
                    section={section}
                    categories={categoriesBySection[section]}
                    entriesByCategory={entriesByCategory}
                    onAdd={addCategory}
                    onSave={updateCategory}
                    onDelete={deleteCategory}
                    onAddEntry={addEntry}
                    onUpdateEntry={updateEntry}
                    onDeleteEntry={deleteEntry}
                    onReorder={reorderCategories}
                    busy={busy}
                  />
                ))}
              </main>
            </div>

            {selectedMonth && (
              <SpendCalendar
                monthLabel={selectedMonth.label}
                dailyTotals={dailySpendTotals}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Gate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted center">Loading…</p>
      </div>
    )
  }

  if (!user) return <Login />
  return <BudgetApp />
}

function MissingConfig() {
  return (
    <div className="app-shell">
      <div className="empty-state">
        <h1>Missing Supabase config</h1>
        <p>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in
          Vercel → Project Settings → Environment Variables, then redeploy.
        </p>
        <p className="muted">
          Use the project URL only (no <code>/rest/v1/</code>), then trigger a new
          deployment so Vite can bake the values into the build.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!supabaseConfigured) return <MissingConfig />

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

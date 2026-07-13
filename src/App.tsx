import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { MonthNav } from './components/MonthNav'
import { Summary } from './components/Summary'
import { BudgetSectionView } from './components/BudgetSection'
import { useBudget } from './hooks/useBudget'
import { SECTION_ORDER } from './types'
import './App.css'

function BudgetApp() {
  const { user, signOut } = useAuth()
  const {
    months,
    selectedMonthId,
    setSelectedMonthId,
    categoriesBySection,
    summary,
    loading,
    busy,
    error,
    createMonth,
    addCategory,
    updateCategory,
    deleteCategory,
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
          <Summary
            totalBudgeted={summary.totalBudgeted}
            totalSpent={summary.totalSpent}
            leftover={summary.leftover}
          />

          <main className="sections">
            {SECTION_ORDER.map((section) => (
              <BudgetSectionView
                key={section}
                section={section}
                categories={categoriesBySection[section]}
                onAdd={addCategory}
                onSave={updateCategory}
                onDelete={deleteCategory}
                busy={busy}
              />
            ))}
          </main>
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

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

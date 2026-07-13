import { useCallback, useEffect, useMemo, useState } from 'react'
import { FIRST_MONTH_SEED, NET_INCOME_NAME } from '../lib/defaults'
import {
  currentMonthLabel,
  nextMonthLabel,
} from '../lib/format'
import { supabase } from '../lib/supabase'
import type { BudgetSection, Category, Month } from '../types'
import { SPEND_SECTIONS } from '../types'

function toCategory(row: Category): Category {
  return {
    ...row,
    budgeted_amount: Number(row.budgeted_amount),
    actual_amount: Number(row.actual_amount),
  }
}

export function useBudget(userId: string) {
  const [months, setMonths] = useState<Month[]>([])
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const selectedMonth = useMemo(
    () => months.find((m) => m.id === selectedMonthId) ?? null,
    [months, selectedMonthId],
  )

  const loadMonths = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('months')
      .select('*')
      .eq('user_id', userId)
      .order('label', { ascending: true })

    if (err) {
      setError(err.message)
      return [] as Month[]
    }

    const list = (data ?? []) as Month[]
    setMonths(list)
    return list
  }, [userId])

  const loadCategories = useCallback(async (monthId: string) => {
    const { data, error: err } = await supabase
      .from('categories')
      .select('*')
      .eq('month_id', monthId)
      .order('sort_order', { ascending: true })

    if (err) {
      setError(err.message)
      setCategories([])
      return
    }

    setCategories((data ?? []).map((row) => toCategory(row as Category)))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      const list = await loadMonths()
      if (cancelled) return

      if (list.length === 0) {
        setSelectedMonthId(null)
        setCategories([])
        setLoading(false)
        return
      }

      const latest = list[list.length - 1]
      setSelectedMonthId(latest.id)
      await loadCategories(latest.id)
      if (!cancelled) setLoading(false)
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [loadMonths, loadCategories])

  useEffect(() => {
    if (!selectedMonthId) return
    void loadCategories(selectedMonthId)
  }, [selectedMonthId, loadCategories])

  const createMonth = useCallback(
    async (label?: string) => {
      setBusy(true)
      setError(null)

      try {
        const list = await loadMonths()
        const latest = list.length > 0 ? list[list.length - 1] : null
        const newLabel =
          label ??
          (latest ? nextMonthLabel(latest.label) : currentMonthLabel())

        if (list.some((m) => m.label === newLabel)) {
          setError(`Month ${newLabel} already exists.`)
          return
        }

        const { data: monthRow, error: monthErr } = await supabase
          .from('months')
          .insert({ user_id: userId, label: newLabel })
          .select('*')
          .single()

        if (monthErr || !monthRow) {
          setError(monthErr?.message ?? 'Failed to create month.')
          return
        }

        const month = monthRow as Month
        let seeds = FIRST_MONTH_SEED

        if (latest) {
          const { data: sourceCats, error: srcErr } = await supabase
            .from('categories')
            .select('*')
            .eq('month_id', latest.id)
            .order('sort_order', { ascending: true })

          if (srcErr) {
            setError(srcErr.message)
            return
          }

          seeds = (sourceCats ?? []).map((c) => {
            const cat = toCategory(c as Category)
            return {
              section: cat.section,
              name: cat.name,
              budgeted_amount: cat.budgeted_amount,
              // Income amounts live in actual_amount — carry them forward.
              // Spend sections reset actual to 0.
              actual_amount:
                cat.section === 'income' ? cat.actual_amount : 0,
              sort_order: cat.sort_order,
            }
          })
        }

        if (seeds.length > 0) {
          const { error: catErr } = await supabase.from('categories').insert(
            seeds.map((s) => ({
              month_id: month.id,
              section: s.section,
              name: s.name,
              budgeted_amount: s.budgeted_amount,
              actual_amount: s.actual_amount,
              sort_order: s.sort_order,
            })),
          )

          if (catErr) {
            setError(catErr.message)
            return
          }
        }

        await loadMonths()
        setSelectedMonthId(month.id)
      } finally {
        setBusy(false)
      }
    },
    [userId, loadMonths],
  )

  const addCategory = useCallback(
    async (section: BudgetSection, name: string) => {
      if (!selectedMonthId || section === 'income') return
      setBusy(true)
      setError(null)

      const inSection = categories.filter((c) => c.section === section)
      const sort_order =
        inSection.length > 0
          ? Math.max(...inSection.map((c) => c.sort_order)) + 1
          : 0

      const { error: err } = await supabase.from('categories').insert({
        month_id: selectedMonthId,
        section,
        name: name.trim() || 'New category',
        budgeted_amount: 0,
        actual_amount: 0,
        sort_order,
      })

      setBusy(false)
      if (err) {
        setError(err.message)
        return
      }
      await loadCategories(selectedMonthId)
    },
    [selectedMonthId, categories, loadCategories],
  )

  const updateCategory = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Category, 'name' | 'budgeted_amount' | 'actual_amount'>>,
    ) => {
      if (!selectedMonthId) return
      setBusy(true)
      setError(null)

      const { error: err } = await supabase
        .from('categories')
        .update(patch)
        .eq('id', id)

      setBusy(false)
      if (err) {
        setError(err.message)
        return
      }
      await loadCategories(selectedMonthId)
    },
    [selectedMonthId, loadCategories],
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!selectedMonthId) return
      const target = categories.find((c) => c.id === id)
      if (!target || target.section === 'income') return

      setBusy(true)
      setError(null)

      const { error: err } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      setBusy(false)
      if (err) {
        setError(err.message)
        return
      }
      await loadCategories(selectedMonthId)
    },
    [selectedMonthId, categories, loadCategories],
  )

  const summary = useMemo(() => {
    const spend = categories.filter((c) => SPEND_SECTIONS.includes(c.section))
    const totalBudgeted = spend.reduce((sum, c) => sum + c.budgeted_amount, 0)
    const totalSpent = spend.reduce((sum, c) => sum + c.actual_amount, 0)

    const net =
      categories.find(
        (c) => c.section === 'income' && c.name === NET_INCOME_NAME,
      ) ??
      categories
        .filter((c) => c.section === 'income')
        .sort((a, b) => a.sort_order - b.sort_order)[1]

    const netIncome = net?.actual_amount ?? 0
    const leftover = netIncome - totalSpent

    return { totalBudgeted, totalSpent, leftover, netIncome }
  }, [categories])

  const categoriesBySection = useMemo(() => {
    const map: Record<BudgetSection, Category[]> = {
      income: [],
      fixed: [],
      variable: [],
      investments: [],
      savings: [],
    }
    for (const c of categories) {
      map[c.section].push(c)
    }
    for (const key of Object.keys(map) as BudgetSection[]) {
      map[key].sort((a, b) => a.sort_order - b.sort_order)
    }
    return map
  }, [categories])

  return {
    months,
    selectedMonth,
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
  }
}

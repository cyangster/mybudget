import { useCallback, useEffect, useMemo, useState } from 'react'
import { FIRST_MONTH_SEED, GROSS_INCOME_NAME, NET_INCOME_NAME } from '../lib/defaults'
import { MONTHLY_SPEND_BUFFER } from '../lib/buffer'
import {
  currentMonthLabel,
  nextMonthLabel,
} from '../lib/format'
import { supabase } from '../lib/supabase'
import type {
  BudgetSection,
  CardMonthOverride,
  CardSpendTotal,
  Category,
  CategoryEntry,
  Month,
  PaymentCard,
} from '../types'
import { SPEND_SECTIONS } from '../types'

const DEFAULT_CARD_NAME = 'Freedom'

function toCategory(row: Category): Category {
  return {
    ...row,
    budgeted_amount: Number(row.budgeted_amount),
    actual_amount: Number(row.actual_amount),
    excluded_from_budget: Boolean(row.excluded_from_budget),
  }
}

function toEntry(row: CategoryEntry): CategoryEntry {
  return {
    ...row,
    amount: Number(row.amount),
    label: row.label ?? '',
    entry_date: row.entry_date ?? '',
    notes: row.notes ?? '',
    card_id: row.card_id ?? null,
  }
}

function toCard(row: PaymentCard): PaymentCard {
  return {
    ...row,
    is_default: Boolean(row.is_default),
  }
}

export function useBudget(userId: string) {
  const [months, setMonths] = useState<Month[]>([])
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [entriesByCategory, setEntriesByCategory] = useState<
    Record<string, CategoryEntry[]>
  >({})
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([])
  const [cardOverrides, setCardOverrides] = useState<CardMonthOverride[]>([])
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
      setEntriesByCategory({})
      return
    }

    const cats = (data ?? []).map((row) => toCategory(row as Category))
    setCategories(cats)

    if (cats.length === 0) {
      setEntriesByCategory({})
      return
    }

    const ids = cats.map((c) => c.id)
    const { data: entryRows, error: entryErr } = await supabase
      .from('category_entries')
      .select('*')
      .in('category_id', ids)
      .order('entry_date', { ascending: true })
      .order('sort_order', { ascending: true })

    if (entryErr) {
      // Table may not exist yet if migration 002 hasn't been run
      setError(entryErr.message)
      setEntriesByCategory({})
      return
    }

    const map: Record<string, CategoryEntry[]> = {}
    for (const id of ids) map[id] = []
    for (const row of entryRows ?? []) {
      const entry = toEntry(row as CategoryEntry)
      map[entry.category_id].push(entry)
    }
    setEntriesByCategory(map)
  }, [])

  const loadPaymentCards = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('payment_cards')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (err) {
      setError(err.message)
      setPaymentCards([])
      return [] as PaymentCard[]
    }

    let list = (data ?? []).map((row) => toCard(row as PaymentCard))

    if (list.length === 0) {
      const { data: created, error: createErr } = await supabase
        .from('payment_cards')
        .insert({
          user_id: userId,
          name: DEFAULT_CARD_NAME,
          is_default: true,
          sort_order: 0,
        })
        .select('*')
        .single()

      if (createErr) {
        setError(createErr.message)
        setPaymentCards([])
        return [] as PaymentCard[]
      }

      list = [toCard(created as PaymentCard)]
    } else if (!list.some((c) => c.is_default)) {
      const first = list[0]
      await supabase
        .from('payment_cards')
        .update({ is_default: true })
        .eq('id', first.id)
      list = list.map((c) =>
        c.id === first.id ? { ...c, is_default: true } : c,
      )
    }

    setPaymentCards(list)
    return list
  }, [userId])

  const loadCardOverrides = useCallback(async (monthId: string) => {
    const { data, error: err } = await supabase
      .from('card_month_overrides')
      .select('*')
      .eq('month_id', monthId)

    if (err) {
      setError(err.message)
      setCardOverrides([])
      return
    }

    setCardOverrides(
      (data ?? []).map((row) => ({
        ...(row as CardMonthOverride),
        display_total: Number((row as CardMonthOverride).display_total),
      })),
    )
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      const [, list] = await Promise.all([loadPaymentCards(), loadMonths()])
      if (cancelled) return

      if (list.length === 0) {
        setSelectedMonthId(null)
        setCategories([])
        setEntriesByCategory({})
        setCardOverrides([])
        setLoading(false)
        return
      }

      const currentLabel = currentMonthLabel()
      const current =
        list.find((m) => m.label === currentLabel) ?? list[list.length - 1]
      setSelectedMonthId(current.id)
      await Promise.all([
        loadCategories(current.id),
        loadCardOverrides(current.id),
      ])
      if (!cancelled) setLoading(false)
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [loadMonths, loadCategories, loadPaymentCards, loadCardOverrides])

  useEffect(() => {
    if (!selectedMonthId) return
    void loadCategories(selectedMonthId)
    void loadCardOverrides(selectedMonthId)
  }, [selectedMonthId, loadCategories, loadCardOverrides])

  const syncCategoryActual = useCallback(async (categoryId: string) => {
    const { data, error: err } = await supabase
      .from('category_entries')
      .select('amount')
      .eq('category_id', categoryId)

    if (err) return err.message

    const total = (data ?? []).reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    )

    const { error: updateErr } = await supabase
      .from('categories')
      .update({ actual_amount: total })
      .eq('id', categoryId)

    return updateErr?.message ?? null
  }, [])

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
              actual_amount:
                cat.section === 'income' ? cat.actual_amount : 0,
              sort_order: cat.sort_order,
              excluded_from_budget: cat.excluded_from_budget,
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
              excluded_from_budget: s.excluded_from_budget ?? false,
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
        excluded_from_budget: false,
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
      patch: Partial<
        Pick<
          Category,
          'name' | 'budgeted_amount' | 'actual_amount' | 'excluded_from_budget'
        >
      >,
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

  const reorderCategories = useCallback(
    async (section: BudgetSection, orderedIds: string[]) => {
      if (!selectedMonthId || section === 'income') return

      setBusy(true)
      setError(null)

      const updates = orderedIds.map((id, index) =>
        supabase.from('categories').update({ sort_order: index }).eq('id', id),
      )

      const results = await Promise.all(updates)
      const firstError = results.find((r) => r.error)?.error

      setBusy(false)
      if (firstError) {
        setError(firstError.message)
        return
      }
      await loadCategories(selectedMonthId)
    },
    [selectedMonthId, loadCategories],
  )

  const deleteMonth = useCallback(
    async (monthId: string) => {
      setBusy(true)
      setError(null)

      const { error: err } = await supabase
        .from('months')
        .delete()
        .eq('id', monthId)

      if (err) {
        setBusy(false)
        setError(err.message)
        return
      }

      const list = await loadMonths()
      if (list.length === 0) {
        setSelectedMonthId(null)
        setCategories([])
        setEntriesByCategory({})
        setBusy(false)
        return
      }

      const next =
        list.find((m) => m.id === selectedMonthId) ?? list[list.length - 1]
      setSelectedMonthId(next.id)
      await loadCategories(next.id)
      setBusy(false)
    },
    [loadMonths, loadCategories, selectedMonthId],
  )

  const addEntry = useCallback(
    async (
      categoryId: string,
      amount: number,
      label = '',
      entryDate?: string,
      notes = '',
      cardId?: string | null,
    ) => {
      if (!selectedMonthId) return
      setBusy(true)
      setError(null)

      const existing = entriesByCategory[categoryId] ?? []
      const sort_order =
        existing.length > 0
          ? Math.max(...existing.map((e) => e.sort_order)) + 1
          : 0

      const defaultCard =
        paymentCards.find((c) => c.is_default) ?? paymentCards[0] ?? null
      const resolvedCardId =
        cardId === undefined ? (defaultCard?.id ?? null) : cardId

      const { error: err } = await supabase.from('category_entries').insert({
        category_id: categoryId,
        amount,
        label: label.trim(),
        entry_date: entryDate || new Date().toISOString().slice(0, 10),
        notes: notes.trim(),
        card_id: resolvedCardId,
        sort_order,
      })

      if (err) {
        setBusy(false)
        setError(err.message)
        return
      }

      const syncErr = await syncCategoryActual(categoryId)
      setBusy(false)
      if (syncErr) {
        setError(syncErr)
        return
      }
      await loadCategories(selectedMonthId)
    },
    [
      selectedMonthId,
      entriesByCategory,
      paymentCards,
      syncCategoryActual,
      loadCategories,
    ],
  )

  const deleteEntry = useCallback(
    async (entryId: string, categoryId: string) => {
      if (!selectedMonthId) return
      setBusy(true)
      setError(null)

      const { error: err } = await supabase
        .from('category_entries')
        .delete()
        .eq('id', entryId)

      if (err) {
        setBusy(false)
        setError(err.message)
        return
      }

      const syncErr = await syncCategoryActual(categoryId)
      setBusy(false)
      if (syncErr) {
        setError(syncErr)
        return
      }
      await loadCategories(selectedMonthId)
    },
    [selectedMonthId, syncCategoryActual, loadCategories],
  )

  const updateEntry = useCallback(
    async (
      entryId: string,
      categoryId: string,
      patch: Partial<
        Pick<
          CategoryEntry,
          'label' | 'amount' | 'entry_date' | 'notes' | 'card_id'
        >
      >,
    ) => {
      if (!selectedMonthId) return
      setBusy(true)
      setError(null)

      const { error: err } = await supabase
        .from('category_entries')
        .update(patch)
        .eq('id', entryId)

      if (err) {
        setBusy(false)
        setError(err.message)
        return
      }

      if (patch.amount !== undefined) {
        const syncErr = await syncCategoryActual(categoryId)
        if (syncErr) {
          setBusy(false)
          setError(syncErr)
          return
        }
      }

      setBusy(false)
      await loadCategories(selectedMonthId)
    },
    [selectedMonthId, syncCategoryActual, loadCategories],
  )

  const summary = useMemo(() => {
    const spend = categories.filter(
      (c) => SPEND_SECTIONS.includes(c.section) && !c.excluded_from_budget,
    )
    const totalBudgeted = spend.reduce((sum, c) => sum + c.budgeted_amount, 0)
    const totalSpent = spend.reduce((sum, c) => sum + c.actual_amount, 0)

    const incomeCats = categories
      .filter((c) => c.section === 'income')
      .sort((a, b) => a.sort_order - b.sort_order)

    const gross =
      categories.find(
        (c) => c.section === 'income' && c.name === GROSS_INCOME_NAME,
      ) ?? incomeCats[0]

    const net =
      categories.find(
        (c) => c.section === 'income' && c.name === NET_INCOME_NAME,
      ) ?? incomeCats[1]

    const grossSemi = gross?.actual_amount ?? 0
    const netSemi = net?.actual_amount ?? 0
    const grossMonthly = grossSemi * 2
    const netMonthly = netSemi * 2

    // Unbudgeted = monthly net left after all budgeted sections.
    const unbudgeted = netMonthly - totalBudgeted

    // Overruns by main section eat into that unbudgeted pool.
    let sectionOverage = 0
    for (const section of SPEND_SECTIONS) {
      const inSection = spend.filter((c) => c.section === section)
      const budgeted = inSection.reduce((sum, c) => sum + c.budgeted_amount, 0)
      const spent = inSection.reduce((sum, c) => sum + c.actual_amount, 0)
      sectionOverage += Math.max(0, spent - budgeted)
    }

    // What you can actually spend on extras while always keeping $200 unspent.
    const canSpendNoBuffer = unbudgeted - sectionOverage
    const canSpend = canSpendNoBuffer - MONTHLY_SPEND_BUFFER
    const leftover = netMonthly - totalSpent

    return {
      totalBudgeted,
      totalSpent,
      leftover,
      unbudgeted,
      sectionOverage,
      canSpend,
      canSpendNoBuffer,
      canSpendOnBudget: unbudgeted,
      canSpendNow: canSpendNoBuffer,
      grossSemi,
      netSemi,
      grossMonthly,
      netMonthly,
      netIncome: netSemi,
      grossCategoryId: gross?.id ?? null,
      netCategoryId: net?.id ?? null,
    }
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

  const dailySpendTotals = useMemo(() => {
    const spendIds = new Set(
      categories
        .filter(
          (c) => SPEND_SECTIONS.includes(c.section) && !c.excluded_from_budget,
        )
        .map((c) => c.id),
    )
    const totals: Record<string, number> = {}
    for (const [categoryId, entries] of Object.entries(entriesByCategory)) {
      if (!spendIds.has(categoryId)) continue
      for (const entry of entries) {
        if (!entry.entry_date) continue
        totals[entry.entry_date] =
          (totals[entry.entry_date] ?? 0) + entry.amount
      }
    }
    return totals
  }, [categories, entriesByCategory])

  const cardSpendTotals = useMemo((): CardSpendTotal[] => {
    const trackedByCard = new Map<string, number>()
    for (const entries of Object.values(entriesByCategory)) {
      for (const entry of entries) {
        if (!entry.card_id) continue
        trackedByCard.set(
          entry.card_id,
          (trackedByCard.get(entry.card_id) ?? 0) + entry.amount,
        )
      }
    }

    const overrideByCard = new Map(
      cardOverrides.map((o) => [o.card_id, o.display_total]),
    )

    return paymentCards.map((card) => {
      const tracked = trackedByCard.get(card.id) ?? 0
      const overridden = overrideByCard.has(card.id)
      const display = overridden ? (overrideByCard.get(card.id) as number) : tracked
      return {
        cardId: card.id,
        name: card.name,
        tracked,
        display,
        isOverridden: overridden,
      }
    })
  }, [paymentCards, entriesByCategory, cardOverrides])

  const addPaymentCard = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return null

      setBusy(true)
      setError(null)

      const sort_order =
        paymentCards.length > 0
          ? Math.max(...paymentCards.map((c) => c.sort_order)) + 1
          : 0

      const { data, error: err } = await supabase
        .from('payment_cards')
        .insert({
          user_id: userId,
          name: trimmed,
          is_default: paymentCards.length === 0,
          sort_order,
        })
        .select('*')
        .single()

      setBusy(false)
      if (err) {
        setError(err.message)
        return null
      }

      const card = toCard(data as PaymentCard)
      setPaymentCards((prev) => [...prev, card])
      return card
    },
    [userId, paymentCards],
  )

  const saveCardDisplayTotal = useCallback(
    async (cardId: string, displayTotal: number | null) => {
      if (!selectedMonthId) return
      setBusy(true)
      setError(null)

      const tracked =
        cardSpendTotals.find((c) => c.cardId === cardId)?.tracked ?? 0

      // null or matching tracked amount clears the override
      if (displayTotal === null || Math.abs(displayTotal - tracked) < 0.005) {
        const { error: err } = await supabase
          .from('card_month_overrides')
          .delete()
          .eq('month_id', selectedMonthId)
          .eq('card_id', cardId)

        setBusy(false)
        if (err) {
          setError(err.message)
          return
        }
        await loadCardOverrides(selectedMonthId)
        return
      }

      const existing = cardOverrides.find((o) => o.card_id === cardId)
      if (existing) {
        const { error: err } = await supabase
          .from('card_month_overrides')
          .update({ display_total: displayTotal })
          .eq('id', existing.id)

        setBusy(false)
        if (err) {
          setError(err.message)
          return
        }
      } else {
        const { error: err } = await supabase
          .from('card_month_overrides')
          .insert({
            month_id: selectedMonthId,
            card_id: cardId,
            display_total: displayTotal,
          })

        setBusy(false)
        if (err) {
          setError(err.message)
          return
        }
      }

      await loadCardOverrides(selectedMonthId)
    },
    [
      selectedMonthId,
      cardSpendTotals,
      cardOverrides,
      loadCardOverrides,
    ],
  )

  return {
    months,
    selectedMonth,
    selectedMonthId,
    setSelectedMonthId,
    categoriesBySection,
    entriesByCategory,
    dailySpendTotals,
    cardSpendTotals,
    paymentCards,
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
    addPaymentCard,
    saveCardDisplayTotal,
  }
}

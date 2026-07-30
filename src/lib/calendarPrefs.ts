/** Per-month which cards are hidden under the spend calendar. */

const HIDDEN_CARDS_KEY = 'mybudget.calendarHiddenCardsByMonth.v1'

function loadHiddenMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(HIDDEN_CARDS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string[]> = {}
    for (const [monthId, ids] of Object.entries(parsed)) {
      if (!Array.isArray(ids)) continue
      out[monthId] = ids.filter((id): id is string => typeof id === 'string')
    }
    return out
  } catch {
    return {}
  }
}

function saveHiddenMap(map: Record<string, string[]>) {
  localStorage.setItem(HIDDEN_CARDS_KEY, JSON.stringify(map))
}

/** Card IDs that should appear under the calendar for this month. */
export function loadCalendarVisibleCardIds(
  monthId: string,
  knownIds: string[],
): string[] {
  const hidden = new Set(loadHiddenMap()[monthId] ?? [])
  return knownIds.filter((id) => !hidden.has(id))
}

export function saveCalendarVisibleCardIds(
  monthId: string,
  knownIds: string[],
  visibleIds: string[],
) {
  const visible = new Set(visibleIds)
  const hidden = knownIds.filter((id) => !visible.has(id))
  const map = loadHiddenMap()
  if (hidden.length === 0) {
    delete map[monthId]
  } else {
    map[monthId] = hidden
  }
  saveHiddenMap(map)
}

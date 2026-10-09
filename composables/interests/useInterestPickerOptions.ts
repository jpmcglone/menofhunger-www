import type { ComputedRef, Ref } from 'vue'
import type { GetTopicCategoriesData, GetCategoryTopicsData, Topic, TopicCategory } from '~/types/api'
import {
  INTEREST_CATEGORY_ORDER,
  interestDisplayLabel,
  interestMatchesFuzzy,
  interestNormKey,
  interestStoredValue,
  type InterestPickerOption,
} from './interestPickerUtils'

type Option = InterestPickerOption

/** Preset + suggested interest options, fuzzy filtering and grouping for the interests picker dialog. */
export function useInterestPickerOptions(selected: ComputedRef<string[]>, query: Ref<string>) {
  const { apiFetch } = useApiClient()
  const { options: topicOptions, load: loadTopicOptions } = useTopicOptions()

  const presetOptions = computed<Option[]>(() =>
    (topicOptions.value ?? []).map((o) => ({
      value: o.value,
      label: o.label,
      group: o.group,
      keywords: Array.isArray(o.aliases) ? o.aliases : [],
    })),
  )

  const presetValueByNorm = computed(() => {
    const map = new Map<string, string>()
    for (const o of presetOptions.value) {
      map.set(interestNormKey(o.value), o.value)
      map.set(interestNormKey(o.label), o.value)
    }
    return map
  })

  function toStoredValue(raw: string): string {
    return interestStoredValue(raw, presetValueByNorm.value)
  }

  function labelFor(value: string): string {
    const preset = (topicOptions.value ?? []).find((o) => o.value === value)
    return interestDisplayLabel(value, preset?.label)
  }

  const categoryRows = ref<TopicCategory[]>([])
  const suggestedByGroup = ref<Record<string, Option[]>>({})

  const CATEGORY_ORDER = INTEREST_CATEGORY_ORDER

  async function fetchCategoryRows(): Promise<TopicCategory[]> {
    try {
      const res = await apiFetch<GetTopicCategoriesData>('/topics/categories', { method: 'GET', query: { limit: 20 } })
      return (res.data ?? []) as TopicCategory[]
    } catch {
      return []
    }
  }

  async function fetchSuggestedByGroup() {
    // Ensure topic options are loaded so label/value mapping is stable.
    try {
      await loadTopicOptions()
    } catch {
      // If options fail, still try suggested endpoints (will render raw topics).
    }

    categoryRows.value = await fetchCategoryRows()
    const byKey = new Map<string, TopicCategory>()
    for (const c of categoryRows.value) byKey.set(c.category, c)

    const groupsToFetch = CATEGORY_ORDER
      .map((label) => {
        const key = Array.from(byKey.values()).find((c) => c.label === label)?.category ?? null
        return key ? { key, label } : null
      })
      .filter(Boolean) as Array<{ key: string; label: string }>

    const results = await Promise.allSettled(
      groupsToFetch.map(async (g) => {
        const res = await apiFetch<GetCategoryTopicsData>(`/topics/categories/${encodeURIComponent(g.key)}/topics`, { method: 'GET' })
        const rows = (res.data ?? []) as Topic[]
        const options: Option[] = rows
          .filter((t) => (t.postCount ?? 0) > 0)
          .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0) || (b.score ?? 0) - (a.score ?? 0) || a.topic.localeCompare(b.topic))
          .slice(0, 6)
          .map((t) => ({ value: toStoredValue(t.topic), label: labelFor(toStoredValue(t.topic)), group: g.label }))
          .filter((o) => Boolean(o.value))
        return { group: g.label, options }
      }),
    )

    const next: Record<string, Option[]> = {}
    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      next[r.value.group] = r.value.options
    }
    suggestedByGroup.value = next
  }

  const allOptions = computed<Option[]>(() => {
    // All presets + any currently-selected custom values (so they stay visible).
    const base = presetOptions.value
    const custom = selected.value
      .filter((v) => !(topicOptions.value ?? []).some((o) => o.value === v))
      .map((v) => ({ value: v, label: labelFor(v), group: 'Custom' }))
    const map = new Map<string, Option>()
    for (const o of [...custom, ...base]) map.set(o.value, o)
    return Array.from(map.values())
  })

  const suggestedValueSet = computed(() => {
    const set = new Set<string>()
    for (const group of Object.keys(suggestedByGroup.value ?? {})) {
      for (const o of suggestedByGroup.value[group] ?? []) set.add(o.value)
    }
    return set
  })

  const queryTrimmed = computed(() => query.value.trim())

  function matchesFuzzy(opt: Option, q: string): boolean {
    return interestMatchesFuzzy(opt, q)
  }

  const filteredAllOptions = computed(() => {
    const q = queryTrimmed.value
    const base = allOptions.value.filter((o) => !suggestedValueSet.value.has(o.value))
    if (!q) return base
    return base.filter((o) => matchesFuzzy(o, q))
  })

  const groupedAllOptions = computed(() => {
    const groups = new Map<string, Option[]>()
    for (const opt of filteredAllOptions.value) {
      const g = opt.group || 'Other'
      const arr = groups.get(g) ?? []
      arr.push(opt)
      groups.set(g, arr)
    }

    const orderedGroups: Array<{ group: string; options: Option[] }> = []
    const order = [...CATEGORY_ORDER, 'Custom'] as const
    for (const g of order) {
      const opts = groups.get(g as string)
      if (!opts || opts.length === 0) continue
      opts.sort((a, b) => a.label.localeCompare(b.label))
      orderedGroups.push({ group: g as string, options: opts })
      groups.delete(g as string)
    }
    // Any leftover groups (unlikely) go last.
    for (const [g, opts] of groups) {
      if (!opts.length) continue
      opts.sort((a, b) => a.label.localeCompare(b.label))
      orderedGroups.push({ group: g, options: opts })
    }
    return orderedGroups
  })

  const filteredSuggestedGroups = computed(() => {
    const q = queryTrimmed.value
    const groups: Array<{ group: string; options: Option[] }> = []
    for (const group of CATEGORY_ORDER) {
      const opts = suggestedByGroup.value[group] ?? []
      const filtered = q ? opts.filter((o) => matchesFuzzy(o, q)) : opts
      if (filtered.length) groups.push({ group, options: filtered })
    }
    return groups
  })

  return {
    labelFor,
    fetchSuggestedByGroup,
    groupedAllOptions,
    filteredSuggestedGroups,
  }
}

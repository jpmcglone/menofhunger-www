<template>
  <div class="space-y-2">
    <div class="flex items-baseline justify-between gap-3">
      <label v-if="label" class="text-sm font-medium moh-text">
        {{ label }}
        <span v-if="required" class="ml-0.5">*</span>
      </label>
      <div v-if="helperRight" class="text-xs moh-text-muted">
        {{ helperRight }}
      </div>
    </div>

    <button
      type="button"
      class="w-full rounded-xl border moh-border p-3 text-left transition-colors moh-surface-hover disabled:opacity-60"
      :disabled="disabled"
      @click="openDialog"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold moh-text">
            {{ selected.length > 0 ? `${selected.length} selected` : emptyLabel }}
          </div>
          <div v-if="description" class="mt-1 text-xs moh-text-muted">
            {{ description }}
          </div>
        </div>
        <Icon name="tabler:chevron-right" class="moh-text-muted" aria-hidden="true" />
      </div>

      <div v-if="selected.length > 0 && showSelectedChips" class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="v in selected"
          :key="v"
          class="inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold leading-none"
          :style="{ borderColor: 'var(--p-primary-color)', color: 'var(--p-primary-color)', backgroundColor: 'transparent' }"
        >
          {{ labelFor(v) }}
        </span>
      </div>
    </button>

    <div v-if="helperBottom" class="text-xs moh-text-muted">
      {{ helperBottom }}
    </div>

    <AppModal
      v-model="dialogOpen"
      title="Select interests"
      max-width-class="max-w-[46rem]"
      :dismissable-mask="true"
      :disable-close="disabled"
      body-class="p-0 overflow-hidden"
      max-height="min(90vh, 46rem)"
    >
      <div class="p-4 h-full flex flex-col gap-3">
        <div class="text-sm moh-text-muted">
          Search and pick interests.
        </div>

        <div class="space-y-2">
          <InputText
            ref="queryEl"
            v-model="query"
            class="w-full"
            placeholder="Search interests…"
          />

          <div class="flex items-center justify-between gap-3">
            <div class="text-xs moh-text-muted">
              {{ draft.length }} selected
              <span v-if="required && draft.length < min"> · pick at least {{ min }}</span>
              <span v-if="draft.length >= max"> · max {{ max }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Button
                v-if="draft.length > 0"
                label="Clear"
                text
                severity="secondary"
                :disabled="disabled"
                @click="draft = []"
              />
            </div>
          </div>
        </div>

        <!-- Scrollable tags area (Suggested + More) -->
        <div class="flex-1 min-h-0 overflow-y-auto pt-1 space-y-4">
          <div v-if="filteredSuggestedGroups.length > 0" class="space-y-2">
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 text-center">
              Suggested
            </div>
            <div class="space-y-4">
              <div v-for="g in filteredSuggestedGroups" :key="`sg-${g.group}`" class="space-y-2">
                <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 text-center">
                  {{ g.group }}
                </div>
                <div class="flex flex-wrap justify-center gap-2">
                  <button
                    v-for="opt in g.options"
                    :key="`s-${g.group}-${opt.value}`"
                    type="button"
                    class="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
                    :class="draft.includes(opt.value) ? 'bg-transparent' : 'moh-surface-hover'"
                    :style="
                      draft.includes(opt.value)
                        ? { borderColor: 'var(--p-primary-color)', color: 'var(--p-primary-color)' }
                        : { borderColor: 'var(--moh-border)', color: 'var(--moh-text)' }
                    "
                    :disabled="disabled || (!draft.includes(opt.value) && draft.length >= max)"
                    @click="toggle(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 text-center">
              More interests
            </div>
            <div class="space-y-6">
              <div
                v-for="g in groupedAllOptions"
                :key="g.group"
                class="space-y-2"
              >
                <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 text-center">
                  {{ g.group }}
                </div>
                <TransitionGroup name="moh-interest" tag="div" class="flex flex-wrap justify-center gap-2">
                  <button
                    v-for="opt in g.options"
                    :key="opt.value"
                    type="button"
                    class="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
                    :class="draft.includes(opt.value) ? 'bg-transparent' : 'moh-surface-hover'"
                    :style="
                      draft.includes(opt.value)
                        ? { borderColor: 'var(--p-primary-color)', color: 'var(--p-primary-color)' }
                        : { borderColor: 'var(--moh-border)', color: 'var(--moh-text)' }
                    "
                    :disabled="disabled || (!draft.includes(opt.value) && draft.length >= max)"
                    @click="toggle(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                  </button>
                </TransitionGroup>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-xs moh-text-muted text-center sm:text-left">
            Tip: press Enter to add what you typed.
          </div>
          <div class="flex items-center justify-end gap-2">
            <Button label="Cancel" severity="secondary" text :disabled="disabled" @click="closeDialog" />
            <Button
              label="Done"
              :disabled="(required && draft.length < min) || disabled"
              @click="commit"
            >
              <template #icon>
                <Icon name="tabler:check" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import type { GetTopicCategoriesData, GetCategoryTopicsData, Topic, TopicCategory } from '~/types/api'

type Option = { value: string; label: string; group?: string; keywords?: string[] }

const props = withDefaults(defineProps<{
  modelValue: string[]
  disabled?: boolean
  required?: boolean
  min?: number
  max?: number
  label?: string
  emptyLabel?: string
  description?: string
  helperRight?: string
  helperBottom?: string
  showSelectedChips?: boolean
}>(), {
  disabled: false,
  required: true,
  min: 1,
  max: 30,
  label: 'Interests',
  emptyLabel: 'Select interests',
  description: 'Search and pick tags that describe what you’re into.',
  helperRight: 'Pick at least 1',
  helperBottom: 'We’ll use these to personalize your experience.',
  showSelectedChips: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void
}>()

const { apiFetch } = useApiClient()
const { options: topicOptions, load: loadTopicOptions } = useTopicOptions()

const selected = computed(() => Array.isArray(props.modelValue) ? props.modelValue : [])

const dialogOpen = ref(false)
const draft = ref<string[]>([])
const query = ref('')
const queryEl = ref<HTMLInputElement | null>(null)

function normKey(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
}

const presetOptions = computed<Option[]>(() =>
  (topicOptions.value ?? []).map((o) => ({
    value: o.value,
    label: o.label,
    group: o.group,
    // Treat aliases as searchable keywords.
    keywords: Array.isArray(o.aliases) ? o.aliases : [],
  })),
)

const presetValueByNorm = computed(() => {
  const map = new Map<string, string>()
  for (const o of presetOptions.value) {
    map.set(normKey(o.value), o.value)
    map.set(normKey(o.label), o.value)
  }
  return map
})

function toStoredValue(raw: string): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''
  const key = normKey(trimmed)
  const mapped = presetValueByNorm.value.get(key)
  if (mapped) return mapped
  // Custom: keep as lowercase words (spaces), bounded to API max(40) and safe-ish chars.
  const cleaned = trimmed
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/[^a-z0-9 '\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
  return cleaned
}

function labelFor(value: string): string {
  const preset = (topicOptions.value ?? []).find((o) => o.value === value)
  if (preset) {
    // Normalize any legacy snake_case labels to a stable display form.
    // (This prevents SSR/client hydration mismatches when one side has topic options cached.)
    return String(preset.label ?? '')
      .trim()
      .replace(/[_\s]+/g, ' ')
      .replace(/\s+/g, ' ')
  }
  // SSR/hydration-safe fallback:
  // - Presets are often snake_case (e.g. "tech_news") but labels are spaced (e.g. "Tech news")
  // - On SSR, global topic-options cache may be warm; on client it starts cold
  //   → ensure fallback matches the label style to avoid hydration mismatches.
  const s = String(value ?? '')
    .trim()
    .replace(/[_\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
  if (!s) return value
  const out = s.charAt(0).toUpperCase() + s.slice(1)
  return out.slice(0, 64)
}

const categoryRows = ref<TopicCategory[]>([])
const suggestedByGroup = ref<Record<string, Option[]>>({})

const CATEGORY_ORDER = ['Religion', 'Politics', 'Business', 'Technology', 'Health', 'Relationships', 'Philosophy'] as const
const interestGroupKeywords: Record<string, string[]> = {
  Religion: ['faith', 'church', 'bible', 'prayer', 'theology'],
  Politics: ['news', 'elections', 'policy', 'government', 'law'],
  Business: ['money', 'finance', 'career', 'investing', 'leadership'],
  Technology: ['tech', 'software', 'coding', 'ai', 'security'],
  Health: ['fitness', 'gym', 'nutrition', 'sleep', 'mental health'],
  Relationships: ['dating', 'marriage', 'family', 'friendship', 'communication'],
  Philosophy: ['meaning', 'purpose', 'ethics', 'stoicism', 'habits'],
}

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

function normalizeSearchText(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
}

function matchesFuzzy(opt: Option, q: string): boolean {
  const query = normalizeSearchText(q)
  if (!query) return true
  const tokens = query.split(' ').filter(Boolean)
  if (!tokens.length) return true

  const group = opt.group || ''
  const groupExtra = interestGroupKeywords[group] ?? []
  const parts = [
    opt.label,
    opt.value,
    group,
    ...(opt.keywords ?? []),
    ...groupExtra,
  ]
  const hay = normalizeSearchText(parts.join(' '))
  return tokens.every((t) => hay.includes(t))
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

function toggle(value: string) {
  const v = String(value ?? '').trim()
  if (!v) return
  const next = new Set(draft.value)
  if (next.has(v)) next.delete(v)
  else {
    if (draft.value.length >= props.max) return
    next.add(v)
  }
  draft.value = Array.from(next)
}

// Custom interests disabled: curated list only.

function openDialog() {
  if (props.disabled) return
  dialogOpen.value = true
}

function onDialogShow() {
  query.value = ''
  draft.value = [...selected.value]
  void fetchSuggestedByGroup()
  // focus after next tick so modal renders input
  void nextTick(() => queryEl.value?.focus?.())
}

function closeDialog() {
  dialogOpen.value = false
}

function commit() {
  const cleaned = Array.from(
    new Set(
      (draft.value ?? [])
        .map((s) => String(s ?? '').trim())
        .filter(Boolean),
    ),
  ).slice(0, props.max)
  emit('update:modelValue', cleaned)
  closeDialog()
}

watch(
  dialogOpen,
  (open) => {
    if (open) onDialogShow()
  },
  { flush: 'post' },
)
</script>

<style scoped>
.moh-interest-enter-active,
.moh-interest-leave-active {
  transition: all 160ms ease;
}
.moh-interest-move {
  transition: transform 160ms ease;
}
.moh-interest-enter-from,
.moh-interest-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>


<script setup lang="ts">
import type { FollowListUser } from '~/types/api'

const props = withDefaults(defineProps<{
  modelValue: FollowListUser | null
  placeholder?: string
  disabled?: boolean
  debounceMs?: number
}>(), {
  placeholder: 'Search by name or username',
  disabled: false,
  debounceMs: 220,
})

const emit = defineEmits<{
  'update:modelValue': [user: FollowListUser | null]
}>()

const { apiFetchData } = useApiClient()

const inputEl = ref<HTMLInputElement | null>(null)
const query = ref('')
const open = ref(false)
const results = ref<FollowListUser[]>([])
const highlightedIndex = ref(0)
const isLoading = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let inflight: AbortController | null = null

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function relationshipRank(u: FollowListUser): number {
  const vf = Boolean(u.relationship?.viewerFollowsUser)
  const fv = Boolean(u.relationship?.userFollowsViewer)
  if (vf && fv) return 0
  if (vf) return 1
  if (fv) return 2
  return 3
}

function score(u: FollowListUser, q: string): number {
  const un = normalize(u.username ?? '')
  const name = normalize(u.name ?? '')
  if (un === q) return 4
  if (un.startsWith(q)) return 3
  if (name.startsWith(q)) return 2
  if (un.includes(q) || name.includes(q)) return 1
  return 0
}

async function fetchUsers(q: string) {
  if (inflight) {
    try { inflight.abort() } catch { /* noop */ }
    inflight = null
  }

  if (!q.trim()) {
    results.value = []
    open.value = false
    return
  }

  const controller = new AbortController()
  inflight = controller
  isLoading.value = true

  try {
    const res = await apiFetchData<FollowListUser[]>('/search', {
      method: 'GET',
      query: { type: 'users', q, limit: 8 },
      cache: 'no-store',
      signal: controller.signal,
    })
    const raw = Array.isArray(res) ? res : []
    const qNorm = normalize(q)
    const scored = raw
      .filter(u => Boolean((u.username ?? '').trim()))
      .map((u, idx) => ({
        u,
        idx,
        s: score(u, qNorm),
        r: relationshipRank(u),
        unverified: isUnverified(u),
      }))

    const byPriority = (a: (typeof scored)[number], b: (typeof scored)[number]) => {
      // Relationship priority: mutual -> following -> follows you -> neither.
      if (a.r !== b.r) return a.r - b.r
      // Within same bucket, keep relevance and stable source order.
      if (a.s !== b.s) return b.s - a.s
      return a.idx - b.idx
    }

    const verified = scored.filter(x => !x.unverified).sort(byPriority)
    const unverified = scored.filter(x => x.unverified).sort(byPriority)
    results.value = [...verified, ...unverified].map(x => x.u)
    open.value = results.value.length > 0
    highlightedIndex.value = firstSelectableIndex()
  } catch (e: unknown) {
    if ((e as any)?.name === 'AbortError') return
    results.value = []
  } finally {
    if (inflight === controller) {
      inflight = null
      isLoading.value = false
    }
  }
}

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchUsers(query.value), Math.max(0, Number(props.debounceMs) || 0))
}

function select(user: FollowListUser) {
  emit('update:modelValue', user)
  query.value = ''
  open.value = false
  results.value = []
}

function clear() {
  emit('update:modelValue', null)
  query.value = ''
  results.value = []
  nextTick(() => inputEl.value?.focus())
}

function isUnverified(u: FollowListUser): boolean {
  return (u.verifiedStatus ?? 'none') === 'none'
}

function nextSelectableIndex(start: number, delta: 1 | -1): number {
  if (results.value.length === 0) return 0
  let i = Math.max(0, Math.min(start, results.value.length - 1))
  for (let step = 0; step < results.value.length; step += 1) {
    i += delta
    if (i < 0) i = results.value.length - 1
    if (i >= results.value.length) i = 0
    const u = results.value[i]
    if (u && !isUnverified(u)) return i
  }
  return highlightedIndex.value
}

function firstSelectableIndex(): number {
  const i = results.value.findIndex((u) => !isUnverified(u))
  return i >= 0 ? i : 0
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightedIndex.value = nextSelectableIndex(highlightedIndex.value, 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIndex.value = nextSelectableIndex(highlightedIndex.value, -1)
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    const u = results.value[highlightedIndex.value]
    if (u && !isUnverified(u)) {
      e.preventDefault()
      select(u)
    }
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function onBlur() {
  setTimeout(() => { open.value = false }, 150)
}

function relationshipLabel(u: FollowListUser): string {
  const vf = Boolean(u.relationship?.viewerFollowsUser)
  const fv = Boolean(u.relationship?.userFollowsViewer)
  if (vf && fv) return 'Mutual'
  if (vf) return 'Following'
  if (fv) return 'Follows you'
  return ''
}
</script>

<template>
  <div class="relative">
    <!-- Selected chip -->
    <div
      v-if="modelValue"
      class="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border moh-border moh-surface"
    >
      <AppUserAvatar
        :user="{ id: modelValue.id, username: modelValue.username, avatarUrl: modelValue.avatarUrl, isOrganization: modelValue.isOrganization }"
        size-class="h-7 w-7"
        :show-presence="false"
      />
      <div class="flex-1 min-w-0">
        <span class="font-semibold text-sm moh-text truncate block">
          {{ modelValue.name?.trim() || `@${modelValue.username}` }}
        </span>
        <span v-if="modelValue.name" class="text-xs moh-text-muted">@{{ modelValue.username }}</span>
      </div>
      <button
        type="button"
        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-1 shrink-0"
        aria-label="Clear selection"
        @click="clear"
      >
        <Icon name="tabler:x" size="16" />
      </button>
    </div>

    <!-- Search input -->
    <div v-else class="relative">
      <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <Icon
          v-if="isLoading"
          name="tabler:loader-2"
          size="16"
          class="text-gray-400 animate-spin"
        />
        <Icon
          v-else
          name="tabler:search"
          size="16"
          class="text-gray-400"
        />
      </div>
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full pl-9 pr-3 py-2.5 rounded-xl border moh-border moh-surface moh-text text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:focus:ring-amber-400/40 placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
      />
    </div>

    <!-- Dropdown -->
    <Transition name="moh-fade">
      <div
        v-if="open && !modelValue"
        class="absolute z-50 mt-1.5 w-full border moh-border bg-white dark:bg-zinc-950 rounded-xl shadow-xl overflow-hidden"
      >
        <button
          v-for="(u, i) in results"
          :key="u.id"
          type="button"
          :disabled="isUnverified(u)"
          class="w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors"
          :class="[
            isUnverified(u)
              ? 'opacity-55 cursor-not-allowed'
              : (i === highlightedIndex ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10')
          ]"
          @mouseenter="() => { if (!isUnverified(u)) highlightedIndex = i }"
          @mousedown.prevent
          @click="() => { if (!isUnverified(u)) select(u) }"
        >
          <AppUserAvatar
            :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl, isOrganization: u.isOrganization }"
            size-class="h-9 w-9"
            :show-presence="false"
            class="shrink-0"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-semibold text-sm moh-text truncate">
                {{ u.name?.trim() || `@${u.username}` }}
              </span>
              <AppVerifiedBadge
                v-if="u.verifiedStatus && u.verifiedStatus !== 'none'"
                :status="u.verifiedStatus"
                :premium="u.premium"
                :premium-plus="u.premiumPlus"
                :is-organization="u.isOrganization"
              />
            </div>
            <div class="text-xs moh-text-muted truncate">@{{ u.username }}</div>
          </div>
          <div v-if="relationshipLabel(u)" class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {{ relationshipLabel(u) }}
          </div>
          <div
            v-else-if="isUnverified(u)"
            class="text-[11px] font-medium text-gray-500 dark:text-gray-400 shrink-0 rounded-full border border-gray-300 dark:border-zinc-600 px-2 py-0.5"
          >
            Unverified - can't receive coins
          </div>
        </button>
      </div>
    </Transition>
  </div>
</template>

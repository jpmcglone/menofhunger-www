<script setup lang="ts">
import { isAbortError } from '~/utils/api-error'
import type { FollowListUser, CommunityGroupShell, RecentSearch } from '~/types/api'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  inputClass?: string
  /** If true, the input uses the rounded-full style (right rail). */
  pill?: boolean
  inlineRecents?: boolean
}>(), {
  modelValue: '',
  placeholder: 'Search…',
  inputClass: '',
  pill: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** Fired when the user confirms a search (Enter or query row). Empty string = browse Explore. */
  submit: [query: string]
  focus: []
}>()

const { isAuthed } = useAuth()
const { apiFetchData } = useApiClient()
const { recents, loaded, loading, load, recordUser, recordGroup, remove, clearAll, invalidate } = useRecentSearches()

const inputRef = ref<{ $el?: HTMLElement } | null>(null)
const wrapEl = ref<HTMLElement | null>(null)
const focused = ref(false)
const { style: menuStyle, menuEl, place: placeMenu, reset: resetMenu } = useMenuPosition()
let blurTimer: ReturnType<typeof setTimeout> | null = null
const query = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
const queryTrimmed = computed(() => (query.value ?? '').trim())

function getInputEl(): HTMLInputElement | null {
  const raw = inputRef.value?.$el ?? (inputRef.value as unknown as HTMLElement | null)
  if (raw instanceof HTMLInputElement) return raw
  if (raw instanceof HTMLElement) {
    return raw.tagName === 'INPUT'
      ? (raw as HTMLInputElement)
      : raw.querySelector('input')
  }
  return null
}

// ── People + Groups typeahead ─────────────────────────────────────────────────
const people = ref<FollowListUser[]>([])
const groups = ref<CommunityGroupShell[]>([])
const resultsLoading = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let inflightPeople: AbortController | null = null
let inflightGroups: AbortController | null = null

async function fetchResults(q: string) {
  // Cancel in-flight requests
  try { inflightPeople?.abort() } catch { /* noop */ }
  try { inflightGroups?.abort() } catch { /* noop */ }
  inflightPeople = null
  inflightGroups = null

  if (q.length < 1) {
    people.value = []
    groups.value = []
    return
  }

  const ctrlPeople = new AbortController()
  const ctrlGroups = new AbortController()
  inflightPeople = ctrlPeople
  inflightGroups = ctrlGroups
  resultsLoading.value = true

  try {
    const [peopleRes, groupsRes] = await Promise.allSettled([
      apiFetchData<FollowListUser[]>('/search', {
        method: 'GET',
        query: { type: 'users', q, limit: 5 },
        cache: 'no-store',
        signal: ctrlPeople.signal,
      }),
      apiFetchData<CommunityGroupShell[]>('/search', {
        method: 'GET',
        query: { type: 'groups', q, limit: 3 },
        cache: 'no-store',
        signal: ctrlGroups.signal,
      }),
    ])
    if (peopleRes.status === 'fulfilled') people.value = Array.isArray(peopleRes.value) ? peopleRes.value : []
    if (groupsRes.status === 'fulfilled') groups.value = Array.isArray(groupsRes.value) ? groupsRes.value : []
  } catch (e: unknown) {
    if (isAbortError(e)) return
    people.value = []
    groups.value = []
  } finally {
    if (inflightPeople === ctrlPeople && inflightGroups === ctrlGroups) {
      inflightPeople = null
      inflightGroups = null
      resultsLoading.value = false
    }
  }
}

function scheduleFetch(q: string) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchResults(q), 250)
}

watch(queryTrimmed, (val) => {
  if (val.length >= 1) {
    scheduleFetch(val)
  } else {
    people.value = []
    groups.value = []
    if (debounceTimer) clearTimeout(debounceTimer)
  }
})

// ── Panel visibility ─────────────────────────────────────────────────────────
const showRecents = computed(
  () => isAuthed.value && queryTrimmed.value.length === 0 && recents.value.length > 0,
)

const showRecentsLoading = computed(
  () => isAuthed.value && queryTrimmed.value.length === 0 && loading.value && recents.value.length === 0,
)

// Show empty state when loaded with no recents (authed users who haven't searched yet).
const showRecentsEmpty = computed(
  () => isAuthed.value && queryTrimmed.value.length === 0 && loaded.value && recents.value.length === 0,
)

// Open when typing, when recents are present/loading, or for empty-state.
const open = computed(
  () => focused.value && !(props.inlineRecents && queryTrimmed.value.length === 0) && (queryTrimmed.value.length > 0 || showRecents.value || showRecentsLoading.value || showRecentsEmpty.value),
)

const showPeopleSection = computed(
  () => queryTrimmed.value.length > 0 && people.value.length > 0,
)

const showGroupsSection = computed(
  () => queryTrimmed.value.length > 0 && groups.value.length > 0,
)

// ── Keyboard navigation ──────────────────────────────────────────────────────
// Flat list: [0=query-row, 1..N=people, N+1..M=groups]
const highlightedIndex = ref(-1)

const totalItems = computed(() => {
  if (queryTrimmed.value.length > 0) return 1 + people.value.length + groups.value.length
  return 0
})

function onKeydown(e: KeyboardEvent) {
  // Enter always submits (including empty → Explore), even when the panel is closed.
  if (e.key === 'Enter') {
    e.preventDefault()
    if (!open.value || highlightedIndex.value <= 0) {
      submitSearch(queryTrimmed.value)
    } else if (highlightedIndex.value <= people.value.length) {
      const person = people.value[highlightedIndex.value - 1]
      if (person) selectPerson(person)
    } else {
      const group = groups.value[highlightedIndex.value - 1 - people.value.length]
      if (group) selectGroup(group)
    }
    return
  }
  if (!open.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, totalItems.value - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
  } else if (e.key === 'Escape') {
    closePanel()
  }
}

watch(queryTrimmed, () => { highlightedIndex.value = -1 })

function placeSearchMenu() {
  const el = wrapEl.value
  if (!el) return
  placeMenu(el, {
    matchAnchorWidth: true,
    maxHeight: 320,
    menuHeight: 240,
    gap: 4,
    trackViewport: true,
  })
}

watch(open, (isOpen) => {
  if (isOpen) void nextTick(() => placeSearchMenu())
  else resetMenu()
})

watch(
  [people, groups, recents],
  () => {
    if (open.value) void nextTick(() => placeSearchMenu())
  },
)

// ── Actions ──────────────────────────────────────────────────────────────────

function closePanel() {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  focused.value = false
  // Drop DOM focus so Vue state and the input stay in sync. Without this,
  // @mousedown.prevent on result rows leaves the input focused while the panel
  // is closed — browser back then restores a focused field with no dropdown.
  getInputEl()?.blur()
}

function submitSearch(q: string) {
  emit('submit', q.trim())
  invalidate()
  closePanel()
}

function applyRecent(r: RecentSearch) {
  if (r.user) {
    void useRouter().push(`/u/${encodeURIComponent(r.user.username ?? '')}`)
  } else if (r.group) {
    void useRouter().push(`/g/${encodeURIComponent(r.group.slug)}`)
  } else {
    emit('update:modelValue', r.query)
    emit('submit', r.query)
  }
  closePanel()
}

async function selectPerson(user: FollowListUser) {
  closePanel()
  void recordUser(user)
  void useRouter().push(`/u/${encodeURIComponent(user.username ?? '')}`)
}

async function selectGroup(group: CommunityGroupShell) {
  closePanel()
  void recordGroup(group)
  void useRouter().push(`/groups/${encodeURIComponent(group.slug)}`)
}

// ── Focus / blur ─────────────────────────────────────────────────────────────
function onFocus() {
  emit('focus')
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  focused.value = true
  if (isAuthed.value && !loaded.value) void load()
  // Back-nav / focus restoration can land in a focused input without re-running
  // the query watcher; refill results if the field still has a query.
  if (queryTrimmed.value.length >= 1 && people.value.length === 0 && groups.value.length === 0) {
    scheduleFetch(queryTrimmed.value)
  }
}

function onBlur() {
  // Longer delay so the panel stays visible while recents are being fetched and
  // so that @mousedown.prevent on panel buttons has time to fire before we close.
  if (blurTimer) clearTimeout(blurTimer)
  blurTimer = setTimeout(() => {
    focused.value = false
    blurTimer = null
  }, 300)
}

/**
 * Browser history / bfcache can restore focus to the input without firing a
 * focus event. Reconcile Vue `focused` with the real active element.
 */
function syncFocusedFromDom() {
  if (!import.meta.client) return
  const input = getInputEl()
  if (!input) return
  if (document.activeElement !== input) return
  if (!focused.value) onFocus()
}

const router = useRouter()
let stopAfterEach: (() => void) | null = null

onMounted(() => {
  syncFocusedFromDom()
  window.addEventListener('popstate', syncFocusedFromDom)
  window.addEventListener('pageshow', syncFocusedFromDom)
  stopAfterEach = router.afterEach(() => {
    // Focus restoration runs after the navigation settles.
    void nextTick(() => syncFocusedFromDom())
  })
})

onBeforeUnmount(() => {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  window.removeEventListener('popstate', syncFocusedFromDom)
  window.removeEventListener('pageshow', syncFocusedFromDom)
  stopAfterEach?.()
  stopAfterEach = null
})

// ── Public API ───────────────────────────────────────────────────────────────
defineExpose({
  blur: closePanel,
  focus() {
    const el = getInputEl()
    if (el) el.focus()
  },
})
</script>

<template>
  <div ref="wrapEl" class="relative w-full">
    <!-- Input -->
    <IconField icon-position="left" class="w-full">
      <InputIcon>
        <Icon name="tabler:search" class="text-lg opacity-70" aria-hidden="true" />
      </InputIcon>
      <InputText
        ref="inputRef"
        data-moh-search-input
        :value="query"
        :placeholder="placeholder"
        aria-label="Search"
        aria-autocomplete="list"
        :aria-expanded="open"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        :class="['w-full h-11 moh-focus', pill ? '!rounded-full' : '', inputClass]"
        @input="(e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value)"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />
    </IconField>

    <Teleport to="body">
    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out origin-top"
      enter-from-class="opacity-0 scale-y-95"
      enter-to-class="opacity-100 scale-y-100"
      leave-active-class="transition-[opacity,transform] duration-100 ease-in origin-top"
      leave-from-class="opacity-100 scale-y-100"
      leave-to-class="opacity-0 scale-y-95"
    >
      <div
        v-if="open"
        ref="menuEl"
        role="listbox"
        class="fixed z-[var(--moh-z-menu)] overflow-y-auto rounded-xl border moh-border bg-white dark:bg-zinc-950 shadow-xl"
        :style="menuStyle"
      >
        <!-- Recents panel (query empty) -->
        <template v-if="showRecents">
          <div class="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
            <span class="text-xs font-semibold uppercase tracking-wide moh-text-muted">Recent</span>
            <button
              type="button"
              class="text-xs moh-text-muted hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              @mousedown.prevent
              @click.stop="clearAll"
            >
              Clear all
            </button>
          </div>
          <AppSearchRecentRow
            v-for="r in recents.slice(0, 8)"
            :key="r.id"
            :recent="r"
            @close="closePanel"
            @apply="applyRecent(r)"
            @remove="remove(r.id)"
          />
        </template>

        <!-- Recents loading skeleton -->
        <template v-else-if="showRecentsLoading">
          <div class="flex justify-center py-5">
            <Icon name="tabler:loader-2" class="animate-spin moh-text-muted" size="20" />
          </div>
        </template>

        <!-- Empty state: authed, loaded, but no recents yet -->
        <template v-else-if="showRecentsEmpty">
          <div class="px-4 py-5 text-center">
            <p class="text-sm font-medium moh-text">No recent searches</p>
            <p class="text-xs moh-text-muted mt-0.5">Try searching for people, groups, or posts</p>
          </div>
        </template>

        <!-- Typing state: query row + people + groups -->
        <template v-else-if="queryTrimmed.length > 0">
          <!-- Row 0: exact query (magnifier + text) -->
          <div
            role="option"
            :aria-selected="highlightedIndex === 0"
            class="relative flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
            :class="highlightedIndex === 0 ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'"
            @mousedown.prevent
            @mouseenter="highlightedIndex = 0"
            @click.stop="submitSearch(queryTrimmed)"
          >
            <div class="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
              <Icon name="tabler:search" class="text-base moh-text-muted" aria-hidden="true" />
            </div>
            <span class="text-sm moh-text min-w-0 truncate">{{ queryTrimmed }}</span>
          </div>

          <!-- Divider + People rows -->
          <template v-if="showPeopleSection">
            <div class="border-t moh-border mx-2" />
            <div
              v-for="(u, i) in people"
              :key="u.id"
              role="option"
              :aria-selected="highlightedIndex === i + 1"
              class="relative flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
              :class="highlightedIndex === i + 1 ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'"
              @mousedown.prevent
              @mouseenter="highlightedIndex = i + 1"
              @click.stop="selectPerson(u)"
            >
              <NuxtLink
                :to="`/u/${encodeURIComponent(u.username ?? '')}`"
                class="absolute inset-0 z-[1]"
                tabindex="-1"
                aria-hidden="true"
                @click.capture="() => { closePanel(); void recordUser(u) }"
              />
              <div class="relative z-[2] flex items-center gap-2.5 w-full min-w-0 pointer-events-none">
                <AppSearchPersonSummary :user="u" />
                <div v-if="u.relationship?.viewerFollowsUser || u.relationship?.userFollowsViewer" class="shrink-0 text-xs moh-text-muted">
                  {{ u.relationship?.viewerFollowsUser && u.relationship?.userFollowsViewer ? 'Mutual' : u.relationship?.viewerFollowsUser ? 'Following' : 'Follows you' }}
                </div>
              </div>
            </div>
          </template>

          <!-- Divider + Group rows -->
          <template v-if="showGroupsSection">
            <div class="border-t moh-border mx-2" />
            <div
              v-for="(g, i) in groups"
              :key="g.id"
              role="option"
              :aria-selected="highlightedIndex === people.length + 1 + i"
              class="relative flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
              :class="highlightedIndex === people.length + 1 + i ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'"
              @mousedown.prevent
              @mouseenter="highlightedIndex = people.length + 1 + i"
              @click.stop="selectGroup(g)"
            >
              <NuxtLink
                :to="`/groups/${encodeURIComponent(g.slug)}`"
                class="absolute inset-0 z-[1]"
                tabindex="-1"
                aria-hidden="true"
                @click.capture="() => { closePanel(); void recordGroup(g) }"
              />
              <div class="relative z-[2] flex items-center gap-2.5 w-full min-w-0 pointer-events-none">
                <AppSearchGroupSummary :group="g" />
                <span class="shrink-0 text-xs moh-text-muted">Group</span>
              </div>
            </div>
          </template>

          <!-- Spinner while loading results -->
          <div v-if="resultsLoading && !showPeopleSection && !showGroupsSection" class="flex justify-center py-3">
            <Icon name="tabler:loader-2" class="animate-spin moh-text-muted" size="18" />
          </div>
        </template>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>

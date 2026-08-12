<script setup lang="ts">
import type { FollowListUser, CommunityGroupShell, RecentSearch } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  inputClass?: string
  /** If true, the input uses the rounded-full style (right rail). */
  pill?: boolean
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
}>()

const { isAuthed } = useAuth()
const { apiFetchData } = useApiClient()
const { recents, loaded, loading, load, recordUser, recordGroup, remove, clearAll, invalidate } = useRecentSearches()

const inputRef = ref<{ $el?: HTMLElement } | null>(null)
const focused = ref(false)
let blurTimer: ReturnType<typeof setTimeout> | null = null
const query = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
const queryTrimmed = computed(() => (query.value ?? '').trim())
const groupRoundClass = groupAvatarRoundClass()

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
    if ((e as any)?.name === 'AbortError') return
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
  () => focused.value && (queryTrimmed.value.length > 0 || showRecents.value || showRecentsLoading.value || showRecentsEmpty.value),
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
  focus() {
    const el = getInputEl()
    if (el) el.focus()
  },
})
</script>

<template>
  <div class="relative w-full">
    <!-- Input -->
    <IconField iconPosition="left" class="w-full">
      <InputIcon>
        <Icon name="tabler:search" class="text-lg opacity-70" aria-hidden="true" />
      </InputIcon>
      <InputText
        ref="inputRef"
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

    <!-- Dropdown panel -->
    <Transition
      enter-active-class="transition-all duration-150 ease-out origin-top"
      enter-from-class="opacity-0 scale-y-95"
      enter-to-class="opacity-100 scale-y-100"
      leave-active-class="transition-all duration-100 ease-in origin-top"
      leave-from-class="opacity-100 scale-y-100"
      leave-to-class="opacity-0 scale-y-95"
    >
      <div
        v-if="open"
        role="listbox"
        class="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border moh-border bg-white dark:bg-zinc-950 shadow-xl"
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
          <div
            v-for="r in recents.slice(0, 8)"
            :key="r.id"
            class="relative flex items-center gap-2.5 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            role="option"
          >
            <!-- Background anchor (full-row click) -->
            <NuxtLink
              v-if="r.user?.username"
              :to="`/u/${encodeURIComponent(r.user.username)}`"
              class="absolute inset-0 z-[1]"
              tabindex="-1"
              aria-hidden="true"
              @click.capture="closePanel"
            />
            <NuxtLink
              v-else-if="r.group?.slug"
              :to="`/groups/${encodeURIComponent(r.group.slug)}`"
              class="absolute inset-0 z-[1]"
              tabindex="-1"
              aria-hidden="true"
              @click.capture="closePanel"
            />
            <div
              v-else
              class="absolute inset-0 z-[1] cursor-pointer"
              @mousedown.prevent
              @click.stop="applyRecent(r)"
            />
            <!-- Content at z-[2] -->
            <div class="relative z-[2] flex items-center gap-2.5 w-full min-w-0 pointer-events-none">
              <!-- User avatar -->
              <div v-if="r.user" class="shrink-0">
                <AppUserAvatar
                  :user="{ id: r.user.id, username: r.user.username, avatarUrl: r.user.avatarUrl, isOrganization: r.user.isOrganization }"
                  size-class="h-8 w-8"
                  :show-presence="false"
                />
              </div>
              <!-- Group avatar or icon -->
              <div v-else-if="r.group" class="shrink-0 h-8 w-8 overflow-hidden bg-gray-100 dark:bg-zinc-800 flex items-center justify-center" :class="groupRoundClass">
                <img v-if="r.group.avatarImageUrl" :src="r.group.avatarImageUrl" :alt="r.group.name" class="h-full w-full object-cover" />
                <Icon v-else name="tabler:users-group" class="text-base moh-text-muted" aria-hidden="true" />
              </div>
              <!-- Clock icon for text queries -->
              <div v-else class="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                <Icon name="tabler:clock" class="text-base moh-text-muted" aria-hidden="true" />
              </div>
              <div class="min-w-0 flex-1">
                <template v-if="r.user">
                  <div class="flex items-center gap-1 min-w-0">
                    <span class="font-medium text-sm moh-text truncate">{{ r.user.name?.trim() || `@${r.user.username}` }}</span>
                    <AppVerifiedBadge
                      v-if="r.user.verifiedStatus && r.user.verifiedStatus !== 'none'"
                      :status="r.user.verifiedStatus"
                      :premium="r.user.premium"
                      :premium-plus="r.user.premiumPlus"
                      :is-organization="r.user.isOrganization"
                      :steward-badge-enabled="r.user.stewardBadgeEnabled"
                    />
                  </div>
                  <div class="text-xs moh-text-muted truncate">@{{ r.user.username }}</div>
                </template>
                <template v-else-if="r.group">
                  <div class="text-sm font-medium moh-text truncate">{{ r.group.name }}</div>
                  <div class="text-xs moh-text-muted truncate">{{ r.group.memberCount.toLocaleString() }} {{ r.group.memberCount === 1 ? 'member' : 'members' }}</div>
                </template>
                <span v-else class="text-sm moh-text truncate">{{ r.query }}</span>
              </div>
            </div>
            <!-- Per-row X at z-[3] -->
            <button
              type="button"
              class="relative z-[3] shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors p-0.5 rounded"
              aria-label="Remove from recent searches"
              @mousedown.prevent
              @click.stop="remove(r.id)"
            >
              <Icon name="tabler:x" size="14" />
            </button>
          </div>
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
                <AppUserAvatar
                  :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl, isOrganization: u.isOrganization }"
                  size-class="h-8 w-8"
                  :show-presence="false"
                  class="shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1 min-w-0">
                    <span class="font-medium text-sm moh-text truncate">{{ u.name?.trim() || `@${u.username}` }}</span>
                    <AppVerifiedBadge
                      v-if="u.verifiedStatus && u.verifiedStatus !== 'none'"
                      :status="u.verifiedStatus"
                      :premium="u.premium"
                      :premium-plus="u.premiumPlus"
                      :is-organization="u.isOrganization"
                      :steward-badge-enabled="u.stewardBadgeEnabled"
                    />
                  </div>
                  <div class="text-xs moh-text-muted truncate">@{{ u.username }}</div>
                </div>
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
                <div class="shrink-0 h-8 w-8 overflow-hidden bg-gray-100 dark:bg-zinc-800 flex items-center justify-center" :class="groupRoundClass">
                  <img v-if="g.avatarImageUrl" :src="g.avatarImageUrl" :alt="g.name" class="h-full w-full object-cover" />
                  <Icon v-else name="tabler:users-group" class="text-base moh-text-muted" aria-hidden="true" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium moh-text truncate">{{ g.name }}</div>
                  <div class="text-xs moh-text-muted truncate">{{ g.memberCount.toLocaleString() }} {{ g.memberCount === 1 ? 'member' : 'members' }}</div>
                </div>
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
  </div>
</template>

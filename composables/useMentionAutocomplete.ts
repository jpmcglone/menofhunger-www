import type { Ref } from 'vue'
import type { FollowListUser } from '~/types/api'
import { extractMentionedUsernames, parseActiveMention, type ActiveMention } from '~/utils/mention-autocomplete'
import { getCaretPoint, type CaretPoint } from '~/utils/textarea-caret'
import { userColorTier } from '~/utils/user-tier'

type MentionUser = FollowListUser

type SearchCacheEntry = { expiresAt: number; items: MentionUser[] }

const CACHE_TTL_MS = 30_000
const DEFAULT_LIMIT = 10
const MAX_CACHE_ENTRIES = 200

let mentionAutocompleteIdSeq = 0

// Shared caches across mounts (so new composers can show cached results immediately).
const globalMentionCache = new Map<string, SearchCacheEntry>()
let globalMentionRecent: MentionUser[] = []

function normalize(s: string): string {
  return (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function relationshipRank(u: MentionUser): number {
  const rel = u.relationship
  const vf = Boolean(rel?.viewerFollowsUser)
  const fv = Boolean(rel?.userFollowsViewer)
  if (vf && fv) return 0
  if (vf) return 1
  if (fv) return 2
  return 3
}

export type MentionTier = 'organization' | 'premium' | 'verified' | 'normal'

export function tierFromMentionUser(u: { isOrganization?: boolean; premium?: boolean; premiumPlus?: boolean; verifiedStatus?: string } | null): MentionTier {
  return userColorTier(u)
}

function scoreUsernameMode(u: MentionUser, q: string): number {
  const qLower = normalize(q)
  const un = normalize(u.username ?? '')
  const nm = normalize(u.name ?? '')
  if (!qLower) return 0
  // Username always takes precedence over display-name matches.
  if (un && un === qLower) return 120
  if (un && un.startsWith(qLower)) return 110
  if (nm && nm === qLower) return 80
  if (nm && nm.startsWith(qLower)) return 70
  if (un && un.includes(qLower)) return 60
  if (nm && nm.includes(qLower)) return 50
  return 0
}

export type MentionSection = { title: string; startIndex: number; count: number }

export function useMentionAutocomplete(opts: {
  /** Ref to the actual textarea/input element when available. */
  el: Ref<HTMLTextAreaElement | HTMLInputElement | null>
  /** Get current text value. */
  getText: () => string
  /** Set current text value. */
  setText: (next: string) => void
  /** Optional context usernames to boost (e.g. reply thread participants). */
  contextUsernames?: Ref<string[]>
  /** Debounce ms for search requests. */
  debounceMs?: number
  /** Search limit. */
  limit?: number
  /**
   * When provided, these users appear in a pinned top section (e.g. lobby members).
   * The API is still queried for the remaining "Everyone" section below.
   * When null/undefined, no sections are used (flat list, API-only).
   */
  priorityUsers?: Ref<MentionUser[] | null>
  /** Label for the priority section header (default: "Here"). */
  prioritySectionTitle?: string
}) {
  const { apiFetchData } = useApiClient()

  const idBase = `moh-mention-${++mentionAutocompleteIdSeq}`
  const listboxId = `${idBase}-listbox`

  const open = ref(false)
  const items = ref<MentionUser[]>([])
  const highlightedIndex = ref(0)
  const anchor = ref<CaretPoint | null>(null)
  const active = ref<ActiveMention | null>(null)
  // Number of items at the start of `items` that belong to the priority section.
  const prioritySectionCount = ref(0)

  const limit = typeof opts.limit === 'number' ? Math.max(3, Math.min(20, Math.floor(opts.limit))) : DEFAULT_LIMIT
  const debounceMs = typeof opts.debounceMs === 'number' ? clamp(Math.floor(opts.debounceMs), 0, 600) : 120

  // SSR-safe: never share mutable caches across SSR requests.
  const cache = import.meta.client ? globalMentionCache : new Map<string, SearchCacheEntry>()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let blurCloseTimer: ReturnType<typeof setTimeout> | null = null
  let inflight: AbortController | null = null
  let requestSeq = 0
  let activeRequestId = 0
  let lastQueryNorm: string | null = null
  let caretApplySeq = 0

  const recent = ref<MentionUser[]>([])
  /** Username (lowercase) -> tier for mentions the user has selected in this session. */
  const mentionTiers = ref<Record<string, MentionTier>>({})
  const mounted = ref(false)

  /**
   * When priorityUsers is set and we have ≥2 non-empty groups, expose section metadata
   * so the popover can render labeled headers. Empty when no sections are needed.
   */
  const sections = computed<MentionSection[]>(() => {
    if (!opts.priorityUsers?.value) return []
    const pCount = prioritySectionCount.value
    const otherCount = items.value.length - pCount
    // Only show headers when both sections have results — avoids a lone header label.
    if (pCount <= 0 || otherCount <= 0) return []
    return [
      { title: opts.prioritySectionTitle ?? 'Here', startIndex: 0, count: pCount },
      { title: 'Everyone', startIndex: pCount, count: otherCount },
    ]
  })

  function pruneCache() {
    while (cache.size > MAX_CACHE_ENTRIES) {
      const firstKey = cache.keys().next().value as string | undefined
      if (!firstKey) break
      cache.delete(firstKey)
    }
  }

  function close() {
    open.value = false
    active.value = null
    anchor.value = null
    items.value = []
    highlightedIndex.value = 0
    if (blurCloseTimer) {
      clearTimeout(blurCloseTimer)
      blurCloseTimer = null
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (inflight) {
      try {
        inflight.abort()
      } catch {
        // ignore
      }
      inflight = null
    }
    activeRequestId = 0
    lastQueryNorm = null
  }

  function setActive(next: ActiveMention | null) {
    active.value = next
    if (!next) {
      close()
      return
    }
    open.value = true
    highlightedIndex.value = 0
  }

  function updateAnchor() {
    if (!import.meta.client) return
    const el = opts.el.value
    const a = active.value
    if (!el || !a) return
    anchor.value = getCaretPoint(el, a.caretIndex)
  }

  function rerank(list: MentionUser[], q: string): MentionUser[] {
    const qLower = normalize(q)
    const context = new Set<string>()

    // Already-mentioned usernames in the draft (in-context boost).
    for (const un of extractMentionedUsernames(opts.getText())) context.add(un)
    for (const un of (opts.contextUsernames?.value ?? []).map((s) => normalize(s)).filter(Boolean)) context.add(un)

    const scored = list.map((u, idx) => {
      const base = scoreUsernameMode(u, qLower)
      const rel = relationshipRank(u)
      const relBonus = rel === 0 ? 3 : rel === 1 ? 2 : rel === 2 ? 1 : 0
      const ctxBonus = u.username && context.has(normalize(u.username)) ? 2 : 0
      // Preserve stable order as the last tiebreak.
      return { u, idx, score: base * 10 + relBonus + ctxBonus, rel }
    })

    const filtered = scored.filter((s) => (qLower ? scoreUsernameMode(s.u, qLower) > 0 : true))

    filtered.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      if (a.rel !== b.rel) return a.rel - b.rel
      return a.idx - b.idx
    })
    return filtered.map((s) => s.u)
  }

  function setItems(next: MentionUser[]) {
    items.value = next
    recent.value = next
    if (import.meta.client) globalMentionRecent = next
  }

  function syncMentionTiersFromText(text: string) {
    const usernames = extractMentionedUsernames(text)
    if (!usernames.length) return
    const lookup = new Map<string, MentionUser>()
    for (const u of items.value) {
      const un = (u.username ?? '').trim().toLowerCase()
      if (un) lookup.set(un, u)
    }
    for (const u of recent.value) {
      const un = (u.username ?? '').trim().toLowerCase()
      if (un && !lookup.has(un)) lookup.set(un, u)
    }

    const current = mentionTiers.value
    let next: Record<string, MentionTier> | null = null
    for (const un of usernames) {
      if (current[un]) continue
      const match = lookup.get(un)
      if (!match) continue
      if (!next) next = { ...current }
      next[un] = tierFromMentionUser(match)
    }
    if (next) mentionTiers.value = next
  }

  function getBestCached(qNorm: string): MentionUser[] | null {
    const now = Date.now()
    for (let i = qNorm.length; i >= 1; i--) {
      const k = qNorm.slice(0, i)
      const hit = cache.get(k)
      if (!hit) continue
      if (hit.expiresAt <= now) {
        cache.delete(k)
        continue
      }
      return hit.items
    }
    return null
  }

  async function fetchUsers(q: string, requestId: number) {
    const qNorm = normalize(q)
    const now = Date.now()

    if (inflight) {
      try {
        inflight.abort()
      } catch {
        // ignore
      }
      inflight = null
    }
    const controller = new AbortController()
    inflight = controller

    try {
      const res = await apiFetchData<MentionUser[]>('/search', {
        method: 'GET',
        query: { type: 'users', q, limit },
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      })
      const raw = Array.isArray(res) ? res : []
      const mentionable = raw.filter((u) => Boolean((u.username ?? '').trim()))

      const priorities = opts.priorityUsers?.value
      if (priorities !== undefined && priorities !== null) {
        // Merge: priority section first (local filter), then API results that aren't already there.
        const priorityMatches = rerank(priorities, q).slice(0, limit)
        const priorityIds = new Set(priorityMatches.map((u) => u.id))
        const apiOnly = rerank(mentionable.filter((u) => !priorityIds.has(u.id)), q)
        const merged = [...priorityMatches, ...apiOnly]
        if (activeRequestId !== requestId) return
        prioritySectionCount.value = priorityMatches.length
        setItems(merged)
        if (qNorm) {
          // Cache only the API portion so future non-lobby contexts aren't polluted.
          cache.set(qNorm, { expiresAt: now + CACHE_TTL_MS, items: rerank(mentionable, q) })
          pruneCache()
        }
      } else {
        const ranked = rerank(mentionable, q)
        if (activeRequestId !== requestId) return
        setItems(ranked)
        if (qNorm) {
          cache.set(qNorm, { expiresAt: now + CACHE_TTL_MS, items: ranked })
          pruneCache()
        }
      }
    } catch (e: unknown) {
      if ((e as any)?.name === 'AbortError') return
      if (activeRequestId !== requestId) return
      items.value = []
    } finally {
      if (inflight === controller) inflight = null
    }
  }

  function scheduleFetch() {
    const a = active.value
    if (!a) return
    const q = (a.query ?? '').toString()
    const qNorm = normalize(q)

    if (debounceTimer) clearTimeout(debounceTimer)

    const priorities = opts.priorityUsers?.value
    const hasPriority = priorities !== undefined && priorities !== null

    // When priority users are set, show them immediately as a local pre-population while
    // we wait for the API to fill in the "Everyone" section below.
    if (hasPriority) {
      const matched = rerank(priorities!, q).slice(0, limit)
      prioritySectionCount.value = matched.length
      items.value = matched
    }

    // If user just typed '@' (empty query), show recent/priority immediately — no network call needed.
    if (!q) {
      if (!hasPriority) {
        items.value = recent.value?.length ? recent.value : (globalMentionRecent ?? [])
      }
      updateAnchor()
      highlightedIndex.value = 0
      lastQueryNorm = ''
      return
    }

    // For non-priority mode, show best cached prefix immediately to avoid flicker.
    if (!hasPriority) {
      const cached = qNorm ? getBestCached(qNorm) : null
      if (cached) items.value = cached
    }

    const queryChanged = qNorm !== (lastQueryNorm ?? null)
    if (queryChanged) highlightedIndex.value = 0
    lastQueryNorm = qNorm

    // Fetch faster for first character; debounce more for subsequent typing.
    const delay = q.length <= 1 ? 0 : debounceMs
    const requestId = ++requestSeq
    activeRequestId = requestId
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void fetchUsers(q, requestId)
    }, delay)
    updateAnchor()
  }

  function recompute() {
    const el = opts.el.value
    const text = opts.getText()
    const caret = el && typeof el.selectionStart === 'number' ? el.selectionStart : text.length
    const next = parseActiveMention(text, caret)
    setActive(next)
    if (!next) return
    scheduleFetch()
    syncMentionTiersFromText(text)
  }

  function highlightNext(delta: number) {
    const n = items.value.length
    if (n <= 0) return
    const cur = highlightedIndex.value
    const next = (cur + delta + n) % n
    highlightedIndex.value = next
  }

  function select(user: MentionUser) {
    const a = active.value
    const username = (user.username ?? '').trim()
    if (!a || !username) return

    const tier = tierFromMentionUser(user)
    mentionTiers.value = { ...mentionTiers.value, [username.toLowerCase()]: tier }

    const text = opts.getText()
    const before = text.slice(0, a.atIndex)
    const after = text.slice(a.caretIndex)
    const insertion = `@${username} `
    const nextText = before + insertion + after
    // Caret at end of username + space so user can type the next word.
    const nextCaret = before.length + insertion.length

    // Close immediately so the popover disappears right away.
    close()
    opts.setText(nextText)
    // Wait for v-model/DOM update, then place caret at end of "username " so user can keep typing.
    // Important: if the user types immediately after selecting, don't clobber their caret.
    const applyId = ++caretApplySeq
    void nextTick().then(() => {
      const el = opts.el.value
      if (!el) return
      if (applyId !== caretApplySeq) return
      // Only apply if the DOM value still matches what we inserted.
      if ((el as HTMLInputElement | HTMLTextAreaElement).value !== nextText) return

      el.focus?.()
      try {
        if (typeof el.setSelectionRange === 'function') {
          el.setSelectionRange(nextCaret, nextCaret)
        }
      } catch {
        // ignore
      }
    })
  }

  function onKeydown(e: KeyboardEvent): boolean {
    if (!open.value) return false
    // Guard against double-firing when both a Vue @keydown handler and bindDomEvents
    // attach to the same element (one already handled and prevented the event).
    if (e.defaultPrevented) return true

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      highlightNext(1)
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      highlightNext(-1)
      return true
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return true
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      const u = items.value[highlightedIndex.value] ?? null
      if (!u) return false
      e.preventDefault()
      select(u)
      return true
    }
    return false
  }

  function onSelect(user: MentionUser) {
    select(user)
  }

  function onHighlight(index: number) {
    highlightedIndex.value = Math.max(0, Math.min(items.value.length - 1, Math.floor(index)))
  }

  function onRequestClose() {
    close()
  }

  function bindDomEvents() {
    if (!import.meta.client) return () => {}
    const el = opts.el.value
    if (!el) return () => {}

    const onInput = () => recompute()
    const onClick = () => recompute()
    const onKeyUp = (evt: KeyboardEvent) => {
      // Don't recompute on navigation keys; that would reset the highlight while using arrows.
      if (
        evt.key === 'ArrowDown' ||
        evt.key === 'ArrowUp' ||
        evt.key === 'Enter' ||
        evt.key === 'Tab' ||
        evt.key === 'Escape'
      ) {
        return
      }
      recompute()
    }
    const onKeyDown: EventListener = (evt) => {
      // Handle popover keyboard UX (arrows/enter/tab/esc).
      onKeydown(evt as KeyboardEvent)
      // If mention handler prevented default (e.g. selected on Enter),
      // let the host component decide whether it also needs to early-return.
    }
    const onBlur = () => {
      // Delay so clicking a suggestion (which prevents mousedown) doesn’t immediately close before select.
      if (blurCloseTimer) clearTimeout(blurCloseTimer)
      blurCloseTimer = setTimeout(() => {
        blurCloseTimer = null
        if (!document.activeElement || document.activeElement !== el) close()
      }, 80)
    }

    el.addEventListener('input', onInput)
    el.addEventListener('click', onClick)
    el.addEventListener('keyup', onKeyUp as any)
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('blur', onBlur)
    return () => {
      el.removeEventListener('input', onInput)
      el.removeEventListener('click', onClick)
      el.removeEventListener('keyup', onKeyUp as any)
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('blur', onBlur)
    }
  }

  let cleanupDom: (() => void) | null = null
  watch(
    opts.el,
    () => {
      cleanupDom?.()
      cleanupDom = null
      if (!opts.el.value) return
      cleanupDom = bindDomEvents()
    },
    { immediate: true },
  )

  // Determinism: avoid using global caches as an SSR/first-hydration render input.
  // Seed + tier inference only after mount (client-only), so SSR and initial hydration stay stable.
  onMounted(() => {
    mounted.value = true
    if (globalMentionRecent.length && recent.value.length === 0) recent.value = globalMentionRecent
    syncMentionTiersFromText(opts.getText())
  })
  onBeforeUnmount(() => {
    cleanupDom?.()
    cleanupDom = null
    close()
  })

  const activeDescendantId = computed(() => {
    if (!open.value) return null
    const idx = highlightedIndex.value
    if (idx < 0 || idx >= items.value.length) return null
    return `${listboxId}-opt-${idx}`
  })

  // Best-effort combobox semantics for assistive tech.
  watchEffect(() => {
    if (!import.meta.client) return
    const el = opts.el.value
    if (!el) return

    // These are safe on both <input> and <textarea>.
    try {
      el.setAttribute('aria-autocomplete', 'list')
      el.setAttribute('aria-haspopup', 'listbox')
      el.setAttribute('aria-expanded', open.value ? 'true' : 'false')

      if (open.value) el.setAttribute('aria-controls', listboxId)
      else el.removeAttribute('aria-controls')

      const activeId = activeDescendantId.value
      if (open.value && activeId) el.setAttribute('aria-activedescendant', activeId)
      else el.removeAttribute('aria-activedescendant')
    } catch {
      // ignore
    }
  })

  // Expose popover bindings as a plain reactive object so templates can `v-bind="mention.popoverProps"`
  // without accidentally binding a Ref wrapper.
  const popoverProps = reactive<{
    open: boolean
    items: MentionUser[]
    highlightedIndex: number
    anchor: CaretPoint | null
    listboxId: string
    sections: MentionSection[]
  }>({
    open: false,
    items: [],
    highlightedIndex: 0,
    anchor: null,
    listboxId,
    sections: [],
  })
  watchEffect(() => {
    popoverProps.open = open.value
    popoverProps.items = items.value
    popoverProps.highlightedIndex = highlightedIndex.value
    popoverProps.anchor = anchor.value
    popoverProps.listboxId = listboxId
    popoverProps.sections = sections.value
  })

  watch(
    () => opts.getText(),
    (text) => {
      if (!mounted.value) return
      syncMentionTiersFromText(text ?? '')
    },
    { immediate: true },
  )

  watch([items, recent], () => {
    if (!mounted.value) return
    syncMentionTiersFromText(opts.getText())
  })

  const highlightedUser = computed(() => items.value[highlightedIndex.value] ?? null)

  return {
    // state
    open: readonly(open),
    items: readonly(items),
    sections: readonly(sections),
    highlightedIndex,
    anchor: readonly(anchor),
    active: readonly(active),
    mentionTiers: readonly(mentionTiers),
    highlightedUser,

    // manual handlers (for components that already own input/keydown behavior)
    recompute,
    onKeydown,

    // popover bridge
    popoverProps,
    onSelect,
    onHighlight,
    onRequestClose,

    close,
  }
}


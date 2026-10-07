import type { Ref } from 'vue'
import { extractMentionedUsernames, parseActiveMention, type ActiveMention } from '~/utils/mention-autocomplete'
import { getCaretPoint, type CaretPoint } from '~/utils/textarea-caret'
import {
  clampMention,
  normalizeMentionQuery,
  rerankMentions,
  tierFromMentionUser,
  type MentionTier,
  type MentionUser,
} from '~/composables/mention/mentionScore'

export type { MentionTier } from '~/composables/mention/mentionScore'
export { tierFromMentionUser } from '~/composables/mention/mentionScore'

type SearchCacheEntry = { expiresAt: number; items: MentionUser[] }

const CACHE_TTL_MS = 30_000
const DEFAULT_LIMIT = 10
const MAX_CACHE_ENTRIES = 200

let mentionAutocompleteIdSeq = 0

const globalMentionCache = new Map<string, SearchCacheEntry>()
let globalMentionRecent: MentionUser[] = []

export type MentionSection = { title: string; startIndex: number; count: number }

export function useMentionAutocomplete(opts: {
  el: Ref<HTMLTextAreaElement | HTMLInputElement | null>
  getText: () => string
  setText: (next: string) => void
  contextUsernames?: Ref<string[]>
  debounceMs?: number
  limit?: number
  priorityUsers?: Ref<MentionUser[] | null>
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
  const loading = ref(false)
  const prioritySectionCount = ref(0)

  const limit = typeof opts.limit === 'number' ? Math.max(3, Math.min(20, Math.floor(opts.limit))) : DEFAULT_LIMIT
  const debounceMs = typeof opts.debounceMs === 'number' ? clampMention(Math.floor(opts.debounceMs), 0, 600) : 120

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
    loading.value = false
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
    return rerankMentions(list, q, opts.getText(), opts.contextUsernames?.value ?? [])
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
    const qNorm = normalizeMentionQuery(q)
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
        loading.value = false
        if (qNorm) {
          // Cache only the API portion so future non-lobby contexts aren't polluted.
          cache.set(qNorm, { expiresAt: now + CACHE_TTL_MS, items: rerank(mentionable, q) })
          pruneCache()
        }
      } else {
        const ranked = rerank(mentionable, q)
        if (activeRequestId !== requestId) return
        setItems(ranked)
        loading.value = false
        if (qNorm) {
          cache.set(qNorm, { expiresAt: now + CACHE_TTL_MS, items: ranked })
          pruneCache()
        }
      }
    } catch (e: unknown) {
      if ((e as any)?.name === 'AbortError') return
      if (activeRequestId !== requestId) return
      items.value = []
      loading.value = false
    } finally {
      if (inflight === controller) inflight = null
    }
  }

  function scheduleFetch() {
    const a = active.value
    if (!a) return
    const q = (a.query ?? '').toString()
    const qNorm = normalizeMentionQuery(q)

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
      loading.value = false
      return
    }

    // For non-priority mode, show best cached prefix immediately to avoid flicker.
    let usedCache = false
    if (!hasPriority) {
      const cached = qNorm ? getBestCached(qNorm) : null
      if (cached) {
        items.value = cached
        usedCache = true
      }
    }

    const queryChanged = qNorm !== (lastQueryNorm ?? null)
    if (queryChanged) highlightedIndex.value = 0
    lastQueryNorm = qNorm

    // Show loader only when we have nothing useful to display yet — avoids flashing the
    // spinner when prior results (cache or priority section) are already on screen.
    if (items.value.length === 0 && !usedCache) {
      loading.value = true
    }

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
    loading: boolean
  }>({
    open: false,
    items: [],
    highlightedIndex: 0,
    anchor: null,
    listboxId,
    sections: [],
    loading: false,
  })
  watchEffect(() => {
    popoverProps.open = open.value
    popoverProps.items = items.value
    popoverProps.highlightedIndex = highlightedIndex.value
    popoverProps.anchor = anchor.value
    popoverProps.listboxId = listboxId
    popoverProps.sections = sections.value
    popoverProps.loading = loading.value
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
    loading: readonly(loading),

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


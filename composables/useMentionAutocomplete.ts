import type { Ref } from 'vue'
import type { FollowListUser } from '~/types/api'
import { extractMentionedUsernames, parseActiveMention, type ActiveMention } from '~/utils/mention-autocomplete'
import { getCaretPoint, type CaretPoint } from '~/utils/textarea-caret'

type MentionUser = FollowListUser

type SearchCacheEntry = { expiresAt: number; items: MentionUser[] }

const CACHE_TTL_MS = 30_000
const DEFAULT_LIMIT = 10

let mentionAutocompleteIdSeq = 0

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

export type MentionTier = 'premium' | 'verified' | 'normal'

export function tierFromMentionUser(u: { premium?: boolean; verifiedStatus?: string } | null): MentionTier {
  if (!u) return 'normal'
  if (u.premium) return 'premium'
  if (u.verifiedStatus && u.verifiedStatus !== 'none') return 'verified'
  return 'normal'
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
}) {
  const { apiFetchData } = useApiClient()

  const idBase = `moh-mention-${++mentionAutocompleteIdSeq}`
  const listboxId = `${idBase}-listbox`

  const open = ref(false)
  const items = ref<MentionUser[]>([])
  const highlightedIndex = ref(0)
  const anchor = ref<CaretPoint | null>(null)
  const active = ref<ActiveMention | null>(null)

  const limit = typeof opts.limit === 'number' ? Math.max(3, Math.min(20, Math.floor(opts.limit))) : DEFAULT_LIMIT
  const debounceMs = typeof opts.debounceMs === 'number' ? clamp(Math.floor(opts.debounceMs), 0, 600) : 120

  const cache = new Map<string, SearchCacheEntry>()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let inflight: AbortController | null = null
  let requestSeq = 0
  let activeRequestId = 0
  let lastQueryNorm: string | null = null
  let caretApplySeq = 0

  const recent = ref<MentionUser[]>([])
  /** Username (lowercase) -> tier for mentions the user has selected in this session. */
  const mentionTiers = ref<Record<string, MentionTier>>({})

  function close() {
    open.value = false
    active.value = null
    anchor.value = null
    items.value = []
    highlightedIndex.value = 0
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
      if (hit && hit.expiresAt > now) return hit.items
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
        query: { type: 'users', q, limit } as any,
        signal: controller.signal,
      })
      const raw = Array.isArray(res) ? res : []
      const mentionable = raw.filter((u) => Boolean((u.username ?? '').trim()))
      const ranked = rerank(mentionable, q)
      if (activeRequestId !== requestId) return
      setItems(ranked)
      if (qNorm) cache.set(qNorm, { expiresAt: now + CACHE_TTL_MS, items: ranked })
    } catch (e: unknown) {
      // Abort is expected during rapid typing.
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
    // If user just typed '@' (empty query), open immediately with recent/cache and don't hit network.
    if (!q) {
      items.value = recent.value ?? []
      updateAnchor()
      highlightedIndex.value = 0
      lastQueryNorm = ''
      return
    }

    // Show best cached prefix immediately (prevents flicker and keeps results "sticky" while fetching).
    const cached = qNorm ? getBestCached(qNorm) : null
    if (cached) items.value = cached

    const queryChanged = qNorm !== (lastQueryNorm ?? null)
    if (queryChanged) highlightedIndex.value = 0
    lastQueryNorm = qNorm

    // Fetch faster for first character; debounce a bit more for subsequent typing.
    const delay = q.length <= 1 ? 0 : debounceMs
    const requestId = ++requestSeq
    activeRequestId = requestId
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void fetchUsers(q, requestId)
    }, delay)
    // Update anchor eagerly so the popover tracks the caret while typing.
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
      setTimeout(() => {
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
  }>({
    open: false,
    items: [],
    highlightedIndex: 0,
    anchor: null,
    listboxId,
  })
  watchEffect(() => {
    popoverProps.open = open.value
    popoverProps.items = items.value
    popoverProps.highlightedIndex = highlightedIndex.value
    popoverProps.anchor = anchor.value
    popoverProps.listboxId = listboxId
  })

  watch(
    () => opts.getText(),
    (text) => {
      syncMentionTiersFromText(text ?? '')
    },
    { immediate: true },
  )

  watch([items, recent], () => {
    syncMentionTiersFromText(opts.getText())
  })

  const highlightedUser = computed(() => items.value[highlightedIndex.value] ?? null)

  return {
    // state
    open: readonly(open),
    items: readonly(items),
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


import type { Ref } from 'vue'
import type { HashtagResult } from '~/types/api'
import { parseActiveHashtag, type ActiveHashtag } from '~/utils/hashtag-autocomplete'
import { getCaretPoint, type CaretPoint } from '~/utils/textarea-caret'

type SearchCacheEntry = { expiresAt: number; items: HashtagResult[] }

const CACHE_TTL_MS = 30_000
const DEFAULT_LIMIT = 10
const MAX_CACHE_ENTRIES = 200

let hashtagAutocompleteIdSeq = 0

// Shared caches across mounts (so new composers can show cached results immediately).
const globalHashtagCache = new Map<string, SearchCacheEntry>()
const globalRecentHashtags: HashtagResult[] = []

function normalize(s: string): string {
  return (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function useHashtagAutocomplete(opts: {
  /** Ref to the actual textarea/input element when available. */
  el: Ref<HTMLTextAreaElement | HTMLInputElement | null>
  /** Get current text value. */
  getText: () => string
  /** Set current text value. */
  setText: (next: string) => void
  /** Debounce ms for search requests. */
  debounceMs?: number
  /** Search limit. */
  limit?: number
}) {
  const { apiFetchData } = useApiClient()

  const idBase = `moh-hashtag-${++hashtagAutocompleteIdSeq}`
  const listboxId = `${idBase}-listbox`

  const open = ref(false)
  const items = ref<HashtagResult[]>([])
  const sections = ref<Array<{ key: string; label?: string | null; items: HashtagResult[] }>>([])
  const highlightedIndex = ref(0)
  const anchor = ref<CaretPoint | null>(null)
  const active = ref<ActiveHashtag | null>(null)

  const limit = typeof opts.limit === 'number' ? Math.max(3, Math.min(20, Math.floor(opts.limit))) : DEFAULT_LIMIT
  const debounceMs = typeof opts.debounceMs === 'number' ? clamp(Math.floor(opts.debounceMs), 0, 600) : 120

  const cache = globalHashtagCache
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let blurCloseTimer: ReturnType<typeof setTimeout> | null = null
  let inflight: AbortController | null = null
  let requestSeq = 0
  let activeRequestId = 0
  let lastQueryNorm: string | null = null
  let caretApplySeq = 0

  function pruneCache() {
    // Remove oldest entries when the cache grows unbounded.
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

  function setActive(next: ActiveHashtag | null) {
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

  function getBestCached(qNorm: string): HashtagResult[] | null {
    const now = Date.now()
    for (let i = qNorm.length; i >= 0; i--) {
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

  function filterAndSort(list: HashtagResult[], q: string): HashtagResult[] {
    const qLower = normalize(q)
    const filtered = qLower
      ? list.filter((t) => normalize(t.value).startsWith(qLower))
      : list
    const sorted = [...filtered].sort((a, b) => {
      const au = Math.max(0, Math.floor(Number(a.usageCount ?? 0)))
      const bu = Math.max(0, Math.floor(Number(b.usageCount ?? 0)))
      if (au !== bu) return bu - au
      return String(a.value ?? '').localeCompare(String(b.value ?? ''))
    })
    return sorted.slice(0, limit)
  }

  function buildSections(q: string, fetched: HashtagResult[]) {
    const qLower = normalize(q)
    if (!qLower) {
      const recent = globalRecentHashtags.slice(0, 8)
      const recentSet = new Set(recent.map((t) => t.value))
      const trending = fetched.filter((t) => !recentSet.has(t.value))
      const secs: Array<{ key: string; label?: string | null; items: HashtagResult[] }> = []
      if (recent.length) secs.push({ key: 'recent', label: 'Recent', items: recent })
      secs.push({ key: 'trending', label: 'Trending', items: trending })
      sections.value = secs
      items.value = [...recent, ...trending]
      return
    }
    sections.value = [{ key: 'results', label: null, items: fetched }]
    items.value = fetched
  }

  async function fetchHashtags(q: string, requestId: number) {
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
      const res = await apiFetchData<HashtagResult[]>('/search', {
        method: 'GET',
        query: { type: 'hashtags', q, limit },
        // Autocomplete should revalidate often; bypass HTTP caches so counts can update quickly.
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      })
      const raw = Array.isArray(res) ? res : []
      const cleaned = raw
        .map((t) => ({
          value: (t as any)?.value,
          label: (t as any)?.label,
          usageCount: Number((t as any)?.usageCount ?? 0),
        }))
        .filter((t) =>
          typeof t.value === 'string' &&
          t.value.trim().length > 0 &&
          typeof t.label === 'string' &&
          t.label.trim().length > 0
        ) as HashtagResult[]
      const next = filterAndSort(cleaned, q)
      if (activeRequestId !== requestId) return
      buildSections(q, next)
      cache.set(qNorm, { expiresAt: now + CACHE_TTL_MS, items: next })
      pruneCache()
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

    // Show best cached prefix immediately (prevents flicker and keeps results "sticky" while fetching).
    const cached = getBestCached(qNorm)
    if (cached) buildSections(q, filterAndSort(cached, q))
    else buildSections(q, [])

    const queryChanged = qNorm !== (lastQueryNorm ?? null)
    if (queryChanged) highlightedIndex.value = 0
    lastQueryNorm = qNorm

    // Fetch faster for first character; debounce a bit more for subsequent typing.
    const delay = q.length <= 1 ? 0 : debounceMs
    const requestId = ++requestSeq
    activeRequestId = requestId
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void fetchHashtags(q, requestId)
    }, delay)

    updateAnchor()
  }

  function recompute() {
    const el = opts.el.value
    const text = opts.getText()
    const caret = el && typeof el.selectionStart === 'number' ? el.selectionStart : text.length
    const next = parseActiveHashtag(text, caret)
    setActive(next)
    if (!next) return
    scheduleFetch()
  }

  function highlightNext(delta: number) {
    const n = items.value.length
    if (n <= 0) return
    const cur = highlightedIndex.value
    const next = (cur + delta + n) % n
    highlightedIndex.value = next
  }

  function select(tag: HashtagResult) {
    const a = active.value
    const label = (tag.label ?? '').trim()
    if (!a || !label) return

    // Update recents (client-only).
    const value = (tag.value ?? '').trim()
    if (value) {
      const idx = globalRecentHashtags.findIndex((t) => t.value === value)
      if (idx !== -1) globalRecentHashtags.splice(idx, 1)
      globalRecentHashtags.unshift(tag)
      if (globalRecentHashtags.length > 8) globalRecentHashtags.length = 8
    }

    const text = opts.getText()
    const before = text.slice(0, a.hashIndex)
    const after = text.slice(a.caretIndex)
    const insertion = `#${label} `
    const nextText = before + insertion + after
    const nextCaret = before.length + insertion.length

    close()
    opts.setText(nextText)

    const applyId = ++caretApplySeq
    void nextTick().then(() => {
      const el = opts.el.value
      if (!el) return
      if (applyId !== caretApplySeq) return
      if ((el as HTMLInputElement | HTMLTextAreaElement).value !== nextText) return
      el.focus?.()
      try {
        if (typeof el.setSelectionRange === 'function') el.setSelectionRange(nextCaret, nextCaret)
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
      const t = items.value[highlightedIndex.value] ?? null
      if (!t) return false
      e.preventDefault()
      select(t)
      return true
    }
    return false
  }

  function onSelect(tag: HashtagResult) {
    select(tag)
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
      if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp' || evt.key === 'Enter' || evt.key === 'Tab' || evt.key === 'Escape') return
      recompute()
    }
    const onKeyDown: EventListener = (evt) => {
      onKeydown(evt as KeyboardEvent)
    }
    const onBlur = () => {
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

  watchEffect(() => {
    if (!import.meta.client) return
    const el = opts.el.value
    if (!el) return
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

  const popoverProps = reactive<{
    open: boolean
    items: HashtagResult[]
    sections: Array<{ key: string; label?: string | null; items: HashtagResult[] }>
    highlightedIndex: number
    anchor: CaretPoint | null
    listboxId: string
  }>({
    open: false,
    items: [],
    sections: [],
    highlightedIndex: 0,
    anchor: null,
    listboxId,
  })
  watchEffect(() => {
    popoverProps.open = open.value
    popoverProps.items = items.value
    popoverProps.sections = sections.value
    popoverProps.highlightedIndex = highlightedIndex.value
    popoverProps.anchor = anchor.value
    popoverProps.listboxId = listboxId
  })

  const highlightedTag = computed(() => items.value[highlightedIndex.value] ?? null)

  return {
    open: readonly(open),
    items: readonly(items),
    highlightedIndex,
    anchor: readonly(anchor),
    active: readonly(active),
    highlightedTag,

    recompute,
    onKeydown,

    popoverProps,
    onSelect,
    onHighlight,
    onRequestClose,

    close,
  }
}


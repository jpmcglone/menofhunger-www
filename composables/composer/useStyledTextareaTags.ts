import { mergeAttributes } from '@tiptap/vue-3'
import Mention from '@tiptap/extension-mention'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { HashtagResult, CashtagResult } from '~/types/api'
import type { CaretPoint } from '~/utils/textarea-caret'
import type { useStyledTextareaMentions } from './useStyledTextarea'

/**
 * Hashtag and cashtag lookup, decorations, nodes, and suggestion popovers.
 */
export function useStyledTextareaTags(ctx: ReturnType<typeof useStyledTextareaMentions>) {
  const { apiFetchData, norm, anchorFromEditor } = ctx

  // ─── Hashtag: fetch / rank ────────────────────────────────────

  const HASHTAG_LIMIT = 10
  const hashtagCache = new Map<string, { expiresAt: number; items: HashtagResult[] }>()
  let hashtagInflight: AbortController | null = null

  async function fetchHashtags(query: string): Promise<HashtagResult[]> {
    const qn = norm(query)
    const now = Date.now()
    if (hashtagInflight) {
      try { hashtagInflight.abort() } catch { /* abort errors are not actionable */ }
      hashtagInflight = null
    }
    const cached = qn ? hashtagCache.get(qn) : null
    if (cached && cached.expiresAt > now) return cached.items
    if (!qn) return []
    const ac = new AbortController()
    hashtagInflight = ac
    try {
      const res = await apiFetchData<HashtagResult[]>('/search', {
        method: 'GET',
        query: { type: 'hashtags', q: query, limit: HASHTAG_LIMIT },
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: ac.signal,
      })
      const items = Array.isArray(res) ? res : []
      hashtagCache.set(qn, { expiresAt: now + 30_000, items })
      return items
    } catch { return cached?.items ?? [] }
    finally { if (hashtagInflight === ac) hashtagInflight = null }
  }

  // ─── Hashtag: popover state ──────────────────────────────────

  const hashtagPopover = reactive<{
    open: boolean
    items: HashtagResult[]
    highlightedIndex: number
    anchor: CaretPoint | null
    listboxId: string
  }>({
    open: false,
    items: [],
    highlightedIndex: 0,
    anchor: null,
    listboxId: 'moh-tiptap-hashtag-listbox',
  })

  let hashtagCmd: SuggestionProps<HashtagResult>['command'] | null = null

  // Decorates plain-text #word spans that weren't autocompleted
  const hashtagDecoPlugin = new Plugin({
    key: new PluginKey('hashtagDecorations'),
    props: {
      decorations(state) {
        const decos: Decoration[] = []
        const re = /(?:^|(?<=[^A-Za-z0-9_#]))#([A-Za-z]\w{0,49})/g
        state.doc.descendants((node, pos) => {
          if (!node.isText) return
          const text = node.text ?? ''
          re.lastIndex = 0
          let m: RegExpExecArray | null
          while ((m = re.exec(text)) !== null) {
            decos.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, { class: 'moh-hashtag' }))
          }
        })
        return DecorationSet.create(state.doc, decos)
      },
    },
  })

  const HashtagNode = Mention.extend({
    name: 'hashtag',
    renderHTML({ node, HTMLAttributes }) {
      return ['span', mergeAttributes({ class: 'moh-hashtag' }, HTMLAttributes), `#${node.attrs.label ?? node.attrs.id}`]
    },
    renderText({ node }) {
      return `#${node.attrs.label ?? node.attrs.id}`
    },
    addProseMirrorPlugins() {
      return [hashtagDecoPlugin, ...((this.parent?.() as Plugin[] | undefined) ?? [])]
    },
  })

  const hashtagSuggestion = {
    char: '#',
    allowSpaces: false,
    items: async ({ query }: { query: string }) => fetchHashtags(query),
    render: () => ({
      onStart: (p: SuggestionProps<HashtagResult>) => {
        hashtagCmd = p.command
        hashtagPopover.items = p.items ?? []
        hashtagPopover.highlightedIndex = 0
        hashtagPopover.anchor = p.editor ? anchorFromEditor(p.editor) : null
        hashtagPopover.open = true
      },
      onUpdate: (p: SuggestionProps<HashtagResult>) => {
        hashtagCmd = p.command
        hashtagPopover.items = p.items ?? []
        if (hashtagPopover.highlightedIndex >= hashtagPopover.items.length) hashtagPopover.highlightedIndex = 0
        hashtagPopover.anchor = p.editor ? anchorFromEditor(p.editor) : null
      },
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        const n = hashtagPopover.items.length
        if (event.key === 'ArrowDown') { event.preventDefault(); if (n) hashtagPopover.highlightedIndex = (hashtagPopover.highlightedIndex + 1) % n; return true }
        if (event.key === 'ArrowUp') { event.preventDefault(); if (n) hashtagPopover.highlightedIndex = (hashtagPopover.highlightedIndex - 1 + n) % n; return true }
        if ((event.key === 'Enter' || event.key === 'Tab') && hashtagCmd) {
          const h = hashtagPopover.items[hashtagPopover.highlightedIndex]
          if (h) { event.preventDefault(); hashtagCmd({ id: h.value, label: h.label || h.value }); return true }
        }
        if (event.key === 'Escape') { hashtagPopover.open = false; return true }
        return false
      },
      onExit: () => { hashtagPopover.open = false; hashtagPopover.items = []; hashtagCmd = null },
    }),
  }

  function onHashtagSelect(h: HashtagResult) { hashtagCmd?.({ id: h.value, label: h.label || h.value }) }
  function onHashtagHighlight(index: number) { hashtagPopover.highlightedIndex = Math.max(0, Math.min(hashtagPopover.items.length - 1, index)) }
  function onHashtagClose() { hashtagPopover.open = false }

  // ─── Cashtag: fetch ────────────────────────────────────────────

  const CASHTAG_LIMIT = 10
  const cashtagCache = new Map<string, { expiresAt: number; items: CashtagResult[] }>()
  let cashtagInflight: AbortController | null = null

  async function fetchCashtags(query: string): Promise<CashtagResult[]> {
    const qn = norm(query)
    const now = Date.now()
    if (cashtagInflight) {
      try { cashtagInflight.abort() } catch { /* abort errors are not actionable */ }
      cashtagInflight = null
    }
    const cached = qn ? cashtagCache.get(qn) : null
    if (cached && cached.expiresAt > now) return cached.items
    if (!qn) return []
    const ac = new AbortController()
    cashtagInflight = ac
    try {
      const res = await apiFetchData<CashtagResult[]>('/search', {
        method: 'GET',
        query: { type: 'cashtags', q: query, limit: CASHTAG_LIMIT },
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: ac.signal,
      })
      const items = Array.isArray(res) ? res : []
      cashtagCache.set(qn, { expiresAt: now + 60_000, items })
      return items
    } catch { return cached?.items ?? [] }
    finally { if (cashtagInflight === ac) cashtagInflight = null }
  }

  // ─── Cashtag: popover state ──────────────────────────────────

  const cashtagPopover = reactive<{
    open: boolean
    items: CashtagResult[]
    highlightedIndex: number
    anchor: CaretPoint | null
    listboxId: string
    loading: boolean
  }>({
    open: false,
    items: [],
    highlightedIndex: 0,
    anchor: null,
    listboxId: 'moh-tiptap-cashtag-listbox',
    loading: false,
  })

  let cashtagCmd: SuggestionProps<CashtagResult>['command'] | null = null

  // Decorates plain-text $SYMBOL spans that weren't autocompleted
  const cashtagDecoPlugin = new Plugin({
    key: new PluginKey('cashtagDecorations'),
    props: {
      decorations(state) {
        const decos: Decoration[] = []
        const re = /(?:^|(?<=[^A-Za-z0-9_$]))\$([A-Za-z]{1,6})(?![A-Za-z0-9_])/g
        state.doc.descendants((node, pos) => {
          if (!node.isText) return
          const text = node.text ?? ''
          re.lastIndex = 0
          let m: RegExpExecArray | null
          while ((m = re.exec(text)) !== null) {
            decos.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, { class: 'moh-cashtag' }))
          }
        })
        return DecorationSet.create(state.doc, decos)
      },
    },
  })

  const CashtagNode = Mention.extend({
    name: 'cashtag',
    renderHTML({ node, HTMLAttributes }) {
      return ['span', mergeAttributes({ class: 'moh-cashtag' }, HTMLAttributes), `$${node.attrs.label ?? node.attrs.id}`]
    },
    renderText({ node }) {
      return `$${node.attrs.label ?? node.attrs.id}`
    },
    addProseMirrorPlugins() {
      return [cashtagDecoPlugin, ...((this.parent?.() as Plugin[] | undefined) ?? [])]
    },
  })

  const cashtagSuggestion = {
    char: '$',
    allowSpaces: false,
    items: async ({ query }: { query: string }) => {
      cashtagPopover.loading = true
      const items = await fetchCashtags(query)
      cashtagPopover.loading = false
      return items
    },
    render: () => ({
      onStart: (p: SuggestionProps<CashtagResult>) => {
        cashtagCmd = p.command
        cashtagPopover.items = p.items ?? []
        cashtagPopover.highlightedIndex = 0
        cashtagPopover.anchor = p.editor ? anchorFromEditor(p.editor) : null
        cashtagPopover.open = true
      },
      onUpdate: (p: SuggestionProps<CashtagResult>) => {
        cashtagCmd = p.command
        cashtagPopover.items = p.items ?? []
        if (cashtagPopover.highlightedIndex >= cashtagPopover.items.length) cashtagPopover.highlightedIndex = 0
        cashtagPopover.anchor = p.editor ? anchorFromEditor(p.editor) : null
      },
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        const n = cashtagPopover.items.length
        if (event.key === 'ArrowDown') { event.preventDefault(); if (n) cashtagPopover.highlightedIndex = (cashtagPopover.highlightedIndex + 1) % n; return true }
        if (event.key === 'ArrowUp') { event.preventDefault(); if (n) cashtagPopover.highlightedIndex = (cashtagPopover.highlightedIndex - 1 + n) % n; return true }
        if ((event.key === 'Enter' || event.key === 'Tab') && cashtagCmd) {
          const c = cashtagPopover.items[cashtagPopover.highlightedIndex]
          if (c) { event.preventDefault(); cashtagCmd({ id: c.symbol, label: c.symbol }); return true }
        }
        if (event.key === 'Escape') { cashtagPopover.open = false; return true }
        return false
      },
      onExit: () => { cashtagPopover.open = false; cashtagPopover.items = []; cashtagCmd = null },
    }),
  }

  function onCashtagSelect(c: CashtagResult) { cashtagCmd?.({ id: c.symbol, label: c.symbol }) }
  function onCashtagHighlight(index: number) { cashtagPopover.highlightedIndex = Math.max(0, Math.min(cashtagPopover.items.length - 1, index)) }
  function onCashtagClose() { cashtagPopover.open = false }

  return {
    hashtagPopover,
    HashtagNode,
    hashtagSuggestion,
    onHashtagSelect,
    onHashtagHighlight,
    onHashtagClose,
    cashtagPopover,
    CashtagNode,
    cashtagSuggestion,
    onCashtagSelect,
    onCashtagHighlight,
    onCashtagClose,
  }
}

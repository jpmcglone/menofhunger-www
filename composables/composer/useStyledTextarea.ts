import type { EmitFn } from 'vue'
import type { StyledTextareaResolvedProps, StyledTextareaEmits } from './styled-textarea-types'
import { mergeAttributes } from '@tiptap/vue-3'
import Mention from '@tiptap/extension-mention'
import type { Editor as CoreEditor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { FollowListUser } from '~/types/api'
import type { MentionSection } from '~/composables/useMentionAutocomplete'
import type { CaretPoint } from '~/utils/textarea-caret'
import { userTierColorVar } from '~/utils/user-tier'
import { tierFromMentionUser } from '~/composables/useMentionAutocomplete'
import { useStyledTextareaTags } from './useStyledTextareaTags'
import { useStyledTextareaEditor } from './useStyledTextareaEditor'

/**
 * Script state for `AppStyledTextarea`.
 */
export function useStyledTextarea(props: StyledTextareaResolvedProps, emit: EmitFn<StyledTextareaEmits>) {
  const mentions = useStyledTextareaMentions(props)
  const tags = useStyledTextareaTags(mentions)
  const editorState = useStyledTextareaEditor(props, emit, { ...mentions, ...tags })
  return { ...mentions, ...tags, ...editorState }
}

/**
 * Mention validation and coloring, user ranking and lookup, and the mention
 * suggestion popover.
 */
export function useStyledTextareaMentions(props: StyledTextareaResolvedProps) {
  // ─── Shared utilities ─────────────────────────────────────────

  const { apiFetchData } = useApiClient()
  const { markValid, validSet, tierMap, tierForUsername, validateMentionsInBody } = useValidatedChatUsernames()

  function norm(s: string): string {
    return (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
  }

  function anchorFromEditor(ed: CoreEditor): CaretPoint | null {
    try {
      const { from } = ed.state.selection
      const coords = ed.view.coordsAtPos(from)
      return { left: coords.left, top: coords.top, height: coords.bottom - coords.top }
    } catch {
      return null
    }
  }

  // ─── Mention: custom extension with per-node color ────────────

  // Decorates plain-text @username spans that weren't autocompleted. Only confirmed-existing
  // users (in validSet) are colored — matching chat rendering — and tier colors come from the
  // shared username→tier cache (resolved via POST /users/preview/batch). Unknown usernames stay
  // plain until validation lands; the watch below re-runs decorations once tiers resolve.
  const mentionDecoPlugin = new Plugin({
    key: new PluginKey('mentionDecorations'),
    props: {
      decorations(state) {
        const decos: Decoration[] = []
        const re = /(?:^|(?<=[^A-Za-z0-9_@]))@([A-Za-z][A-Za-z0-9_]{0,14})/g
        state.doc.descendants((node, pos) => {
          if (!node.isText) return
          const text = node.text ?? ''
          re.lastIndex = 0
          let m: RegExpExecArray | null
          while ((m = re.exec(text)) !== null) {
            const username = (m[1] ?? '').toLowerCase()
            if (!validSet.value.has(username)) continue
            const colorVar = userTierColorVar(tierForUsername(username))
            const attrs: Record<string, string> = { class: 'moh-mention' }
            if (colorVar) attrs.style = `color: ${colorVar}`
            decos.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, attrs))
          }
        })
        return DecorationSet.create(state.doc, decos)
      },
    },
  })

  const MentionWithColor = Mention.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        color: { default: null, parseHTML: (el) => el.getAttribute('data-color'), renderHTML: (attrs) => (attrs.color ? { 'data-color': attrs.color, style: `color: ${attrs.color}` } : {}) },
      }
    },
    renderHTML({ node, HTMLAttributes }) {
      return ['span', mergeAttributes({ class: 'moh-mention' }, HTMLAttributes), `@${node.attrs.label ?? node.attrs.id}`]
    },
    renderText({ node }) {
      return `@${node.attrs.label ?? node.attrs.id}`
    },
    addProseMirrorPlugins() {
      return [mentionDecoPlugin, ...((this.parent?.() as Plugin[] | undefined) ?? [])]
    },
  })

  // ─── Mention: fetch / rank ────────────────────────────────────

  const MENTION_LIMIT = 10
  const mentionCache = new Map<string, { expiresAt: number; items: FollowListUser[] }>()
  let mentionInflight: AbortController | null = null

  function scoreUser(u: FollowListUser, q: string): number {
    const ql = norm(q)
    if (!ql) return 0
    const un = norm(u.username ?? '')
    const nm = norm(u.name ?? '')
    if (un === ql) return 120
    if (un.startsWith(ql)) return 110
    if (nm === ql) return 80
    if (nm.startsWith(ql)) return 70
    if (un.includes(ql)) return 60
    if (nm.includes(ql)) return 50
    return 0
  }

  function relRank(u: FollowListUser): number {
    const vf = Boolean(u.relationship?.viewerFollowsUser)
    const fv = Boolean(u.relationship?.userFollowsViewer)
    return vf && fv ? 0 : vf ? 1 : fv ? 2 : 3
  }

  function rankUsers(list: FollowListUser[], q: string): FollowListUser[] {
    const ql = norm(q)
    const scored = list.map((u, idx) => ({ u, idx, s: scoreUser(u, ql), r: relRank(u) }))
    const filtered = ql ? scored.filter((s) => s.s > 0) : scored
    filtered.sort((a, b) => b.s - a.s || a.r - b.r || a.idx - b.idx)
    return filtered.map((s) => s.u)
  }

  async function fetchMentionUsers(query: string): Promise<FollowListUser[]> {
    const qn = norm(query)
    const now = Date.now()

    if (mentionInflight) {
      try { mentionInflight.abort() } catch { /* abort errors are not actionable */ }
      mentionInflight = null
    }

    const cached = qn ? mentionCache.get(qn) : null
    if (cached && cached.expiresAt > now) return cached.items
    if (!qn) return []

    const ac = new AbortController()
    mentionInflight = ac
    try {
      const res = await apiFetchData<FollowListUser[]>('/search', {
        method: 'GET',
        query: { type: 'users', q: query, limit: MENTION_LIMIT },
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: ac.signal,
      })
      const items = (Array.isArray(res) ? res : []).filter((u) => Boolean((u.username ?? '').trim()))
      mentionCache.set(qn, { expiresAt: now + 30_000, items })
      return items
    } catch { return cached?.items ?? [] }
    finally { if (mentionInflight === ac) mentionInflight = null }
  }

  // ─── Mention: popover state ──────────────────────────────────

  const mentionPopover = reactive<{
    open: boolean
    items: FollowListUser[]
    highlightedIndex: number
    anchor: CaretPoint | null
    listboxId: string
    sections: MentionSection[]
  }>({
    open: false,
    items: [],
    highlightedIndex: 0,
    anchor: null,
    listboxId: 'moh-tiptap-mention-listbox',
    sections: [],
  })

  let mentionCmd: SuggestionProps<FollowListUser>['command'] | null = null

  function computeMentionSections() {
    if (!props.priorityUsers?.length) { mentionPopover.sections = []; return }
    const pIds = new Set(props.priorityUsers.map((u) => u.id))
    let pCount = 0
    for (const item of mentionPopover.items) {
      if (pIds.has(item.id)) pCount++; else break
    }
    const rest = mentionPopover.items.length - pCount
    mentionPopover.sections = pCount > 0 && rest > 0
      ? [{ title: props.prioritySectionTitle ?? 'Here', startIndex: 0, count: pCount }, { title: 'Everyone', startIndex: pCount, count: rest }]
      : []
  }

  function mentionColorForUser(u: FollowListUser): string {
    const tier = tierFromMentionUser(u)
    return userTierColorVar(tier) ?? 'var(--p-primary-color)'
  }

  const mentionSuggestion = {
    char: '@',
    allowSpaces: false,
    items: async ({ query }: { query: string }) => {
      const priorities = props.priorityUsers ?? []
      const api = await fetchMentionUsers(query)
      if (priorities.length) {
        const pm = rankUsers(priorities, query).slice(0, MENTION_LIMIT)
        const pIds = new Set(pm.map((u) => u.id))
        return [...pm, ...rankUsers(api.filter((u) => !pIds.has(u.id)), query)]
      }
      return rankUsers(api, query)
    },
    render: () => ({
      onStart: (p: SuggestionProps<FollowListUser>) => {
        mentionCmd = p.command
        mentionPopover.items = p.items ?? []
        mentionPopover.highlightedIndex = 0
        mentionPopover.anchor = p.editor ? anchorFromEditor(p.editor) : null
        computeMentionSections()
        mentionPopover.open = true
      },
      onUpdate: (p: SuggestionProps<FollowListUser>) => {
        mentionCmd = p.command
        mentionPopover.items = p.items ?? []
        if (mentionPopover.highlightedIndex >= mentionPopover.items.length) mentionPopover.highlightedIndex = 0
        mentionPopover.anchor = p.editor ? anchorFromEditor(p.editor) : null
        computeMentionSections()
      },
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        const n = mentionPopover.items.length
        if (event.key === 'ArrowDown') { event.preventDefault(); if (n) mentionPopover.highlightedIndex = (mentionPopover.highlightedIndex + 1) % n; return true }
        if (event.key === 'ArrowUp') { event.preventDefault(); if (n) mentionPopover.highlightedIndex = (mentionPopover.highlightedIndex - 1 + n) % n; return true }
        if ((event.key === 'Enter' || event.key === 'Tab') && mentionCmd) {
          const u = mentionPopover.items[mentionPopover.highlightedIndex]
          if (u) { event.preventDefault(); mentionCmd({ id: u.username!, label: u.username!, color: mentionColorForUser(u) }); markValid(u.username!, u); return true }
        }
        if (event.key === 'Escape') { mentionPopover.open = false; return true }
        return false
      },
      onExit: () => { mentionPopover.open = false; mentionPopover.items = []; mentionPopover.sections = []; mentionCmd = null },
    }),
  }

  function onMentionSelect(user: FollowListUser) {
    mentionCmd?.({ id: user.username!, label: user.username!, color: mentionColorForUser(user) })
    markValid(user.username!, user)
  }
  function onMentionHighlight(index: number) { mentionPopover.highlightedIndex = Math.max(0, Math.min(mentionPopover.items.length - 1, index)) }
  function onMentionClose() { mentionPopover.open = false }

  return {
    apiFetchData,
    validSet,
    tierMap,
    validateMentionsInBody,
    norm,
    anchorFromEditor,
    MentionWithColor,
    mentionPopover,
    mentionSuggestion,
    onMentionSelect,
    onMentionHighlight,
    onMentionClose,
  }
}

export type StyledTextareaContext = ReturnType<typeof useStyledTextarea>

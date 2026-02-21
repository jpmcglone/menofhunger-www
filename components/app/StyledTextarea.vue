<template>
  <div class="moh-styled-textarea" :style="{ '--moh-hashtag-color': hashtagColor }">
    <EditorContent :editor="editor" />
    <AppMentionAutocompletePopover
      v-bind="mentionPopover"
      @select="onMentionSelect"
      @highlight="onMentionHighlight"
      @requestClose="onMentionClose"
    />
    <AppHashtagAutocompletePopover
      v-bind="hashtagPopover"
      @select="onHashtagSelect"
      @highlight="onHashtagHighlight"
      @requestClose="onHashtagClose"
    />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent, Extension, mergeAttributes } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import type { Editor as CoreEditor } from '@tiptap/core'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { FollowListUser, HashtagResult } from '~/types/api'
import type { MentionSection } from '~/composables/useMentionAutocomplete'
import type { CaretPoint } from '~/utils/textarea-caret'
import { userTierColorVar } from '~/utils/user-tier'
import { tierFromMentionUser } from '~/composables/useMentionAutocomplete'

// ─── Props / Emits ────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
    autoFocus?: boolean
    priorityUsers?: FollowListUser[] | null
    prioritySectionTitle?: string
    /** CSS color value for hashtag nodes (defaults to primary color). */
    hashtagColor?: string
  }>(),
  {
    placeholder: 'Type a chat…',
    disabled: false,
    autoFocus: false,
    priorityUsers: null,
    prioritySectionTitle: undefined,
    hashtagColor: 'var(--p-primary-color)',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
}>()

// ─── Shared utilities ─────────────────────────────────────────

const { apiFetchData } = useApiClient()
const { markValid } = useValidatedChatUsernames()

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

  if (mentionInflight) { try { mentionInflight.abort() } catch {} mentionInflight = null }

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

let mentionCmd: ((attrs: Record<string, any>) => void) | null = null

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
      mentionCmd = p.command as any
      mentionPopover.items = p.items ?? []
      mentionPopover.highlightedIndex = 0
      mentionPopover.anchor = p.editor ? anchorFromEditor(p.editor) : null
      computeMentionSections()
      mentionPopover.open = true
    },
    onUpdate: (p: SuggestionProps<FollowListUser>) => {
      mentionCmd = p.command as any
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

// ─── Hashtag: fetch / rank ────────────────────────────────────

const HASHTAG_LIMIT = 10
const hashtagCache = new Map<string, { expiresAt: number; items: HashtagResult[] }>()
let hashtagInflight: AbortController | null = null

async function fetchHashtags(query: string): Promise<HashtagResult[]> {
  const qn = norm(query)
  const now = Date.now()
  if (hashtagInflight) { try { hashtagInflight.abort() } catch {} hashtagInflight = null }
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

let hashtagCmd: ((attrs: Record<string, string>) => void) | null = null

const HashtagNode = Mention.extend({
  name: 'hashtag',
  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes({ class: 'moh-hashtag' }, HTMLAttributes), `#${node.attrs.label ?? node.attrs.id}`]
  },
  renderText({ node }) {
    return `#${node.attrs.label ?? node.attrs.id}`
  },
})

const hashtagSuggestion = {
  char: '#',
  allowSpaces: false,
  items: async ({ query }: { query: string }) => fetchHashtags(query),
  render: () => ({
    onStart: (p: SuggestionProps<HashtagResult>) => {
      hashtagCmd = p.command as any
      hashtagPopover.items = p.items ?? []
      hashtagPopover.highlightedIndex = 0
      hashtagPopover.anchor = p.editor ? anchorFromEditor(p.editor) : null
      hashtagPopover.open = true
    },
    onUpdate: (p: SuggestionProps<HashtagResult>) => {
      hashtagCmd = p.command as any
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

// ─── Enter-to-send ────────────────────────────────────────────

const SendOnEnter = Extension.create({
  name: 'sendOnEnter',
  addKeyboardShortcuts() {
    return {
      'Enter': () => {
        if (mentionPopover.open || hashtagPopover.open) return false
        emit('send')
        return true
      },
      'Shift-Enter': ({ editor: ed }) => {
        ed.commands.first(({ commands }) => [() => commands.newlineInCode(), () => commands.splitBlock()])
        return true
      },
    }
  },
})

// ─── Editor ───────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
}

function getPlainText(ed: CoreEditor): string {
  return ed.getText({ blockSeparator: '\n' })
}

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      horizontalRule: false,
      code: false,
      bold: false,
      italic: false,
      strike: false,
    }),
    Placeholder.configure({ placeholder: props.placeholder }),
    MentionWithColor.configure({ suggestion: mentionSuggestion as any }),
    HashtagNode.configure({ suggestion: hashtagSuggestion as any }),
    SendOnEnter,
  ],
  editorProps: {
    attributes: {
      class: 'moh-styled-textarea-editor',
      'aria-label': props.placeholder,
    },
  },
  editable: !props.disabled,
  content: props.modelValue ? `<p>${escapeHtml(props.modelValue)}</p>` : '',
  onUpdate: ({ editor: ed }) => {
    const text = getPlainText(ed)
    lastEmittedText = text
    emit('update:modelValue', text)
  },
})

// Sync external modelValue changes (e.g. cleared after send).
let lastEmittedText = props.modelValue ?? ''
watch(
  () => props.modelValue,
  (newVal) => {
    if (!editor.value) return
    const incoming = newVal ?? ''
    if (incoming === lastEmittedText) return
    lastEmittedText = incoming
    if (!incoming) {
      editor.value.commands.clearContent(true)
    } else {
      editor.value.commands.setContent(`<p>${escapeHtml(incoming)}</p>`)
    }
  },
)

watch(() => props.disabled, (d) => { editor.value?.setEditable(!d) })

function focus() { editor.value?.commands.focus('end') }

function insertAtCursor(text: string) {
  if (!editor.value) return
  editor.value.chain().focus().insertContent(text).run()
}

onMounted(() => {
  if (props.autoFocus) nextTick(() => focus())
})

defineExpose({ focus, insertAtCursor, editor })
</script>

<style>
.moh-styled-textarea {
  position: relative;
  width: 100%;
}

.moh-styled-textarea-editor {
  min-height: 44px;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0.625rem 3rem;
  font-size: 16px;
  line-height: normal;
  color: var(--moh-text);
  outline: none;
  word-break: break-word;
  overflow-wrap: break-word;
}

@media (min-width: 640px) {
  .moh-styled-textarea-editor {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }
}

.moh-styled-textarea-editor p {
  margin: 0;
}

/* Tiptap placeholder via the Placeholder extension */
.moh-styled-textarea-editor p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--moh-text-muted);
  pointer-events: none;
  height: 0;
}

.moh-styled-textarea-editor .moh-mention {
  color: var(--p-primary-color);
}

.moh-styled-textarea-editor .moh-hashtag {
  color: var(--moh-hashtag-color, var(--p-primary-color));
}

.moh-styled-textarea-editor:focus {
  outline: none;
  box-shadow: none;
}
</style>

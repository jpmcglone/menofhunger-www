import { Extension } from '@tiptap/core'
import Suggestion, { exitSuggestion, type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'
import type { GroupChannel } from '~/types/api'
import type { StyledTextareaResolvedProps } from './styled-textarea-types'
import { channelEditorNode } from '~/utils/channels/editor'
import { channelReferenceSuggestions, channelReferenceToken } from '~/utils/channels/references'

export function useStyledTextareaChannels(props: StyledTextareaResolvedProps) {
  const key = new PluginKey('channelReferenceSuggestion')
  const listboxId = useId()
  const channelPopover = reactive({ open: false, items: [] as GroupChannel[], highlightedIndex: 0, listboxId,
    anchor: null as { left: number; top: number; height: number } | null })
  let current: SuggestionProps<GroupChannel> | null = null

  function update(value: SuggestionProps<GroupChannel>) {
    current = value
    channelPopover.items = value.items
    channelPopover.highlightedIndex = Math.min(channelPopover.highlightedIndex, Math.max(0, value.items.length - 1))
    const rect = value.clientRect?.()
    channelPopover.anchor = rect ? { left: rect.left, top: rect.top, height: rect.height } : null
    channelPopover.open = true
  }
  function onChannelSelect(channel: GroupChannel) {
    if (!current || !props.channelScope || !props.channelScope.channels.some(item => item.id === channel.id && item.groupId === props.channelScope?.groupId && !item.archivedAt)) return
    const { editor, range } = current
    editor.chain().focus().insertContentAt(range, [channelEditorNode(channelReferenceToken(channel.id), props.channelScope), { type: 'text', text: ' ' }]).run()
  }
  function onChannelClose() {
    if (current) exitSuggestion(current.editor.view, key)
    channelPopover.open = false
  }
  watch(() => props.channelScope, () => {
    if (current) channelPopover.items = channelReferenceSuggestions(props.channelScope, current.query)
    channelPopover.highlightedIndex = 0
  }, { deep: true, flush: 'sync' })
  const ChannelSuggestions = Extension.create({
    name: 'channelSuggestions',
    addProseMirrorPlugins() {
      return [Suggestion({
        editor: this.editor,
        pluginKey: key,
        char: '#',
        allowSpaces: false,
        allowedPrefixes: null,
        allow: ({ state, range }) => {
          const before = state.doc.textBetween(Math.max(0, range.from - 1), range.from)
          return !before || /\s|[([{]/.test(before)
        },
        items: ({ query }) => channelReferenceSuggestions(props.channelScope, query),
        render: () => ({
          onStart(value: SuggestionProps<GroupChannel>) { channelPopover.highlightedIndex = 0; update(value) },
          onUpdate: update,
          onExit() { current = null; channelPopover.open = false; channelPopover.items = [] },
          onKeyDown({ event }: SuggestionKeyDownProps) {
            if (event.isComposing) return false
            const count = channelPopover.items.length
            if (event.key === 'Escape') { onChannelClose(); return true }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              if (count) channelPopover.highlightedIndex = (channelPopover.highlightedIndex + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
              return true
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              const item = channelPopover.items[channelPopover.highlightedIndex]
              if (item) { event.preventDefault(); onChannelSelect(item); return true }
              return event.key === 'Enter'
            }
            return false
          },
        }),
      })]
    },
  })
  function refreshChannelNodes(editor: Editor) {
    if (editor.view.composing || editor.isDestroyed) return
    const transaction = editor.state.tr
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'channelReference') return
      const next = channelEditorNode(channelReferenceToken(node.attrs.id), props.channelScope).attrs!
      if (JSON.stringify(node.attrs) !== JSON.stringify(next)) transaction.setNodeMarkup(pos, undefined, next)
    })
    if (transaction.docChanged) editor.view.dispatch(transaction.setMeta('addToHistory', false))
  }
  return { ChannelSuggestions, channelPopover, onChannelSelect, onChannelClose, refreshChannelNodes }
}

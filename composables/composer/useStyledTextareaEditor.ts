import type { EmitFn } from 'vue'
import type { StyledTextareaResolvedProps, StyledTextareaEmits } from './styled-textarea-types'
import { useEditor, Extension } from '@tiptap/vue-3'
import { composerStarterKit } from '~/utils/composer-editor'
import Placeholder from '@tiptap/extension-placeholder'
import type { Editor as CoreEditor, KeyboardShortcutCommand } from '@tiptap/core'
import { insertMentionAtCaret } from '~/utils/mention-autocomplete'
import { clipboardHasPlainText, collectMediaFiles, dataTransferHasMedia } from '~/composables/composer/types'
import type { useStyledTextareaMentions } from './useStyledTextarea'
import type { useStyledTextareaTags } from './useStyledTextareaTags'
import type { useStyledTextareaChannels } from './useStyledTextareaChannels'
import { ChannelReferenceNode, channelEditorDocument } from '~/utils/channels/editor'
import { channelReferenceToken, channelReferencePlainText, channelReferenceFromScope } from '~/utils/channels/references'

/**
 * Enter-to-send, the Tiptap editor, model sync, caret scrolling, and the exposed
 * focus, insert, and clear helpers.
 */
export function useStyledTextareaEditor(props: StyledTextareaResolvedProps, emit: EmitFn<StyledTextareaEmits>, ctx: ReturnType<typeof useStyledTextareaMentions> & ReturnType<typeof useStyledTextareaTags> & ReturnType<typeof useStyledTextareaChannels>) {
  const { validSet, tierMap, validateMentionsInBody, MentionWithColor, mentionPopover, mentionSuggestion, hashtagPopover, HashtagNode, hashtagSuggestion, cashtagPopover, CashtagNode, cashtagSuggestion } = ctx

  const { ChannelSuggestions, channelPopover, refreshChannelNodes } = ctx

  // ─── Enter-to-send ────────────────────────────────────────────

  const insertNewline = ({ editor: ed }: { editor: CoreEditor }) => {
    ed.commands.first(({ commands }) => [() => commands.newlineInCode(), () => commands.splitBlock()])
    return true
  }

  const SendOnEnter = Extension.create({
    name: 'sendOnEnter',
    addKeyboardShortcuts(): Record<string, KeyboardShortcutCommand> {
      if (props.submitTrigger === 'cmd-enter') {
        const send = () => {
          if (mentionPopover.open || hashtagPopover.open || cashtagPopover.open || channelPopover.open) return false
          emit('send')
          return true
        }
        // Post-composer mode (same as X): Cmd/Ctrl-Enter sends.
        // Enter and Shift-Enter both insert a newline.
        return {
          'Mod-Enter': send,
          Enter: insertNewline,
          'Shift-Enter': insertNewline,
          'Alt-Enter': insertNewline,
        }
      }
      // Default DM mode: Enter sends, Shift/Alt/Ctrl-Enter insert newline.
      return {
        Enter: () => {
          if (mentionPopover.open || hashtagPopover.open || cashtagPopover.open || channelPopover.open) return false
          if (props.channelScope && !window.matchMedia('(pointer:fine)').matches) return insertNewline({ editor: this.editor })
          emit('send')
          return true
        },
        'Mod-Enter': () => { if (mentionPopover.open || channelPopover.open) return false; emit('send'); return true },
        Escape: () => { if (mentionPopover.open || hashtagPopover.open || cashtagPopover.open || channelPopover.open) return false; emit('escape'); return true },
        'Shift-Enter': insertNewline,
        'Alt-Enter': insertNewline,
        'Ctrl-Enter': () => {
          if (!props.channelScope) return insertNewline({ editor: this.editor })
          if (mentionPopover.open || channelPopover.open) return false
          emit('send')
          return true
        },
      }
    },
  })

  // ─── Editor ───────────────────────────────────────────────────

  function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  }

  function contentForText(text: string) {
    return props.channelScope ? channelEditorDocument(text, props.channelScope) : `<p>${escapeHtml(text)}</p>`
  }

  function getPlainText(ed: CoreEditor): string {
    return ed.getText({ blockSeparator: '\n' })
  }

  // Set when a decoration refresh is skipped because an IME composition was active;
  // flushed on compositionend. See `refreshMentionDecorations`.
  let pendingDecorationRefresh = false

  const editor = useEditor({
    extensions: [
      composerStarterKit,
      Placeholder.configure({ placeholder: props.placeholder }),
      MentionWithColor.configure({ suggestion: mentionSuggestion }),
      ...(props.channelScope ? [ChannelReferenceNode.configure({ scope: () => props.channelScope }), ChannelSuggestions] : [HashtagNode.configure({ suggestion: hashtagSuggestion })]),
      CashtagNode.configure({ suggestion: cashtagSuggestion }),
      SendOnEnter,
    ],
    editorProps: {
      clipboardTextSerializer(slice) {
        return slice.content.textBetween(0, slice.content.size, '\n', node => {
          if (node.type.name === 'hardBreak') return '\n'
          if (node.type.name === 'channelReference') {
            const token = channelReferenceToken(node.attrs.id)
            return channelReferencePlainText(token, [channelReferenceFromScope(token, props.channelScope)])
          }
          if (node.type.name === 'mention') return `@${node.attrs.label ?? node.attrs.id}`
          if (node.type.name === 'hashtag') return `#${node.attrs.label ?? node.attrs.id}`
          if (node.type.name === 'cashtag') return `$${node.attrs.label ?? node.attrs.id}`
          return ''
        })
      },
      attributes: {
        class: 'moh-styled-textarea-editor',
        'aria-label': props.placeholder,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-autocomplete': 'list',
      },
      handlePaste(_view, event) {
        if (props.channelScope && event.clipboardData?.getData('text/plain').includes('<#')) {
          event.preventDefault()
          editor.value?.commands.insertContent(channelEditorDocument(event.clipboardData.getData('text/plain'), props.channelScope).content ?? [])
          return true
        }
        if (clipboardHasPlainText(event.clipboardData)) return false
        const files = collectMediaFiles(event.clipboardData)
        if (!files.length) return false
        // Parent capture handlers (chat/compose) ingest first and preventDefault.
        // Still claim the paste so TipTap doesn't insert a broken inline image.
        if (!event.defaultPrevented) {
          event.preventDefault()
          emit('media-files', files)
        }
        event.stopPropagation()
        return true
      },
      handleDrop(_view, event) {
        const files = collectMediaFiles(event.dataTransfer)
        if (!files.length) return false
        event.preventDefault()
        event.stopPropagation()
        emit('media-files', files)
        return true
      },
      handleDOMEvents: {
        compositionend: () => {
          setTimeout(() => { const ed = editor.value; if (isEditorAlive(ed)) refreshChannelNodes(ed) }, 0)
          if (!pendingDecorationRefresh) return false
          pendingDecorationRefresh = false
          // Defer past ProseMirror's own post-composition flush so `view.composing`
          // has actually cleared by the time we dispatch.
          setTimeout(() => refreshMentionDecorations(), 0)
          return false
        },
        dragover: (_view, event) => {
          if (!dataTransferHasMedia(event.dataTransfer, { includeImages: true, includeVideo: true })) {
            return false
          }
          event.preventDefault()
          return true
        },
      },
    },
    editable: !props.disabled,
    content: contentForText(props.modelValue ?? ''),
    onBlur: () => emit('blur'),
    onUpdate: ({ editor: ed }) => {
      const text = getPlainText(ed)
      lastEmittedText = text
      // Kick off batched tier validation for any typed @mentions; decorations recolor once resolved.
      validateMentionsInBody(text, validSet.value)
      emit('update:modelValue', text)
      keepCaretInScrollport(ed)
    },
  })

  // Re-run mention decorations when username tiers resolve asynchronously (an empty meta
  // transaction forces ProseMirror to recompute the decoration set).
  function refreshMentionDecorations() {
    const ed = editor.value
    if (!isEditorAlive(ed)) return
    // Rebuilding inline decorations mid-composition replaces the DOM text nodes under the
    // composing range. Android IMEs edit those nodes directly and fire `selectionchange`
    // before ProseMirror syncs the mutation into its own state, so the forced re-render can
    // leave ProseMirror collapsing the selection past the end of the shortened node.
    if (ed.view.composing) {
      pendingDecorationRefresh = true
      return
    }
    ed.view.dispatch(ed.state.tr.setMeta('mentionTierRefresh', Date.now()))
  }
  watch([validSet, tierMap], () => refreshMentionDecorations())

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
        if (isEditorAlive(editor.value)) editor.value.commands.clearContent(true)
      } else if (isEditorAlive(editor.value)) {
        editor.value.commands.setContent(contentForText(incoming))
        validateMentionsInBody(incoming, validSet.value)
      }
    },
  )

  watch(() => props.channelScope, () => {
    const ed = editor.value
    if (isEditorAlive(ed)) refreshChannelNodes(ed)
  }, { deep: true })
  watch(() => [channelPopover.open, channelPopover.highlightedIndex, channelPopover.items.length, mentionPopover.open, mentionPopover.highlightedIndex, mentionPopover.items.length, hashtagPopover.open, hashtagPopover.highlightedIndex, cashtagPopover.open, cashtagPopover.highlightedIndex], () => {
    const ed = editor.value
    if (!isEditorAlive(ed)) return
    const active = [channelPopover, mentionPopover, hashtagPopover, cashtagPopover].find(popover => popover.open)
    ed.view.dom.setAttribute('aria-expanded', String(!!active))
    if (active) {
      ed.view.dom.setAttribute('aria-controls', active.listboxId)
      if (active.items.length) ed.view.dom.setAttribute('aria-activedescendant', `${active.listboxId}-opt-${active.highlightedIndex}`)
      else ed.view.dom.removeAttribute('aria-activedescendant')
    } else {
      ed.view.dom.removeAttribute('aria-controls')
      ed.view.dom.removeAttribute('aria-activedescendant')
    }
  })

  watch(() => props.disabled, (d) => {
    const ed = editor.value
    if (!isEditorAlive(ed)) return
    ed.setEditable(!d)
  })

  /** TipTap nulls `commandManager` on destroy; `.commands` then throws. */
  function isEditorAlive(ed: CoreEditor | null | undefined): ed is CoreEditor {
    if (!ed || ed.isDestroyed) return false
    return Boolean((ed as unknown as { commandManager?: unknown }).commandManager)
  }

  function keepCaretInScrollport(ed: CoreEditor) {
    if (!isEditorAlive(ed) || ed.view.composing) return
    requestAnimationFrame(() => {
      if (!isEditorAlive(ed) || ed.view.composing) return
      try {
        ed.commands.scrollIntoView()
      } catch {
        // commandManager can still go null between the check and this frame.
      }
    })
  }

  function focus() {
    const ed = editor.value
    if (!isEditorAlive(ed)) return
    ed.commands.focus('end')
  }

  function insertAtCursor(text: string) {
    const ed = editor.value
    if (!isEditorAlive(ed)) return
    ed.chain().focus().insertContent(text).run()
  }

  function insertMention(username: string) {
    const ed = editor.value
    if (!isEditorAlive(ed) || props.disabled) return
    const un = username.trim()
    if (!un) return
    const text = getPlainText(ed)
    const from = ed.state.selection.from
    const caret = ed.state.doc.textBetween(1, from, '\n').length
    const next = insertMentionAtCaret(text, caret, un)
    lastEmittedText = next.text
    emit('update:modelValue', next.text)
    if (next.text) {
      ed.commands.setContent(contentForText(next.text))
    } else {
      ed.commands.clearContent(true)
    }
    const pos = Math.max(1, Math.min(next.caret + 1, ed.state.doc.content.size))
    ed.chain().focus().setTextSelection(pos).run()
    validateMentionsInBody(next.text, validSet.value)
  }

  function clear() {
    const ed = editor.value
    if (!isEditorAlive(ed)) return
    ed.commands.clearContent(true)
  }

  onMounted(() => {
    if (props.autoFocus) nextTick(() => focus())
    // Seed tier validation for any prefilled @mentions (e.g. composer opened with @username).
    if (props.modelValue) validateMentionsInBody(props.modelValue, validSet.value)
  })

  return {
    editor,
    focus,
    insertAtCursor,
    insertMention,
    clear,
  }
}

import type { JSONContent } from '@tiptap/core'
import { Node, mergeAttributes } from '@tiptap/core'
import { CHANNEL_REFERENCE_PATTERN, channelReferenceFromScope, channelReferenceLabel, channelReferenceToken, type ChannelReferenceScope } from './references'

/** Atomic chips serialize to IDs; clipboard text is a safe, human-readable label. */
export const ChannelReferenceNode = Node.create<{ scope: () => ChannelReferenceScope | undefined }>({
  addOptions() { return { scope: () => undefined } },
  name: 'channelReference',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      id: { default: null, parseHTML: element => element.getAttribute('data-channel-id'), renderHTML: attrs => ({ 'data-channel-id': attrs.id }) },
      groupId: { default: null, rendered: false },
      label: { default: 'Private', rendered: false },
      private: { default: true, rendered: false },
      accessible: { default: false, rendered: false },
    }
  },
  parseHTML() { return [{ tag: 'span[data-channel-reference]' }] },
  renderHTML({ node, HTMLAttributes }) {
    const reference = channelReferenceFromScope(channelReferenceToken(node.attrs.id), this.options.scope())
    const label = channelReferenceLabel(reference)
    return ['span', mergeAttributes(HTMLAttributes, { 'data-channel-reference': '', class: 'moh-channel-reference', contenteditable: 'false' }),
      ['span', { class: reference.privacy === 'private' ? 'moh-channel-reference-lock' : 'moh-channel-reference-hash', 'aria-hidden': 'true' }, reference.privacy === 'private' ? '' : '#'], ['span', { class: 'moh-channel-reference-label' }, label]]
  },
  renderText({ node }) { return channelReferenceToken(node.attrs.id) },
})

export function channelEditorNode(token: string, scope?: ChannelReferenceScope): JSONContent {
  const reference = channelReferenceFromScope(token, scope)
  const id = token.slice(2, -1)
  return { type: 'channelReference', attrs: { id, groupId: scope?.groupId ?? null, label: channelReferenceLabel(reference), private: reference.privacy === 'private', accessible: reference.accessible } }
}

/** JSON avoids parsing user text as HTML and faithfully restores multiline drafts. */
export function channelEditorDocument(text: string, scope?: ChannelReferenceScope): JSONContent {
  return { type: 'doc', content: text.split('\n').map(line => {
    const content: JSONContent[] = []
    let cursor = 0
    for (const match of line.matchAll(CHANNEL_REFERENCE_PATTERN)) {
      const start = match.index!
      if (start > cursor) content.push({ type: 'text', text: line.slice(cursor, start) })
      content.push(channelEditorNode(match[0], scope))
      cursor = start + match[0].length
    }
    if (cursor < line.length) content.push({ type: 'text', text: line.slice(cursor) })
    return { type: 'paragraph', content }
  }) }
}

import { Node, mergeAttributes } from '@tiptap/core'

export type CalloutType = 'info' | 'tip' | 'warning'

export const Callout = Node.create({
  name: 'callout',

  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: (el) => el.getAttribute('data-callout-type') as CalloutType || 'info',
        renderHTML: (attrs) => ({ 'data-callout-type': attrs.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'article-callout' }), 0]
  },

  addCommands() {
    return {
      setCallout:
        (attrs?: { type?: CalloutType }) =>
        ({ commands }: { commands: any }) => {
          return commands.wrapIn(this.name, attrs)
        },
      toggleCallout:
        (attrs?: { type?: CalloutType }) =>
        ({ commands }: { commands: any }) => {
          return commands.toggleWrap(this.name, attrs)
        },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType
    }
  }
}

import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import { composerStarterKit } from '~/utils/composer-editor'
import { ChannelReferenceNode, channelEditorDocument } from '~/utils/channels/editor'
import type { ChannelReferenceScope } from '~/utils/channels/references'
import type { GroupChannel } from '~/types/api'

const scope: ChannelReferenceScope = { groupId: 'g', channels: [{ id: 'bugs-id', groupId: 'g', name: 'bugs', displayName: null, privacy: 'normal', archivedAt: null }, { id: 'private-id', groupId: 'g', name: 'leaders', displayName: null, privacy: 'private', archivedAt: null }] as GroupChannel[] }
const editors: Editor[] = []
function editor(text: string, current = scope) {
  const result = new Editor({ extensions: [composerStarterKit, ChannelReferenceNode.configure({ scope: () => current })], content: channelEditorDocument(text, current) })
  editors.push(result)
  return result
}
afterEach(() => { for (const instance of editors.splice(0)) instance.destroy() })

describe('channel editor atomic references', () => {
  it('restores emoji, multiple references and newlines with stable serialization', () => {
    const body = '😀 See <#bugs-id> and <#private-id>\n@Thomas next'
    const field = editor(body)
    expect(field.getText({ blockSeparator: '\n' })).toBe(body)
    const element = document.createElement('div'); element.innerHTML = field.getHTML()
    expect(element.textContent).toContain('#bugs')
    expect(element.textContent).toContain('leaders')
    expect(element.textContent).not.toContain('bugs-id')
    expect(element.querySelectorAll('[data-channel-reference]')).toHaveLength(2)
  })

  it('deletes a whole reference and supports undo without corrupting adjacent text', () => {
    const field = editor('A <#bugs-id> B')
    field.commands.setTextSelection(4)
    field.commands.deleteRange({ from: 3, to: 4 })
    expect(field.getText()).toBe('A  B')
    field.commands.undo()
    expect(field.getText()).toBe('A <#bugs-id> B')
  })

  it('redacts foreign IDs and ignores forged pasted HTML labels', () => {
    const field = editor('<#foreign-id>')
    expect(field.view.dom.textContent).toBe('Private')
    field.commands.setContent('<p><span data-channel-reference data-channel-id="foreign-id" label="secret-team" accessible="true" groupId="elsewhere">secret-team</span></p>')
    expect(field.view.dom.textContent).not.toContain('secret-team')
    expect(field.view.dom.textContent).toBe('Private')
  })

  it('never interprets literal HTML or ordinary hashtags as editor nodes', () => {
    const body = '<script>alert(1)</script> #unknown & @Thomas'
    const field = editor(body)
    expect(field.getText()).toBe(body)
    expect(field.view.dom.querySelector('script')).toBeNull()
    expect(field.view.dom.querySelector('[data-channel-reference]')).toBeNull()
  })
})

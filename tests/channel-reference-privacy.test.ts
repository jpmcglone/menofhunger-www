import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import type { ChannelReference, GroupChannel } from '~/types/api'
import { composerStarterKit } from '~/utils/composer-editor'
import { ChannelReferenceNode, channelEditorDocument } from '~/utils/channels/editor'
import { channelReferencePlainText, visibleChannelReferences, type ChannelReferenceScope } from '~/utils/channels/references'

const privateChannel = {
  id: 'private-id', groupId: 'group', name: 'leadership', displayName: 'Leaders only', privacy: 'private', archivedAt: null,
} as GroupChannel
const privateSnapshot: ChannelReference = {
  token: '<#private-id>', channelId: 'private-id', name: 'leadership', displayName: 'Leaders only', privacy: 'private', accessible: true,
}
const body = 'Discuss <#private-id> in this thread.'
const editors: Editor[] = []
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy() })

describe('channel reference authorization refresh', () => {
  it('redacts a cached private reference after a reconnect loads the revoked authorization list', () => {
    const cached = { body, channelReferences: [privateSnapshot] }
    const authorized = { groupId: 'group', channels: [privateChannel] }
    expect(channelReferencePlainText(cached.body, visibleChannelReferences(cached.body, authorized))).toContain('Leaders only')

    // Neither the source message revision nor an old socket snapshot authorizes a target label.
    const revoked = { groupId: 'group', channels: [] }
    const projected = visibleChannelReferences(cached.body, revoked)
    expect(projected[0]).toMatchObject({ accessible: false, channelId: null, name: null, displayName: null })
    expect(channelReferencePlainText(cached.body, projected)).toBe('Discuss 🔒 Private in this thread.')
    expect(JSON.stringify(projected)).not.toMatch(/leadership|Leaders only/)
  })

  it('uses current labels instead of delayed message metadata without changing paginated message identity', () => {
    const rows = [
      { id: 'earlier', sequence: 1, body, channelReferences: [privateSnapshot] },
      { id: 'latest', sequence: 40, body: 'Later <#private-id>', channelReferences: [privateSnapshot] },
    ]
    const current: ChannelReferenceScope = { groupId: 'group', channels: [{ ...privateChannel, name: 'staff', displayName: 'Staff room' }] }
    const projected = rows.map(row => ({ ...row, channelReferences: visibleChannelReferences(row.body, current) }))
    expect(projected.map(row => ({ id: row.id, sequence: row.sequence, body: row.body })))
      .toEqual(rows.map(row => ({ id: row.id, sequence: row.sequence, body: row.body })))
    for (const row of projected) {
      expect(channelReferencePlainText(row.body, row.channelReferences)).toContain('Staff room')
      expect(JSON.stringify(row.channelReferences)).not.toMatch(/leadership|Leaders only/)
    }
  })

  it('rejects metadata and channel-list entries for another group even when the ID is known', () => {
    const current: ChannelReferenceScope = { groupId: 'group', channels: [{ ...privateChannel, groupId: 'elsewhere' }] }
    const projected = visibleChannelReferences(body, current)
    expect(projected[0]!.accessible).toBe(false)
    expect(channelReferencePlainText(body, projected)).toBe('Discuss 🔒 Private in this thread.')
  })
})

describe('channel reference HTML privacy', () => {
  it('does not serialize a stale private label into HTML attributes after access is revoked', () => {
    let current: ChannelReferenceScope = { groupId: 'group', channels: [privateChannel] }
    const editor = new Editor({
      extensions: [composerStarterKit, ChannelReferenceNode.configure({ scope: () => current })],
      content: channelEditorDocument(body, current),
    })
    editors.push(editor)
    current = { groupId: 'group', channels: [] }
    const html = editor.getHTML()
    expect(html).toContain('Private')
    expect(html).not.toMatch(/leadership|Leaders only/)
    expect(editor.getText()).toBe(body)
  })

  it('does not copy forged accessibility or labels from pasted foreign-channel HTML', () => {
    const editor = new Editor({
      extensions: [composerStarterKit, ChannelReferenceNode.configure({ scope: () => ({ groupId: 'group', channels: [] }) })],
      content: '<p><span data-channel-reference data-channel-id="foreign-id" groupId="elsewhere" label="Secret leaders" accessible="true">Secret leaders</span></p>',
    })
    editors.push(editor)
    expect(editor.view.dom.textContent).toBe('Private')
    expect(editor.getHTML()).not.toContain('Secret leaders')
    expect(editor.getHTML()).not.toContain('accessible="true"')
    expect(editor.getText()).toBe('<#foreign-id>')
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('space live chat username click mentions', () => {
  it('inserts a mention from the chat row instead of navigating to the profile', () => {
    const row = read('components/app/radio/RadioLiveChatMessageRow.vue')
    expect(row).toContain("emit('mention', next)")
    expect(row).toContain('onUsernameActivate')
    expect(row).not.toMatch(/:to="profilePath"/)
    expect(row).not.toMatch(/:to="`\/u\/\$\{encodeURIComponent\(seg\.username!\)\}`"/)
  })

  it('keeps the hover preview as the path to the full profile', () => {
    const row = read('components/app/radio/RadioLiveChatMessageRow.vue')
    const preview = read('components/app/UserPreviewCard.vue')
    expect(row).toContain('useUserPreviewTrigger')
    expect(preview).toContain(':to="profilePath"')
    expect(preview).toContain('View @${user.username} profile')
  })

  it('wires the mention into the live-chat composer', () => {
    const panel = read('components/app/radio/RadioLiveChatPanel.vue')
    expect(panel).toContain('@mention="onMention"')
    expect(panel).toContain('composerRef.value?.insertMention(un)')
  })
})

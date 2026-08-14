import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('space live chat URL hover preview', () => {
  it('wires hover on live-chat URL segments to the link preview popover', () => {
    const row = read('components/app/radio/RadioLiveChatMessageRow.vue')
    expect(row).toContain('useLinkPreviewTrigger')
    expect(row).toMatch(/@mouseenter="\(e\) => onLinkEnter\(seg\.href, e\)"/)
    expect(row).toMatch(/@mousemove="onLinkMove"/)
    expect(row).toMatch(/@mouseleave="onLinkLeave"/)
  })

  it('does not add hover URL previews to DM message bodies', () => {
    const dm = read('components/app/chat/ChatMessageRichBody.vue')
    expect(dm).not.toContain('useLinkPreviewTrigger')
    expect(dm).not.toContain('useLinkPreviewPopover')
  })

  it('mounts the popover next to the other hover preview cards', () => {
    const overlays = read('components/app/layout/GlobalOverlays.vue')
    expect(overlays).toContain('<AppLinkPreviewPopover />')
    expect(overlays).toContain('<AppUserPreviewPopover />')
  })

  it('fetches metadata on hover, not for every mounted row', () => {
    const pop = read('composables/useLinkPreviewPopover.ts')
    const row = read('components/app/radio/RadioLiveChatMessageRow.vue')
    expect(pop).toContain('getLinkMetadata')
    expect(pop).toMatch(/SHOW_DELAY_MS = 450/)
    expect(row).not.toContain('getLinkMetadata')
  })

  it('opens the user preview for /u/:username links instead of the generic OG card', () => {
    const trigger = read('composables/useLinkPreviewTrigger.ts')
    expect(trigger).toContain('extractMohUsername')
    expect(trigger).toContain('useUserPreviewMultiTrigger')
    expect(trigger).toContain('userTrigger.onEnter')
  })

  it('navigates internal MoH URLs in-app', () => {
    const row = read('components/app/radio/RadioLiveChatMessageRow.vue')
    expect(row).toContain('internalPathFor')
    expect(row).toContain('isMohUrl')
    expect(row).toContain('mohUrlPath')
  })

  it('closes the other hover popovers when a URL preview opens', () => {
    const pop = read('composables/useLinkPreviewPopover.ts')
    expect(pop).toContain('useUserPreviewPopover')
    expect(pop).toContain('useGroupPreviewPopover')
    expect(pop).toContain('useCrewPreviewPopover')
  })
})

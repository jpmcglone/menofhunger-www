import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  pickaxCrosspostEligible,
  pickaxCrosspostWanted,
  type PickaxCrosspostDraft,
} from '~/utils/pickax-crosspost'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

function draft(overrides: Partial<PickaxCrosspostDraft> = {}): PickaxCrosspostDraft {
  return {
    connected: true,
    visibility: 'public',
    body: 'hello world',
    mediaCount: 0,
    mediaAllUploadedImages: true,
    hasPoll: false,
    isReply: false,
    isQuote: false,
    isCheckin: false,
    groupId: null,
    scheduled: false,
    ...overrides,
  }
}

describe('Pickax cross-post toggle', () => {
  it('sends the flag when the author turns it on', () => {
    expect(pickaxCrosspostWanted(draft(), true)).toBe(true)
  })

  it('never sends the flag while it is off', () => {
    expect(pickaxCrosspostWanted(draft(), false)).toBe(false)
    expect(pickaxCrosspostWanted(draft({ mediaCount: 2 }), false)).toBe(false)
  })

  it.each([
    ['no Pickax connection', { connected: false }],
    ['verified-only', { visibility: 'verifiedOnly' }],
    ['premium-only', { visibility: 'premiumOnly' }],
    ['only me', { visibility: 'onlyMe' }],
    ['a group post', { groupId: 'group-1' }],
    ['a scheduled post', { scheduled: true }],
    ['a poll', { hasPoll: true }],
    ['a reply', { isReply: true }],
    ['a quote', { isQuote: true }],
    ['a check-in', { isCheckin: true }],
    ['a video', { mediaCount: 1, mediaAllUploadedImages: false }],
    ['an empty draft', { body: '   ', mediaCount: 0 }],
    ['a body over the Pickax limit', { body: 'a'.repeat(1001) }],
  ])('stays off for %s even when the toggle is on', (_label, overrides) => {
    const d = draft(overrides as Partial<PickaxCrosspostDraft>)
    expect(pickaxCrosspostEligible(d)).toBe(false)
    expect(pickaxCrosspostWanted(d, true)).toBe(false)
  })

  it('offers the choice for a public post with uploaded images', () => {
    expect(pickaxCrosspostEligible(draft({ mediaCount: 3 }))).toBe(true)
    expect(pickaxCrosspostEligible(draft({ body: '', mediaCount: 1 }))).toBe(true)
  })
})

describe('composer wiring', () => {
  it('sends crossPostToPickax only when the shared rule says so', () => {
    const src = readFromRepo('components/app/PostComposer.vue')
    expect(src).toContain('return pickaxCrosspostWanted(pickaxDraft(media), crossPostToPickax.value)')
    expect(src).toContain('...(pickax ? { crossPostToPickax: true } : {}),')
  })

  it('opens the preview before posting and only then applies the choice', () => {
    const src = readFromRepo('components/app/PostComposer.vue')
    expect(src).toContain('if (previewSupported.value && !previewApproved.value) {')
    expect(src).toContain('crossPostToPickax.value = options.crossPostToPickax')
  })
})

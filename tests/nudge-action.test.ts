import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  NUDGE_REASON_ALREADY,
  NUDGE_REASON_NOT_MUTUAL,
  NUDGE_REASON_VERIFY,
  resolveNudgeAction,
} from '../utils/nudge-action'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

const ready = {
  isAuthed: true,
  isSelf: false,
  hasTarget: true,
  isMutualFollow: true,
  viewerIsVerified: true,
  inboundPending: false,
  outboundPending: false,
}

describe('resolveNudgeAction', () => {
  it('hides on self, signed out, missing target, or page accounts', () => {
    expect(resolveNudgeAction({ ...ready, isSelf: true }).kind).toBe('hidden')
    expect(resolveNudgeAction({ ...ready, isAuthed: false }).kind).toBe('hidden')
    expect(resolveNudgeAction({ ...ready, hasTarget: false }).kind).toBe('hidden')
    expect(resolveNudgeAction({ ...ready, viewerIsPage: true }).kind).toBe('hidden')
    expect(resolveNudgeAction({ ...ready, targetIsPage: true }).kind).toBe('hidden')
  })

  it('shows a disabled nudge instead of hiding when you cannot send', () => {
    expect(resolveNudgeAction({ ...ready, isMutualFollow: false })).toEqual({
      kind: 'nudge',
      disabled: true,
      reason: NUDGE_REASON_NOT_MUTUAL,
      label: 'Nudge',
    })
    expect(resolveNudgeAction({ ...ready, viewerIsVerified: false })).toEqual({
      kind: 'nudge',
      disabled: true,
      reason: NUDGE_REASON_VERIFY,
      label: 'Nudge',
    })
    expect(resolveNudgeAction({ ...ready, outboundPending: true })).toEqual({
      kind: 'nudged',
      disabled: true,
      reason: NUDGE_REASON_ALREADY,
      label: 'Nudged',
    })
  })

  it('prefers the viewer-only verify reason over follow state', () => {
    expect(
      resolveNudgeAction({
        ...ready,
        viewerIsVerified: false,
        isMutualFollow: false,
      }).reason,
    ).toBe(NUDGE_REASON_VERIFY)
  })

  it('keeps nudge-back available for unverified viewers when inbound is pending', () => {
    expect(
      resolveNudgeAction({
        ...ready,
        viewerIsVerified: false,
        inboundPending: true,
      }),
    ).toEqual({
      kind: 'nudgeBack',
      disabled: false,
      reason: null,
      label: 'Nudge back',
    })
  })

  it('allows a normal nudge when mutual and verified', () => {
    expect(resolveNudgeAction(ready)).toEqual({
      kind: 'nudge',
      disabled: false,
      reason: null,
      label: 'Nudge',
    })
  })

  it('wires the disabled reason onto profile and preview', () => {
    const header = readFromRepo('components/app/profile/Header.vue')
    const preview = readFromRepo('components/app/UserPreviewCard.vue')
    expect(header).toMatch(/resolveNudgeAction/)
    expect(header).toMatch(/viewerIsPage: isPageAccount\.value/)
    expect(header).toMatch(/targetIsPage: profile\.value\?\.accountKind === 'page'/)
    expect(preview).toMatch(/viewerIsPage: isPageAccount\.value/)
    expect(preview).toMatch(/targetIsPage: user\.value\.accountKind === 'page'/)
  })
})

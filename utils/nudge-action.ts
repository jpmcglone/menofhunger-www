export type NudgeActionKind = 'hidden' | 'nudge' | 'nudged' | 'nudgeBack'

export type NudgeAction = {
  kind: NudgeActionKind
  disabled: boolean
  /** Hover copy when disabled. Omit anything that reveals their side of the relationship. */
  reason: string | null
  label: string
}

export type NudgeActionInput = {
  isAuthed: boolean
  isSelf: boolean
  hasTarget: boolean
  isMutualFollow: boolean
  viewerIsVerified: boolean
  inboundPending: boolean
  outboundPending: boolean
}

export const NUDGE_REASON_VERIFY = 'Verify to nudge'
export const NUDGE_REASON_NOT_MUTUAL = 'Follow each other first'
export const NUDGE_REASON_ALREADY = 'Already nudged'

export function resolveNudgeAction(input: NudgeActionInput): NudgeAction {
  if (!input.isAuthed || input.isSelf || !input.hasTarget) {
    return { kind: 'hidden', disabled: true, reason: null, label: 'Nudge' }
  }

  if (input.inboundPending) {
    if (!input.isMutualFollow) {
      return {
        kind: 'nudgeBack',
        disabled: true,
        reason: NUDGE_REASON_NOT_MUTUAL,
        label: 'Nudge back',
      }
    }
    return { kind: 'nudgeBack', disabled: false, reason: null, label: 'Nudge back' }
  }

  if (!input.viewerIsVerified) {
    return { kind: 'nudge', disabled: true, reason: NUDGE_REASON_VERIFY, label: 'Nudge' }
  }

  if (!input.isMutualFollow) {
    return { kind: 'nudge', disabled: true, reason: NUDGE_REASON_NOT_MUTUAL, label: 'Nudge' }
  }

  if (input.outboundPending) {
    return { kind: 'nudged', disabled: true, reason: NUDGE_REASON_ALREADY, label: 'Nudged' }
  }

  return { kind: 'nudge', disabled: false, reason: null, label: 'Nudge' }
}

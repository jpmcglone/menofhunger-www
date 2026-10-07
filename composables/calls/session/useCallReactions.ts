import type { CallSession } from '~/types/api'
import {
  encodeCallReaction,
  isCallReactionEmoji,
  parseCallReactionPayload,
  pruneCallReactions,
  reduceCallReactions,
  type CallReaction,
} from '../callReactions'
import { reactionBlip, rt } from './callSessionRuntime'
import type { CallSessionStateContext } from './useCallSessionState'

/** Emoji reactions over the data channel and group-call hand raising. */
export function useCallReactions(s: CallSessionStateContext) {
  const {
    state,
    speakerDeviceId,
    reactions,
    presence,
    meId,
    call,
  } = s

  function ensureReactionPrune() {
    if (rt.reactionPruneTimer || !import.meta.client) return
    rt.reactionPruneTimer = setInterval(() => {
      reactions.value = pruneCallReactions(reactions.value, Date.now())
    }, 400)
  }

  function ingestReaction(userId: string, raw: unknown) {
    const parsed = parseCallReactionPayload(raw)
    if (!parsed) return
    const incoming: CallReaction = {
      id: `${userId}-${parsed.at}-${parsed.emoji}`,
      userId,
      emoji: parsed.emoji,
      at: parsed.at,
    }
    reactions.value = reduceCallReactions(reactions.value, incoming, Date.now())
    reactionBlip.play(speakerDeviceId.value)
    ensureReactionPrune()
  }

  function sendReaction(emoji: string) {
    if (!isCallReactionEmoji(emoji) || !meId.value) return
    const at = Date.now()
    const payload = encodeCallReaction(emoji, at)
    rt.transport?.sendData(payload)
    ingestReaction(meId.value, payload)
  }

  function isGroupCall(session: CallSession | null | undefined): boolean {
    return (session?.participants.length ?? 0) > 2
  }

  function selfHandRaised(session: CallSession | null | undefined): boolean {
    if (!session || !meId.value) return false
    return session.participants.find((p) => p.userId === meId.value)?.handRaised === true
  }

  function patchSelfHand(session: CallSession, raised: boolean): CallSession {
    if (!meId.value) return session
    return {
      ...session,
      participants: session.participants.map((p) =>
        p.userId === meId.value ? { ...p, handRaised: raised } : p,
      ),
    }
  }

  function toggleHand(): void {
    const current = call.value
    if (!current || !isGroupCall(current)) return
    const next = !selfHandRaised(current)
    state.value = { ...state.value, call: patchSelfHand(current, next) }
    presence.emitCallsState(current.id, { handRaised: next })
  }

  return { ensureReactionPrune, ingestReaction, sendReaction, isGroupCall, selfHandRaised, toggleHand }
}

export type CallReactionsContext = ReturnType<typeof useCallReactions>

import type { BoardVisibility } from '~/types/api'

export type BoardGateCopy = {
  title: string
  body: string
  ctaLabel: string
  ctaTo: string
  tone: 'verified' | 'premium'
}

/** Board read/interaction gating: anyone reads public threads; only verified members engage. */
export function useBoardAccess() {
  const { isAuthed, isVerifiedMember, isPremium } = useAuth()
  const authModal = useAuthActionModal()
  const route = useRoute()

  /** Returns true when the viewer may post, comment, or boost; otherwise opens the right prompt. */
  function requireMember(action: 'post' | 'comment' | 'boost'): boolean {
    if (!isAuthed.value) {
      authModal.show({ kind: 'login', action })
      return false
    }
    if (!isVerifiedMember.value) {
      authModal.show({ kind: 'verify', action })
      return false
    }
    return true
  }

  /** Contextual unlock copy for a gated thread: sign in → verify → upgrade. */
  function gateCopy(visibility: BoardVisibility, commentCount = 0): BoardGateCopy {
    const tone = visibility === 'premiumOnly' ? 'premium' : 'verified'
    const scope = tone === 'premium' ? 'Premium' : 'Verified'
    const comments = commentCount > 0 ? ` and its ${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}` : ''
    if (!isAuthed.value) {
      return {
        tone,
        title: `${scope} discussion`,
        body: tone === 'premium'
          ? `Sign in and upgrade to Premium to read this post${comments}.`
          : `Sign in with a verified account to read this post${comments}.`,
        ctaLabel: 'Sign in',
        ctaTo: `/login?redirect=${encodeURIComponent(route.fullPath)}`,
      }
    }
    if (tone === 'verified' || !isVerifiedMember.value) {
      return {
        tone,
        title: `${scope} discussion`,
        body: `Verify your account to read this post${comments} and join the conversation.`,
        ctaLabel: 'Get verified',
        ctaTo: '/settings/verification',
      }
    }
    return {
      tone,
      title: 'Premium discussion',
      body: `Upgrade to Premium to read this post${comments}.`,
      ctaLabel: 'Upgrade to Premium',
      ctaTo: '/tiers',
    }
  }

  return { isAuthed, isVerifiedMember, isPremium, requireMember, gateCopy }
}

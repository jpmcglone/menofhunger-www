import type { ReferralMe } from '~/types/api'

export type InviteReward = {
  /** Short headline shown at the top of the invite page and in the rail card. */
  headline: string
  /** Three numbered steps for the "How it works" empty state. */
  steps: [string, string, string]
  /** Share message text used in navigator.share and clipboard copy. */
  shareMessage: (code: string) => string
  /** Inline sentence for the share button / tooltip area. */
  valueProp: string
}

/**
 * Single source of truth for invite-reward copy.
 *
 * Two states:
 *   - **paying**: the inviter has an active paid subscription → both parties earn a free month.
 *   - **not paying**: the inviter is verified but not on a paid plan → only the inviter earns
 *     a free month (the recruit earns one only when the person who brought them is paying).
 *
 * This composable is deliberately free of reactive data so it can be called from anywhere
 * (page setup, rail card, share composable) without coupling to auth or API calls.
 */
export function useInviteReward(referral: { isPayingPremium?: boolean } | null | undefined): InviteReward {
  const isPaying = Boolean(referral?.isPayingPremium)

  if (isPaying) {
    return {
      headline: 'Invite a man. You both get a free month.',
      steps: [
        'Share your referral code or link with men you think belong here.',
        'He signs up, verifies, and completes his first Premium payment.',
        'You both get a free month of Premium — automatically.',
      ],
      shareMessage: (code) =>
        `Join me on Men of Hunger. Use my code ${code} — after your first Premium payment, we both get a free month.`,
      valueProp: 'When he pays for his first month of Premium, you both get a free month.',
    }
  }

  return {
    headline: 'Invite a man. Earn a free month of Premium.',
    steps: [
      'Share your referral code or link with men you think belong here.',
      'He signs up, verifies, and completes his first Premium payment.',
      'You get a free month of Premium. Go Premium yourself and he gets one too.',
    ],
    shareMessage: (code) =>
      `Join me on Men of Hunger. Use my code ${code} when you sign up.`,
    valueProp: 'When he pays for his first month of Premium, you get a free month.',
  }
}

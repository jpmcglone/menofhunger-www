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
 * The month is granted when the invited man verifies, to both men, with no paid plan required.
 * The signature keeps the referral argument so callers do not change; the copy no longer
 * depends on the inviter's subscription.
 */
export function useInviteReward(_referral?: unknown): InviteReward {
  return {
    headline: 'Invite a man. When he verifies, you both get a free month.',
    steps: [
      'Share your referral code or link with men you think belong here.',
      'He signs up and verifies his account.',
      'You both get a free month of Premium, automatically.',
    ],
    shareMessage: (code) =>
      `Join me on Men of Hunger. Use my code ${code} and when you verify, we both get a free month of Premium.`,
    valueProp: 'When he verifies, you both get a free month of Premium.',
  }
}

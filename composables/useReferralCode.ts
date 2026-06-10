/**
 * Shared referral-code state.
 *
 * Module-level ref so ReferralRailCard and the /referrals page stay in sync
 * without a round-trip: when one writes, the other sees the change immediately.
 */
const _referralCode = ref<string | null | undefined>(undefined) // undefined = not yet loaded

export function useReferralCode() {
  return {
    /** Current referral code. `undefined` while not yet fetched, `null` if the user has none. */
    referralCode: readonly(_referralCode) as Readonly<Ref<string | null | undefined>>,
    setReferralCode(code: string | null) {
      _referralCode.value = code
    },
  }
}

/**
 * Referral Pilot cash rates — keep in sync with
 * menofhunger-api `AFFILIATE_RATES_CENTS` / min / cap in affiliate.service.ts.
 *
 * Eligibility: recruiter must be Premium (paid or gifted) to join and to earn.
 */
export const AFFILIATE_PILOT = {
  milestones: [
    { key: 'signup', label: 'Signs up', detail: 'Creates an account with your code', amountCents: 100 },
    { key: 'verified', label: 'Verifies', detail: 'Completes account verification', amountCents: 300 },
    { key: 'premium', label: 'First Premium month', detail: 'Pays for Premium the first time', amountCents: 1000 },
    {
      key: 'premium60d',
      label: 'Still Premium after 60 days',
      detail: 'Remains on Premium ~60 days after first payment',
      amountCents: 1000,
    },
  ],
  maxPerRecruitCents: 2400,
  minPayoutCents: 5000,
  capCents: 100_000,
} as const

export function formatAffiliateCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

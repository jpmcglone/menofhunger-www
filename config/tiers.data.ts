/**
 * Tier content — single source of truth for the tiers page.
 */

import tiersData from './tiers.data.json'

export type TierId = 'unverified' | 'verified' | 'premium' | 'premiumPlus'

export type TierItem = {
  text: string
  comingSoon?: boolean
}

export type TierPrice = {
  label?: string
  amount?: string
  interval?: string
}

export type Tier = {
  id: TierId
  name: string
  subtitle: string
  price: TierPrice
  /** Optional note under price (e.g. quarterly/annual options). */
  priceNote?: string
  badge?: string
  who: string
  can: TierItem[]
  cannot: TierItem[]
  why: string[]
  cta?: {
    label: string
  }
}

type TiersData = {
  intro: {
    label: string
    tagline?: string
    title: string
    description: string
  }
  metaDescription: string
  tiers: Tier[]
  footerNote: string
}

const tiersSource = tiersData as TiersData

export const tiersIntro = tiersSource.intro
export const tiersMetaDescription = tiersSource.metaDescription
export const tiers = tiersSource.tiers
export const tiersFooterNote = tiersSource.footerNote

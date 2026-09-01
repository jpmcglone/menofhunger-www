import type { NewsletterAudienceFilter, NewsletterDurationUnit } from '~/types/api'

export const NEWSLETTER_DURATION_UNITS: { label: string; value: NewsletterDurationUnit }[] = [
  { label: 'days', value: 'days' },
  { label: 'weeks', value: 'weeks' },
  { label: 'months', value: 'months' },
  { label: 'years', value: 'years' },
]

export function defaultAudienceFilter(type: NewsletterAudienceFilter['type']): NewsletterAudienceFilter {
  if (type === 'inactive') return { type: 'inactive', amount: 30, unit: 'days' }
  if (type === 'joined') return { type: 'joined', cmp: 'atLeast', amount: 1, unit: 'months' }
  if (type === 'noCheckin') return { type: 'noCheckin', amount: 14, unit: 'days' }
  return { type: 'tier', min: 'verified' }
}

export function summarizeAudienceFilter(filter: NewsletterAudienceFilter): string {
  if (filter.type === 'tier') return filter.min === 'premium' ? 'premium+' : 'verified+'
  const span = `${filter.amount} ${filter.unit}`
  if (filter.type === 'inactive') return `away ${span}`
  if (filter.type === 'joined') {
    return filter.cmp === 'atLeast' ? `members ${span}+` : `joined last ${span}`
  }
  return `no check-in ${span}`
}

export function summarizeAudienceFilters(filters: NewsletterAudienceFilter[]): string {
  if (!filters.length) return 'members with a confirmed email'
  return filters.map(summarizeAudienceFilter).join(' · ')
}

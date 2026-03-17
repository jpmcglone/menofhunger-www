/**
 * Life Arenas — a curated, men-relevant frame on top of the existing interests taxonomy.
 *
 * Each arena maps directly to existing interest values (no schema changes).
 * Use these for onboarding quick-picks and discovery surface filtering.
 */

export type LifeArena = {
  key: string
  label: string
  icon: string
  description: string
  /** Subset of existing interestOptions.value keys that define this arena. */
  featuredInterests: string[]
  /**
   * The API topic-category key this arena maps to for explore-page filtering.
   * These match the `category` field returned by /topics/categories.
   */
  categoryKey: string
}

export const LIFE_ARENAS: LifeArena[] = [
  {
    key: 'body',
    label: 'Body',
    icon: 'tabler:barbell',
    description: 'Strength, training, nutrition, outdoors',
    categoryKey: 'health',
    featuredInterests: [
      'strength_training',
      'endurance_training',
      'nutrition',
      'combat_sports',
      'outdoors',
      'mens_health',
      'sports',
    ],
  },
  {
    key: 'mission',
    label: 'Mission',
    icon: 'tabler:target',
    description: 'Career, business, money, leadership',
    categoryKey: 'business',
    featuredInterests: [
      'entrepreneurship',
      'career_growth',
      'investing',
      'personal_finance',
      'leadership',
      'small_business',
      'real_estate',
    ],
  },
  {
    key: 'family',
    label: 'Family',
    icon: 'tabler:users',
    description: 'Fatherhood, marriage, brotherhood, community',
    categoryKey: 'relationships',
    featuredInterests: [
      'fatherhood',
      'marriage',
      'family',
      'brotherhood',
      'mentorship',
      'community',
    ],
  },
  {
    key: 'mind',
    label: 'Mind',
    icon: 'tabler:brain',
    description: 'Discipline, stoicism, purpose, growth',
    categoryKey: 'philosophy',
    featuredInterests: [
      'self_discipline',
      'stoicism',
      'meaning_and_purpose',
      'habits',
      'books',
      'philosophy',
      'psychology',
    ],
  },
  {
    key: 'faith',
    label: 'Faith',
    icon: 'tabler:cross',
    description: 'Faith, calling, community',
    categoryKey: 'religion',
    featuredInterests: [
      'faith',
      'christianity',
      'prayer',
      'church',
      'discipleship',
      'theology',
      'spirituality',
    ],
  },
  {
    key: 'society',
    label: 'Society',
    icon: 'tabler:world',
    description: 'Politics, policy, current events, civics',
    categoryKey: 'politics',
    featuredInterests: [
      'current_events',
      'politics',
      'geopolitics',
      'civics',
      'law',
      'economics',
    ],
  },
  {
    key: 'craft',
    label: 'Craft',
    icon: 'tabler:tool',
    description: 'Technology, skills, mastery, creation',
    categoryKey: 'technology',
    featuredInterests: [
      'programming',
      'ai',
      'web_development',
      'cybersecurity',
      'startups',
      'gadgets',
    ],
  },
]

/** Return an arena's "active" state: partial (some selected) or full (all selected). */
export function arenaSelectionState(
  arena: LifeArena,
  selected: string[],
): 'none' | 'partial' | 'full' {
  const count = arena.featuredInterests.filter((v) => selected.includes(v)).length
  if (count === 0) return 'none'
  if (count === arena.featuredInterests.length) return 'full'
  return 'partial'
}

/** Toggle an arena: if any of its interests are selected, remove them; otherwise add all. */
export function toggleArena(arena: LifeArena, draft: string[], max: number): string[] {
  const set = new Set(draft)
  const hasAny = arena.featuredInterests.some((v) => set.has(v))
  if (hasAny) {
    for (const v of arena.featuredInterests) set.delete(v)
  } else {
    for (const v of arena.featuredInterests) {
      if (set.size >= max) break
      set.add(v)
    }
  }
  return Array.from(set)
}

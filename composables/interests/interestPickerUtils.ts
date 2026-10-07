export type InterestPickerOption = {
  value: string
  label: string
  group?: string
  keywords?: string[]
}

export const INTEREST_CATEGORY_ORDER = [
  'Religion',
  'Politics',
  'Business',
  'Technology',
  'Health',
  'Relationships',
  'Philosophy',
] as const

export const INTEREST_GROUP_KEYWORDS: Record<string, string[]> = {
  Religion: ['faith', 'church', 'bible', 'prayer', 'theology'],
  Politics: ['news', 'elections', 'policy', 'government', 'law'],
  Business: ['money', 'finance', 'career', 'investing', 'leadership'],
  Technology: ['tech', 'software', 'coding', 'ai', 'security'],
  Health: ['fitness', 'gym', 'nutrition', 'sleep', 'mental health'],
  Relationships: ['dating', 'marriage', 'family', 'friendship', 'communication'],
  Philosophy: ['meaning', 'purpose', 'ethics', 'stoicism', 'habits'],
}

export function interestNormKey(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
}

export function interestSearchText(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
}

export function interestMatchesFuzzy(opt: InterestPickerOption, q: string): boolean {
  const query = interestSearchText(q)
  if (!query) return true
  const tokens = query.split(' ').filter(Boolean)
  if (!tokens.length) return true

  const group = opt.group || ''
  const groupExtra = INTEREST_GROUP_KEYWORDS[group] ?? []
  const parts = [
    opt.label,
    opt.value,
    group,
    ...(opt.keywords ?? []),
    ...groupExtra,
  ]
  const hay = interestSearchText(parts.join(' '))
  return tokens.every((t) => hay.includes(t))
}

export function interestDisplayLabel(value: string, presetLabel?: string): string {
  if (presetLabel) {
    return String(presetLabel)
      .trim()
      .replace(/[_\s]+/g, ' ')
      .replace(/\s+/g, ' ')
  }
  const s = String(value ?? '')
    .trim()
    .replace(/[_\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
  if (!s) return value
  return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 64)
}

export function interestStoredValue(
  raw: string,
  presetValueByNorm: Map<string, string>,
): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''
  const mapped = presetValueByNorm.get(interestNormKey(trimmed))
  if (mapped) return mapped
  return trimmed
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/[^a-z0-9 '\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

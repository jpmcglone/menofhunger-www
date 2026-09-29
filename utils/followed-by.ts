/**
 * Copy for the profile's social-proof line: "Followed by Marv, Erika and 24 others you follow".
 * The named accounts come from the same ordered preview the count is taken from, so the sentence
 * and the number never disagree.
 */
export type FollowedByPerson = { name?: string | null; username?: string | null }

export function followedByLabel(people: FollowedByPerson[], total: number): string | null {
  const names = people
    .map((p) => (p.name?.trim() || p.username?.trim() || ''))
    .filter(Boolean)
  if (names.length === 0 || total <= 0) return null

  const others = Math.max(0, total - names.length)
  if (others > 0) {
    return `Followed by ${joinNames(names)} and ${others.toLocaleString()} ${others === 1 ? 'other' : 'others'} you follow`
  }
  return `Followed by ${joinNames(names)}`
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0]!
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

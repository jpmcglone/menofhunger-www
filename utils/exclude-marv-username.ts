/**
 * Marv only answers an explicit @marv. Inherited "Replying to" lists and
 * reply mention prefills must not keep him in the thread forever.
 */
export function excludeMarvUsername<T extends { username?: string | null }>(
  people: T[],
  marvUsername?: string | null,
): T[] {
  const needle = (marvUsername ?? 'marv').trim().toLowerCase()
  if (!needle) return people
  return people.filter((p) => (p.username ?? '').trim().toLowerCase() !== needle)
}

export function excludeMarvUsernameStrings(
  usernames: string[],
  marvUsername?: string | null,
): string[] {
  const needle = (marvUsername ?? 'marv').trim().toLowerCase()
  if (!needle) return usernames
  return usernames.filter((u) => u.trim().toLowerCase() !== needle)
}

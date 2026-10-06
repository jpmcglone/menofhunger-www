/** Group slug for in-app group paths (`/g/:slug`, `/groups/:slug/...`); null for everything else. */
export function groupSlugFromPath(path: string): string | null {
  let pathname: string
  try { pathname = new URL(path, 'https://menofhunger.com').pathname } catch { return null }
  const [first, slug] = pathname.split('/').filter(Boolean)
  if ((first !== 'g' && first !== 'groups') || !slug) return null
  if (first === 'groups' && ['new', 'invites', 'mine'].includes(slug)) return null
  try { return decodeURIComponent(slug).toLowerCase() } catch { return null }
}

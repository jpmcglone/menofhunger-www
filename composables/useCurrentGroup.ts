import type { CommunityGroupShell } from '~/types/api'

/** The group the current route belongs to (`/g/:slug/*`, `/groups/:slug/*`), when it is one of mine. */
export function useCurrentGroup() {
  const route = useRoute()
  const { groups } = useMyGroups()
  const context = usePageGroupContext()
  return computed<Pick<CommunityGroupShell, 'id' | 'slug' | 'name' | 'avatarImageUrl'> | null>(() => {
    const match = /^\/(?:g|groups)\/([^/]+)/.exec(route.path)
    const slug = match?.[1] ? decodeURIComponent(match[1]) : ''
    if (!slug || ['explore', 'new'].includes(slug)) return null
    return groups.value.find(group => group.slug === slug) ?? (context.value?.slug === slug ? context.value : null)
  })
}

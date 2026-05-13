import { isNavActive, isPostPermalinkPath } from '~/config/routes'

export function useRouteMatch(route = useRoute()) {
  const groupCtx = usePageGroupContext()
  const { membership: viewerCrewMembership } = useViewerCrew()

  function isActive(to: string) {
    // A post permalink whose post belongs to a community group should keep the
    // Groups nav item highlighted (the page sets `usePageGroupContext`).
    if (
      to === '/groups'
      && groupCtx.value
      && isPostPermalinkPath(route.path)
    ) {
      return true
    }
    // The Crew nav item points at /crew, but viewers in a crew are redirected
    // to their crew's public detail page (/c/<slug>...). Keep the Crew nav
    // highlighted while they're browsing their own crew so the rail/tab bar
    // accurately reflects "you are in your crew".
    if (to === '/crew') {
      const slug = viewerCrewMembership.value?.crewSlug ?? null
      if (slug) {
        const ownCrewPath = `/c/${encodeURIComponent(slug)}`
        if (route.path === ownCrewPath || route.path.startsWith(`${ownCrewPath}/`)) {
          return true
        }
      }
    }
    return isNavActive({ currentPath: route.path, to })
  }

  return { isActive }
}


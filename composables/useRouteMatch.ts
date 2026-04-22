import { isNavActive, isPostPermalinkPath } from '~/config/routes'

export function useRouteMatch(route = useRoute()) {
  const groupCtx = usePageGroupContext()

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
    return isNavActive({ currentPath: route.path, to })
  }

  return { isActive }
}


import { isNavActive } from '~/config/routes'

export function useRouteMatch(route = useRoute()) {
  function isActive(to: string) {
    return isNavActive({ currentPath: route.path, to })
  }

  return { isActive }
}


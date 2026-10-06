export type GroupDialogName = 'settings' | 'pending'

const NAMES: readonly string[] = ['settings', 'pending']

/** Group settings and join requests are overlays on whichever group tab you are on, so Back and Close return you there. */
export function useGroupDialog() {
  const route = useRoute()
  const router = useRouter()
  const current = computed<GroupDialogName | null>(() => {
    const value = route.query.dialog
    return typeof value === 'string' && NAMES.includes(value) ? value as GroupDialogName : null
  })

  function without(query: typeof route.query) {
    const { dialog: _dialog, ...rest } = query
    return rest
  }

  /** A real, shareable link; the browser Back button closes the overlay. */
  function to(name: GroupDialogName) {
    return { path: route.path, query: { ...route.query, dialog: name } }
  }

  function close() {
    if (!current.value) return
    const previous = import.meta.client ? (history.state?.back as string | null | undefined) : null
    const cameFromSamePage = typeof previous === 'string' && !previous.includes('dialog=') && previous.split('?')[0] === route.path
    if (cameFromSamePage) router.back()
    else void router.replace({ path: route.path, query: without(route.query) })
  }

  function swap(name: GroupDialogName) {
    void router.replace(to(name))
  }

  return { current, to, close, swap }
}

import { useBookmarkCollections } from '~/composables/useBookmarkCollections'

export type PostBookmarkState = {
  hasBookmarked: boolean
  collectionIds: string[]
}

export type UsePostBookmarkOptions = {
  postId: Ref<string>
  initialHasBookmarked: Ref<boolean>
  initialCollectionIds: Ref<string[]>
  viewerCanInteract: Ref<boolean>
  onChange?: (state: PostBookmarkState, delta: number) => void
}

/**
 * Encapsulates all bookmark mutation logic for a post. Extracted from
 * PostRowBookmarkButton so the same logic can power both the inline button
 * (Popover) and the centred BookmarkFolderDialog.
 */
export function usePostBookmark(options: UsePostBookmarkOptions) {
  const { postId, initialHasBookmarked, initialCollectionIds, viewerCanInteract } = options

  const { apiFetchData } = useApiClient()
  const toast = useAppToast()
  const route = useRoute()

  const { user, isAuthed } = useAuth()
  const viewerToastTone = computed(() => {
    const u = user.value
    if (u?.premium) return 'premiumOnly' as const
    if ((u?.verifiedStatus ?? 'none') !== 'none') return 'verifiedOnly' as const
    return 'public' as const
  })
  const { show: showAuthActionModal } = useAuthActionModal()

  const bookmarksFeedBump = useState<number>('moh.bookmarks.feed.bump.v1', () => 0)
  function bumpBookmarksFeed() {
    if (import.meta.client && route.path.startsWith('/bookmarks')) return
    bookmarksFeedBump.value = (bookmarksFeedBump.value ?? 0) + 1
  }

  const loading = ref(false)
  const hasBookmarked = ref(Boolean(initialHasBookmarked.value))
  const collectionIds = ref<string[]>((initialCollectionIds.value ?? []).filter(Boolean))

  const createOpen = ref(false)
  const createName = ref('')
  const creating = ref(false)

  const {
    collections,
    loading: collectionsLoading,
    nameById,
    ensureLoaded,
    createCollection,
    bumpCounts,
  } = useBookmarkCollections()

  const prevPostId = ref(postId.value)
  watch(
    () => [postId.value, initialHasBookmarked.value, initialCollectionIds.value] as const,
    () => {
      const postChanged = postId.value !== prevPostId.value
      prevPostId.value = postId.value
      if (!postChanged && (loading.value || creating.value)) return
      hasBookmarked.value = Boolean(initialHasBookmarked.value)
      collectionIds.value = (initialCollectionIds.value ?? []).filter(Boolean)
      loading.value = false
      creating.value = false
      createOpen.value = false
      createName.value = ''
    },
    { immediate: true },
  )

  watch(
    [hasBookmarked, collectionIds],
    ([saved, ids]) => {
      if (!import.meta.client) return
      if (!saved) return
      if (!Array.isArray(ids) || ids.length === 0) return
      void ensureLoaded()
    },
    { immediate: true },
  )

  const folderLabel = computed(() => {
    if (!hasBookmarked.value) return null
    const ids = collectionIds.value
    if (!ids.length) return 'Unorganized'
    if (ids.length === 1) return nameById.value.get(ids[0]!) ?? 'Folder'
    return `${ids.length} folders`
  })

  async function removeBookmark() {
    if (loading.value) return
    loading.value = true
    const prevHas = hasBookmarked.value
    const prevIds = collectionIds.value.slice()
    if (prevHas) {
      hasBookmarked.value = false
      collectionIds.value = []
      options.onChange?.({ hasBookmarked: false, collectionIds: [] }, -1)
      bumpCounts({ prevHas, prevCollectionIds: prevIds, nextHas: false, nextCollectionIds: [] })
      bumpBookmarksFeed()
    }
    try {
      await apiFetchData('/bookmarks/' + encodeURIComponent(postId.value), { method: 'DELETE' })
    } catch (e: unknown) {
      if (prevHas) {
        hasBookmarked.value = true
        collectionIds.value = prevIds.slice()
        options.onChange?.({ hasBookmarked: true, collectionIds: prevIds.slice() }, 1)
        bumpCounts({ prevHas: false, prevCollectionIds: [], nextHas: prevHas, nextCollectionIds: prevIds })
      }
      toast.pushError(e, 'Failed to unsave post.')
    } finally {
      loading.value = false
    }
  }

  async function setBookmarkFolderIds(nextIds: string[]) {
    if (loading.value) return
    if (!isAuthed.value) return
    loading.value = true
    const prevHas = hasBookmarked.value
    const prevCids = collectionIds.value.slice()
    const optimisticIds = (nextIds ?? []).filter(Boolean)
    const didCreate = !prevHas
    hasBookmarked.value = true
    collectionIds.value = optimisticIds.slice()
    options.onChange?.({ hasBookmarked: true, collectionIds: optimisticIds.slice() }, didCreate ? 1 : 0)
    bumpCounts({ prevHas, prevCollectionIds: prevCids, nextHas: true, nextCollectionIds: optimisticIds.slice() })
    bumpBookmarksFeed()
    try {
      const res = await apiFetchData<{ collectionIds: string[] }>(
        '/bookmarks/' + encodeURIComponent(postId.value),
        { method: 'POST', body: { collectionIds: nextIds } },
      )
      const serverIds = (res?.collectionIds ?? []).filter(Boolean)
      if (serverIds.join('|') !== optimisticIds.join('|')) {
        bumpCounts({
          prevHas: true,
          prevCollectionIds: optimisticIds.slice(),
          nextHas: true,
          nextCollectionIds: serverIds.slice(),
        })
        collectionIds.value = serverIds
        options.onChange?.({ hasBookmarked: true, collectionIds: serverIds.slice() }, 0)
      }
    } catch (e: unknown) {
      const curIds = optimisticIds.slice()
      hasBookmarked.value = Boolean(prevHas)
      collectionIds.value = prevCids.slice()
      options.onChange?.({ hasBookmarked: Boolean(prevHas), collectionIds: prevCids.slice() }, didCreate ? -1 : 0)
      bumpCounts({ prevHas: true, prevCollectionIds: curIds, nextHas: prevHas, nextCollectionIds: prevCids })
      toast.pushError(e, 'Failed to save post.')
    } finally {
      loading.value = false
    }
  }

  async function toggleFolder(id: string) {
    if (!id) return
    const set = new Set(collectionIds.value)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    await setBookmarkFolderIds(Array.from(set))
  }

  async function createFolderAndSave() {
    const name = createName.value.trim()
    if (!name) return
    if (creating.value || loading.value) return
    creating.value = true
    try {
      const created = await createCollection(name)
      if (!created?.id) throw new Error('Failed to create folder.')
      const next = new Set(collectionIds.value)
      next.add(created.id)
      await setBookmarkFolderIds(Array.from(next))
      createOpen.value = false
      createName.value = ''
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to create folder.')
    } finally {
      creating.value = false
    }
  }

  async function onClick(event: Event) {
    if (loading.value) return
    if (!viewerCanInteract.value) return
    if (!isAuthed.value) {
      showAuthActionModal({ kind: 'login', action: 'bookmark' })
      return
    }
    if (!hasBookmarked.value) {
      await setBookmarkFolderIds([])
      if (hasBookmarked.value) {
        toast.push({ title: 'Saved', message: 'Unorganized', tone: viewerToastTone.value, durationMs: 1400 })
      }
      return
    }
    return event
  }

  function openPicker() {
    createOpen.value = false
    createName.value = ''
    if (import.meta.client) void ensureLoaded()
  }

  return {
    loading: readonly(loading),
    hasBookmarked: readonly(hasBookmarked),
    collectionIds: readonly(collectionIds),
    folderLabel,
    createOpen,
    createName,
    creating: readonly(creating),
    collections,
    collectionsLoading,
    nameById,
    removeBookmark,
    setBookmarkFolderIds,
    toggleFolder,
    createFolderAndSave,
    onClick,
    openPicker,
    ensureLoaded,
  }
}

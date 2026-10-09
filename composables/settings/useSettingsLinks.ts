import type { MyConnectedAccount, MyProfileLinks } from '~/types/api'
import { getApiErrorMessage, getErrorStatus } from '~/utils/api-error'
import {
  draftFromLink,
  linksPayload,
  linksSignature,
  moveItem,
  newDraft,
  type DraftLink,
} from '~/utils/profile-links-editor'

/**
 * State and actions for Settings → Links: connected accounts, the ordered custom-link list,
 * and save. The server list is the source of truth; edits live in `drafts` until Save.
 */
export function useSettingsLinks() {
  const { apiFetchData } = useApiClient()
  const { user: authUser, patchUser } = useAuth()

  const loaded = ref(false)
  const loading = ref(false)
  const loadError = ref<string | null>(null)

  const connectedAccounts = ref<MyConnectedAccount[]>([])
  const canAddCustomLinks = ref(false)
  const maxLinks = ref(10)
  const path = ref<string | null>(null)

  const drafts = ref<DraftLink[]>([])
  const serverSignature = ref(linksSignature([]))

  const saving = ref(false)
  const saveError = ref<string | null>(null)
  const justSaved = ref(false)
  let savedTimer: ReturnType<typeof setTimeout> | null = null

  const dirty = computed(() => linksSignature(drafts.value) !== serverSignature.value)
  const atLimit = computed(() => drafts.value.length >= maxLinks.value)
  const hasHiddenLinks = computed(() => drafts.value.some((d) => d.hiddenUntilVerified))

  function apply(data: MyProfileLinks) {
    connectedAccounts.value = data.connectedAccounts ?? []
    canAddCustomLinks.value = Boolean(data.canAddCustomLinks)
    maxLinks.value = data.maxLinks || 10
    path.value = data.path ?? null
    drafts.value = (data.links ?? []).map(draftFromLink)
    serverSignature.value = linksSignature(drafts.value)
  }

  /** Mirrors the saved list into the auth user so the profile header updates without a refetch. */
  function syncAuthLinks(data: MyProfileLinks) {
    patchUser({ links: (data.links ?? []).map(({ id, url, title, host, icon }) => ({ id, url, title, host, icon })) })
  }

  async function load(options: { silent?: boolean } = {}) {
    if (loading.value) return
    if (!options.silent) loading.value = true
    loadError.value = null
    try {
      const data = await apiFetchData<MyProfileLinks>('/users/me/links', { method: 'GET' })
      // Never clobber edits in progress with a background refresh.
      if (options.silent && dirty.value) return
      apply(data)
      loaded.value = true
    } catch (e) {
      if (!options.silent || !loaded.value) loadError.value = getApiErrorMessage(e) || 'Could not load your links.'
    } finally {
      loading.value = false
    }
  }

  function addLink(rawUrl: string, title: string): boolean {
    if (atLimit.value || !rawUrl.trim()) return false
    drafts.value = [...drafts.value, newDraft(rawUrl, title)]
    justSaved.value = false
    return true
  }

  function updateLink(key: string, rawUrl: string, title: string) {
    drafts.value = drafts.value.map((d) => {
      if (d.key !== key) return d
      const draft = newDraft(rawUrl, title)
      return { ...d, url: draft.url, title: draft.title, host: draft.host }
    })
    justSaved.value = false
  }

  function removeLink(key: string) {
    drafts.value = drafts.value.filter((d) => d.key !== key)
    justSaved.value = false
  }

  function moveBy(key: string, delta: -1 | 1) {
    const from = drafts.value.findIndex((d) => d.key === key)
    if (from < 0) return
    drafts.value = moveItem(drafts.value, from, from + delta)
    justSaved.value = false
  }

  function moveTo(fromKey: string, toKey: string) {
    const from = drafts.value.findIndex((d) => d.key === fromKey)
    const to = drafts.value.findIndex((d) => d.key === toKey)
    if (from < 0 || to < 0) return
    drafts.value = moveItem(drafts.value, from, to)
    justSaved.value = false
  }

  async function save(): Promise<boolean> {
    if (saving.value || !dirty.value) return false
    saving.value = true
    saveError.value = null
    try {
      const data = await apiFetchData<MyProfileLinks>('/users/me/links', {
        method: 'PUT',
        body: linksPayload(drafts.value),
      })
      if (data && Array.isArray(data.links)) {
        apply(data)
        syncAuthLinks(data)
      } else {
        await load({ silent: false })
      }
      justSaved.value = true
      if (savedTimer) clearTimeout(savedTimer)
      savedTimer = setTimeout(() => { justSaved.value = false }, 2400)
      return true
    } catch (e) {
      saveError.value =
        getErrorStatus(e) === 403
          ? getApiErrorMessage(e) || 'Custom links are for verified members.'
          : getApiErrorMessage(e) || 'Could not save your links.'
      return false
    } finally {
      saving.value = false
    }
  }

  const followerToggleError = ref<string | null>(null)

  /** X follower count visibility saves immediately; the switch reverts if the API refuses. */
  async function setShowFollowerCount(network: MyConnectedAccount['network'], value: boolean) {
    const account = connectedAccounts.value.find((a) => a.network === network)
    if (!account || !account.supportsFollowerCount) return
    const previous = account.showFollowerCount
    account.showFollowerCount = value
    followerToggleError.value = null
    try {
      const data = await apiFetchData<MyProfileLinks>('/users/me/links/settings', {
        method: 'PATCH',
        body: { showXFollowerCount: value },
      })
      if (data && Array.isArray(data.connectedAccounts)) connectedAccounts.value = data.connectedAccounts
    } catch (e) {
      account.showFollowerCount = previous
      followerToggleError.value = getApiErrorMessage(e) || 'Could not update that setting.'
    }
  }

  // Another tab or device changed the list (realtime self update): refresh unless mid-edit.
  watch(
    () => authUser.value?.links,
    (links) => {
      if (!loaded.value || saving.value || dirty.value || !links) return
      if (linksSignature(links) === serverSignature.value) return
      void load({ silent: true })
    },
  )

  onBeforeUnmount(() => {
    if (savedTimer) clearTimeout(savedTimer)
  })

  return {
    loaded,
    loading,
    loadError,
    connectedAccounts,
    canAddCustomLinks,
    maxLinks,
    path,
    drafts,
    dirty,
    atLimit,
    hasHiddenLinks,
    saving,
    saveError,
    justSaved,
    followerToggleError,
    load,
    addLink,
    updateLink,
    removeLink,
    moveBy,
    moveTo,
    save,
    setShowFollowerCount,
  }
}

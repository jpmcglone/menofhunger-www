import type { OrgAffiliationDto, UserDto } from '~/types/api-contracts.gen'
import type { AdminGrantSummary } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import type { AppFeatureToggle } from '~/config/app-feature-toggles'
import { useAdminUsersOperators } from './useAdminUsersOperators'
import { useAdminUsersEdit } from './useAdminUsersEdit'
import type { InjectionKey } from 'vue'

/**
 * Script state for `/admin/users`, shared with the user admin sections through
 * `useAdminUsersContext()`.
 */
export function useAdminUsersPage() {
  const search = useAdminUsersSearch()
  const affiliations = useAdminUsersAffiliations(search)
  const operators = useAdminUsersOperators(search)
  const edit = useAdminUsersEdit({ ...search, ...affiliations, ...operators })
  const ctx = { ...search, ...affiliations, ...operators, ...edit }
  provide(ADMIN_USERS_CONTEXT, ctx)
  return ctx
}

export type AdminUser = UserDto & { orgAffiliations?: OrgAffiliationDto[] }
export type OrgAffiliation = OrgAffiliationDto
export type PageOperator = OrgAffiliationDto
export type OperatedPage = Pick<UserDto, 'id' | 'username' | 'name' | 'avatarUrl' | 'avatarVideo' | 'accountKind' | 'isOrganization'>

/**
 * User search synced with the URL, edit dialog state, and free-month grants.
 */
export function useAdminUsersSearch() {
  usePageSeo({
    title: 'Users',
    description: 'Admin user search and editing.',
    canonicalPath: '/admin/users',
    noindex: true,
  })

  const { apiFetch, apiFetchData } = useApiClient()

  const route = useRoute()
  const router = useRouter()

  const userQuery = ref('')
  const searching = ref(false)
  const searchedOnce = ref(false)
  const searchError = ref<string | null>(null)
  const results = ref<AdminUser[]>([])

  async function runUserSearch(opts?: { updateUrl?: boolean }) {
    if (searching.value) return
    searchError.value = null
    searchedOnce.value = true
    searching.value = true

    const q = userQuery.value.trim()

    if (opts?.updateUrl !== false) {
      const query = q ? { q } : undefined
      void router.replace({ path: '/admin/users', query })
    }

    try {
      const res = await apiFetch<AdminUser[]>('/admin/users/search', {
        method: 'GET',
        query: { q, limit: 25 },
      })
      results.value = res.data ?? []
    } catch (e: unknown) {
      searchError.value = getApiErrorMessage(e) || 'Failed to search users.'
    } finally {
      searching.value = false
    }
  }

  function syncFromUrl() {
    const q = typeof route.query.q === 'string' ? route.query.q : ''
    userQuery.value = q
    void runUserSearch({ updateUrl: false })
  }

  onMounted(() => {
    syncFromUrl()
  })

  watch(() => route.query.q, (newQ) => {
    const q = typeof newQ === 'string' ? newQ : ''
    if (q !== userQuery.value.trim()) {
      userQuery.value = q
      void runUserSearch({ updateUrl: false })
    }
  })

  const editOpen = ref(false)
  const editingUser = ref<AdminUser | null>(null)
  const editError = ref<string | null>(null)
  const emailAdminError = ref<string | null>(null)
  const emailAdminSaving = ref(false)
  const banReason = ref('')
  const banSaving = ref(false)
  const banError = ref<string | null>(null)

  // Free month grants state
  const grantsLoading = ref(false)
  const grantSaving = ref(false)
  const grantError = ref<string | null>(null)
  const editPremiumMonths = ref(0)
  const editPremiumPlusMonths = ref(0)

  async function loadGrants(userId: string) {
    grantsLoading.value = true
    grantError.value = null
    try {
      const res = await apiFetchData<AdminGrantSummary>(
        `/admin/users/${encodeURIComponent(userId)}/subscription-grants`,
        { method: 'GET' },
      )
      editPremiumMonths.value = res.premiumMonthsRemaining
      editPremiumPlusMonths.value = res.premiumPlusMonthsRemaining
    } catch (e: unknown) {
      grantError.value = getApiErrorMessage(e) || 'Failed to load grants.'
    } finally {
      grantsLoading.value = false
    }
  }

  async function saveGrantMonths() {
    const u = editingUser.value
    if (!u || grantSaving.value) return
    grantSaving.value = true
    grantError.value = null
    try {
      const res = await apiFetchData<AdminGrantSummary>(
        `/admin/users/${encodeURIComponent(u.id)}/subscription-grants`,
        {
          method: 'PUT',
          body: {
            premiumMonths: editPremiumMonths.value,
            premiumPlusMonths: editPremiumPlusMonths.value,
          },
        },
      )
      editPremiumMonths.value = res.premiumMonthsRemaining
      editPremiumPlusMonths.value = res.premiumPlusMonthsRemaining
    } catch (e: unknown) {
      grantError.value = getApiErrorMessage(e) || 'Failed to save free months.'
    } finally {
      grantSaving.value = false
    }
  }

  return {
    apiFetch,
    apiFetchData,
    userQuery,
    searching,
    searchedOnce,
    searchError,
    results,
    runUserSearch,
    editOpen,
    editingUser,
    editError,
    emailAdminError,
    emailAdminSaving,
    banReason,
    banSaving,
    banError,
    grantsLoading,
    grantSaving,
    grantError,
    editPremiumMonths,
    editPremiumPlusMonths,
    loadGrants,
    saveGrantMonths,
  }
}

/**
 * Banned users state, editable profile fields, and org affiliations.
 */
export function useAdminUsersAffiliations(ctx: ReturnType<typeof useAdminUsersSearch>) {
  const { apiFetch, apiFetchData, editingUser } = ctx

  const bannedOpen = ref(false)
  const bannedQuery = ref('')
  const bannedUsers = ref<AdminUser[]>([])
  const bannedLoading = ref(false)
  const bannedError = ref<string | null>(null)
  const unbanLoadingId = ref<string | null>(null)

  const editPhone = ref('')
  const editUsername = ref('')
  const editName = ref('')
  const editBio = ref('')
  const editVerifiedStatus = ref<AdminUser['verifiedStatus']>('none')
  const editIsOrganization = ref(false)
  const editFeatureToggles = ref<AppFeatureToggle[]>([])

  // Org affiliations for the user being edited.
  const orgAffs = ref<OrgAffiliation[]>([])
  const orgAffsLoading = ref(false)
  const orgAffsError = ref<string | null>(null)
  const orgRemovingId = ref<string | null>(null)
  const orgAddingId = ref<string | null>(null)
  const addOrgQuery = ref('')
  const orgSearchLoading = ref(false)
  const orgSearchResults = ref<OrgAffiliation[]>([])

  async function loadOrgAffs(userId: string) {
    orgAffsLoading.value = true
    orgAffsError.value = null
    orgSearchResults.value = []
    addOrgQuery.value = ''
    try {
      const res = await apiFetch<OrgAffiliation[]>(`/admin/users/${encodeURIComponent(userId)}/orgs`, { method: 'GET' })
      orgAffs.value = res.data ?? []
    } catch (e: unknown) {
      orgAffsError.value = getApiErrorMessage(e) || 'Failed to load org affiliations.'
    } finally {
      orgAffsLoading.value = false
    }
  }

  async function searchOrgs() {
    const q = addOrgQuery.value.trim()
    if (!q || orgSearchLoading.value) return
    orgSearchLoading.value = true
    orgAffsError.value = null
    try {
      const res = await apiFetch<AdminUser[]>('/admin/users/search', {
        method: 'GET',
        query: { q, limit: 10 },
      })
      orgSearchResults.value = (res.data ?? [])
        .filter((u) => u.isOrganization)
        .map((u) => ({ id: u.id, username: u.username, name: u.name, avatarUrl: u.avatarUrl ?? null, avatarVideo: u.avatarVideo ?? null }))
    } catch (e: unknown) {
      orgAffsError.value = getApiErrorMessage(e) || 'Failed to search orgs.'
    } finally {
      orgSearchLoading.value = false
    }
  }

  async function addOrgAff(orgId: string) {
    const u = editingUser.value
    if (!u || orgAddingId.value) return
    orgAddingId.value = orgId
    orgAffsError.value = null
    try {
      const added = await apiFetchData<OrgAffiliation>(`/admin/users/${encodeURIComponent(u.id)}/orgs`, {
        method: 'POST',
        body: { orgId },
      })
      if (!orgAffs.value.some((a) => a.id === added.id)) {
        orgAffs.value = [...orgAffs.value, added]
      }
      orgSearchResults.value = orgSearchResults.value.filter((r) => r.id !== orgId)
    } catch (e: unknown) {
      orgAffsError.value = getApiErrorMessage(e) || 'Failed to add org affiliation.'
    } finally {
      orgAddingId.value = null
    }
  }

  async function removeOrgAff(orgId: string) {
    const u = editingUser.value
    if (!u || orgRemovingId.value) return
    orgRemovingId.value = orgId
    orgAffsError.value = null
    try {
      await apiFetch(`/admin/users/${encodeURIComponent(u.id)}/orgs/${encodeURIComponent(orgId)}`, { method: 'DELETE' })
      orgAffs.value = orgAffs.value.filter((a) => a.id !== orgId)
    } catch (e: unknown) {
      orgAffsError.value = getApiErrorMessage(e) || 'Failed to remove org affiliation.'
    } finally {
      orgRemovingId.value = null
    }
  }

  return {
    bannedOpen,
    bannedQuery,
    bannedUsers,
    bannedLoading,
    bannedError,
    unbanLoadingId,
    editPhone,
    editUsername,
    editName,
    editBio,
    editVerifiedStatus,
    editIsOrganization,
    editFeatureToggles,
    orgAffs,
    orgAffsLoading,
    orgAffsError,
    orgRemovingId,
    orgAddingId,
    addOrgQuery,
    orgSearchLoading,
    orgSearchResults,
    loadOrgAffs,
    searchOrgs,
    addOrgAff,
    removeOrgAff,
  }
}

export type AdminUsersPageContext = ReturnType<typeof useAdminUsersPage>

export const ADMIN_USERS_CONTEXT: InjectionKey<AdminUsersPageContext> = Symbol('admin-users')

/** Section components of pages/admin/users/index.vue read the shared context here. */
export function useAdminUsersContext(): AdminUsersPageContext {
  const ctx = inject(ADMIN_USERS_CONTEXT)
  if (!ctx) throw new Error('useAdminUsersContext() must be used inside pages/admin/users/index.vue')
  return ctx
}

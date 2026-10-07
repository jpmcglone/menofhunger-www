import { getApiErrorMessage } from '~/utils/api-error'
import type { useAdminUsersSearch, AdminUser, PageOperator, OperatedPage } from './useAdminUsersPage'

/**
 * Page operators, operated pages, converting to a page, and creating pages.
 */
export function useAdminUsersOperators(ctx: ReturnType<typeof useAdminUsersSearch>) {
  const { apiFetch, apiFetchData, userQuery, runUserSearch, editingUser } = ctx

  const operators = ref<PageOperator[]>([])
  const operatorsLoading = ref(false)
  const operatorsError = ref<string | null>(null)
  const operatorRemovingId = ref<string | null>(null)
  const operatorAddingId = ref<string | null>(null)
  const operatorQuery = ref('')
  const operatorSearchLoading = ref(false)
  const operatorSearchResults = ref<AdminUser[]>([])

  const operatedPages = ref<OperatedPage[]>([])
  const operatedPagesLoading = ref(false)
  const convertOperatorQuery = ref('')
  const convertOperatorSearchLoading = ref(false)
  const convertOperatorResults = ref<AdminUser[]>([])
  const convertOperatorId = ref<string | null>(null)
  const convertSaving = ref(false)
  const convertError = ref<string | null>(null)

  const createPageOpen = ref(false)
  const createPageUsername = ref('')
  const createPageName = ref('')
  const createPageIsOrg = ref(false)
  const createPageOperatorQuery = ref('')
  const createPageOperatorSearchLoading = ref(false)
  const createPageOperatorResults = ref<AdminUser[]>([])
  const createPageOperatorId = ref<string | null>(null)
  const createPageSaving = ref(false)
  const createPageError = ref<string | null>(null)

  async function loadOperators(userId: string) {
    operatorsLoading.value = true
    operatorsError.value = null
    operatorSearchResults.value = []
    operatorQuery.value = ''
    try {
      const res = await apiFetch<PageOperator[]>(`/admin/users/${encodeURIComponent(userId)}/operators`, { method: 'GET' })
      operators.value = res.data ?? []
    } catch (e: unknown) {
      operatorsError.value = getApiErrorMessage(e) || 'Failed to load operators.'
    } finally {
      operatorsLoading.value = false
    }
  }

  async function loadOperatedPages(userId: string) {
    operatedPagesLoading.value = true
    convertError.value = null
    convertOperatorResults.value = []
    convertOperatorQuery.value = ''
    try {
      const res = await apiFetch<OperatedPage[]>(`/admin/users/${encodeURIComponent(userId)}/operated-pages`, { method: 'GET' })
      operatedPages.value = res.data ?? []
    } catch (e: unknown) {
      convertError.value = getApiErrorMessage(e) || 'Failed to load pages.'
    } finally {
      operatedPagesLoading.value = false
    }
  }

  async function searchOperators() {
    const q = operatorQuery.value.trim()
    if (!q || operatorSearchLoading.value) return
    operatorSearchLoading.value = true
    operatorsError.value = null
    try {
      const res = await apiFetch<AdminUser[]>('/admin/users/search', { method: 'GET', query: { q, limit: 10 } })
      operatorSearchResults.value = (res.data ?? []).filter((u) => u.accountKind !== 'page')
    } catch (e: unknown) {
      operatorsError.value = getApiErrorMessage(e) || 'Failed to search operators.'
    } finally {
      operatorSearchLoading.value = false
    }
  }

  async function addOperator(operatorUserId: string) {
    const u = editingUser.value
    if (!u || operatorAddingId.value) return
    operatorAddingId.value = operatorUserId
    operatorsError.value = null
    try {
      const added = await apiFetchData<PageOperator>(`/admin/users/${encodeURIComponent(u.id)}/operators`, {
        method: 'POST',
        body: { operatorUserId },
      })
      if (!operators.value.some((a) => a.id === added.id)) {
        operators.value = [...operators.value, added]
      }
      operatorSearchResults.value = operatorSearchResults.value.filter((r) => r.id !== operatorUserId)
    } catch (e: unknown) {
      operatorsError.value = getApiErrorMessage(e) || 'Failed to add operator.'
    } finally {
      operatorAddingId.value = null
    }
  }

  async function removeOperator(operatorUserId: string) {
    const u = editingUser.value
    if (!u || operatorRemovingId.value) return
    operatorRemovingId.value = operatorUserId
    operatorsError.value = null
    try {
      await apiFetch(`/admin/users/${encodeURIComponent(u.id)}/operators/${encodeURIComponent(operatorUserId)}`, {
        method: 'DELETE',
      })
      operators.value = operators.value.filter((a) => a.id !== operatorUserId)
    } catch (e: unknown) {
      operatorsError.value = getApiErrorMessage(e) || 'Failed to remove operator.'
    } finally {
      operatorRemovingId.value = null
    }
  }

  async function searchConvertOperator() {
    const q = convertOperatorQuery.value.trim()
    if (!q || convertOperatorSearchLoading.value) return
    convertOperatorSearchLoading.value = true
    convertError.value = null
    try {
      const res = await apiFetch<AdminUser[]>('/admin/users/search', { method: 'GET', query: { q, limit: 10 } })
      convertOperatorResults.value = (res.data ?? []).filter((u) => u.accountKind !== 'page')
    } catch (e: unknown) {
      convertError.value = getApiErrorMessage(e) || 'Failed to search operators.'
    } finally {
      convertOperatorSearchLoading.value = false
    }
  }

  async function convertToPage(operatorUserId: string) {
    const u = editingUser.value
    if (!u || convertSaving.value) return
    convertSaving.value = true
    convertOperatorId.value = operatorUserId
    convertError.value = null
    try {
      await apiFetchData(`/admin/users/${encodeURIComponent(u.id)}/convert-to-page`, {
        method: 'POST',
        body: { operatorUserId },
      })
      editingUser.value = { ...u, accountKind: 'page', phone: null }
      await loadOperators(u.id)
    } catch (e: unknown) {
      convertError.value = getApiErrorMessage(e) || 'Failed to convert to page.'
    } finally {
      convertSaving.value = false
      convertOperatorId.value = null
    }
  }

  function openCreatePage() {
    createPageUsername.value = ''
    createPageName.value = ''
    createPageIsOrg.value = false
    createPageOperatorQuery.value = ''
    createPageOperatorResults.value = []
    createPageOperatorId.value = null
    createPageError.value = null
    createPageOpen.value = true
  }

  async function searchCreatePageOperator() {
    const q = createPageOperatorQuery.value.trim()
    if (!q || createPageOperatorSearchLoading.value) return
    createPageOperatorSearchLoading.value = true
    createPageError.value = null
    try {
      const res = await apiFetch<AdminUser[]>('/admin/users/search', { method: 'GET', query: { q, limit: 10 } })
      createPageOperatorResults.value = (res.data ?? []).filter((u) => u.accountKind !== 'page')
    } catch (e: unknown) {
      createPageError.value = getApiErrorMessage(e) || 'Failed to search operators.'
    } finally {
      createPageOperatorSearchLoading.value = false
    }
  }

  async function submitCreatePage() {
    if (createPageSaving.value || !createPageOperatorId.value) return
    createPageSaving.value = true
    createPageError.value = null
    try {
      const created = await apiFetchData<{ username: string | null }>(
        '/admin/pages',
        {
          method: 'POST',
          body: {
            username: createPageUsername.value.trim(),
            name: createPageName.value.trim(),
            isOrganization: createPageIsOrg.value,
            operatorUserId: createPageOperatorId.value,
          },
        },
      )
      createPageOpen.value = false
      userQuery.value = created.username ?? createPageUsername.value.trim()
      await runUserSearch()
    } catch (e: unknown) {
      createPageError.value = getApiErrorMessage(e) || 'Failed to create page.'
    } finally {
      createPageSaving.value = false
    }
  }

  return {
    operators,
    operatorsLoading,
    operatorsError,
    operatorRemovingId,
    operatorAddingId,
    operatorQuery,
    operatorSearchLoading,
    operatorSearchResults,
    operatedPages,
    operatedPagesLoading,
    convertOperatorQuery,
    convertOperatorSearchLoading,
    convertOperatorResults,
    convertOperatorId,
    convertSaving,
    convertError,
    createPageOpen,
    createPageUsername,
    createPageName,
    createPageIsOrg,
    createPageOperatorQuery,
    createPageOperatorSearchLoading,
    createPageOperatorResults,
    createPageOperatorId,
    createPageSaving,
    createPageError,
    loadOperators,
    loadOperatedPages,
    searchOperators,
    addOperator,
    removeOperator,
    searchConvertOperator,
    convertToPage,
    openCreatePage,
    searchCreatePageOperator,
    submitCreatePage,
  }
}

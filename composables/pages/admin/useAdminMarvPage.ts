import type {
  MarvAdminGlobalSettingsDto,
  MarvAdminGlobalSettingsPatchDto,
  MarvAdminUserRowDto,
  MarvAdminUserPatchDto,
  MarvAdminUserPatchResponseDto,
  MarvAdminDailyCostRowDto,
} from '~/types/api'
export function useAdminMarvPage() {

usePageSeo({
  title: 'Marv (admin)',
  description: 'Marv config, usage, and cost.',
  canonicalPath: '/admin/marv',
  noindex: true,
})

const { apiFetchData } = useApiClient()

const modeKeys = ['fast', 'regular', 'smart'] as const
type ModeKey = (typeof modeKeys)[number]
function defaultCost(m: ModeKey) {
  return m === 'fast' ? 1 : m === 'smart' ? 4 : 2
}

const loading = ref(false)
const loadError = ref<string | null>(null)

// ─── Settings ──────────────────────────────────────────────────────────────
const settings = ref<MarvAdminGlobalSettingsDto | null>(null)
const savingEnabled = ref(false)

async function loadSettings() {
  const data = await apiFetchData<MarvAdminGlobalSettingsDto>('/admin/marvin/config')
  settings.value = data
}

async function patchSettings(patch: MarvAdminGlobalSettingsPatchDto) {
  const data = await apiFetchData<MarvAdminGlobalSettingsDto>('/admin/marvin/config', {
    method: 'PATCH',
    body: patch,
  })
  settings.value = data
}

async function onToggleEnabled(next: boolean) {
  if (savingEnabled.value) return
  savingEnabled.value = true
  try {
    await patchSettings({ enabled: next })
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to update.'
  } finally {
    savingEnabled.value = false
  }
}

// ─── Cost rollups ──────────────────────────────────────────────────────────
const costRangeOptions = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
] as const
const costSinceDays = ref<7 | 30 | 90>(30)
const loadingCost = ref(false)
const costRows = ref<MarvAdminDailyCostRowDto[]>([])

async function loadCost() {
  loadingCost.value = true
  try {
    const rows = await apiFetchData<MarvAdminDailyCostRowDto[]>(
      `/admin/marvin/cost?sinceDays=${costSinceDays.value}`,
    )
    costRows.value = rows
  } finally {
    loadingCost.value = false
  }
}

function setCostRange(v: 7 | 30 | 90) {
  costSinceDays.value = v
  void loadCost()
}

const costRowsSortedDesc = computed(() =>
  costRows.value.slice().sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1)),
)
const totalRequests = computed(() => costRows.value.reduce((acc, r) => acc + r.totalRequests, 0))
const totalCredits = computed(() => costRows.value.reduce((acc, r) => acc + r.totalCreditsSpent, 0))
const totalCostStr = computed(() =>
  costRows.value.reduce((acc, r) => acc + r.totalCostUsd, 0).toFixed(2),
)

// ─── Users ─────────────────────────────────────────────────────────────────
const userQuery = ref('')
const usersFeed = useCursorFeed<MarvAdminUserRowDto>({
  stateKey: 'admin-marv-users',
  stateMode: 'local',
  buildRequest: (cursor) => {
    const q = userQuery.value.trim()
    return { path: '/admin/marvin/users', query: { q: q || undefined, cursor: cursor ?? undefined, limit: 25 } }
  },
  defaultErrorMessage: 'Failed to load Marv users.',
})
const {
  items: userRows,
  nextCursor: usersNextCursor,
  loading: loadingUsers,
  loadingMore: loadingUsersMore,
  loadMore: loadMoreUsers,
} = usersFeed

function loadUsers() {
  return usersFeed.refresh()
}

// ─── Edit user ─────────────────────────────────────────────────────────────
const editOpen = ref(false)
const editing = ref<MarvAdminUserRowDto | null>(null)
const editCredits = ref<number>(0)
const editDisabled = ref<boolean>(false)
const editError = ref<string | null>(null)
const saving = ref(false)

function openEditUser(row: MarvAdminUserRowDto) {
  editing.value = row
  editCredits.value = row.credits
  editDisabled.value = row.disabledByAdmin
  editError.value = null
  editOpen.value = true
}

async function saveEdit() {
  if (!editing.value) return
  saving.value = true
  editError.value = null
  try {
    const patch: MarvAdminUserPatchDto = {}
    if (editCredits.value !== editing.value.credits) {
      patch.credits = editCredits.value
    }
    if (editDisabled.value !== editing.value.disabledByAdmin) {
      patch.disabled = editDisabled.value
    }
    if (Object.keys(patch).length === 0) {
      editOpen.value = false
      return
    }
    const updated = await apiFetchData<MarvAdminUserPatchResponseDto>(
      `/admin/marvin/users/${encodeURIComponent(editing.value.userId)}`,
      { method: 'PATCH', body: patch },
    )
    const editedUserId = editing.value.userId
    userRows.value = userRows.value.map((r) => {
      if (r.userId !== editedUserId) return r
      const next = { ...r }
      if (updated.credits) {
        next.credits = updated.credits.credits
        next.creditsLastRefilledAt = updated.credits.lastRefilledAt
      }
      if (typeof updated.disabledByAdmin === 'boolean') next.disabledByAdmin = updated.disabledByAdmin
      return next
    })
    editOpen.value = false
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Failed to save.'
  } finally {
    saving.value = false
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  loadError.value = null
  try {
    await Promise.all([loadSettings(), loadCost(), loadUsers()])
    if (usersFeed.error.value) loadError.value = usersFeed.error.value
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load Marv admin data.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadAll()
})
  return {
    defaultCost,
    onToggleEnabled,
    loadCost,
    setCostRange,
    loadUsers,
    openEditUser,
    saveEdit,
    loadAll,
    modeKeys,
    loading,
    loadError,
    settings,
    savingEnabled,
    costRangeOptions,
    costSinceDays,
    loadingCost,
    costRows,
    costRowsSortedDesc,
    totalRequests,
    totalCredits,
    totalCostStr,
    userQuery,
    editOpen,
    editing,
    editCredits,
    editDisabled,
    editError,
    saving,
    userRows,
    usersNextCursor,
    loadingUsers,
    loadingUsersMore,
    loadMoreUsers,
  }
}

<template>
  <div class="h-[calc(100dvh-9rem)] sm:h-[calc(100dvh-6.5rem)]">
    <div class="grid h-full" :class="gridClass">
      <!-- Left: admin areas -->
      <section
        v-if="showAreasPane"
        :class="[
          'h-full overflow-y-auto border-b border-gray-200 dark:border-zinc-800',
          !isTinyViewport ? 'border-b-0 border-r pr-4' : 'pr-0'
        ]"
      >
        <div class="text-lg font-semibold">Admin</div>

        <div class="mt-4 space-y-2">
          <button type="button" class="w-full text-left" @click="selectedArea = 'site'">
            <div
              :class="[
                'w-full rounded-xl border p-3 transition-colors',
                selectedArea === 'site'
                  ? 'border-gray-300 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900'
                  : 'border-gray-200 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
              ]"
            >
              <div class="flex items-center gap-3">
                <i class="pi pi-cog text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Site settings</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Configure post rate limits</div>
                </div>
              </div>
            </div>
          </button>

          <button type="button" class="w-full text-left" @click="selectedArea = 'users'">
            <div
              :class="[
                'w-full rounded-xl border p-3 transition-colors',
                selectedArea === 'users'
                  ? 'border-gray-300 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900'
                  : 'border-gray-200 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
              ]"
            >
              <div class="flex items-center gap-3">
                <i class="pi pi-users text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Users</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Search and edit users</div>
                </div>
              </div>
            </div>
          </button>
        </div>
      </section>

      <!-- Right: selected area -->
      <section v-if="showContentPane" :class="['h-full overflow-hidden', !isTinyViewport ? 'pl-4' : '']">
        <div class="flex h-full flex-col">
          <div class="border-b border-gray-200 py-3 dark:border-zinc-800">
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-start gap-2">
                <Button
                  v-if="isTinyViewport && selectedArea"
                  icon="pi pi-arrow-left"
                  text
                  severity="secondary"
                  aria-label="Back"
                  @click="selectedArea = null"
                />
                <div class="min-w-0">
                  <div class="font-semibold truncate">
                    {{
                      selectedArea === 'users'
                        ? 'Users'
                        : selectedArea === 'site'
                          ? 'Site settings'
                          : 'Select an admin area'
                    }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Admin-only tools.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto py-4">
            <div class="px-4">
              <div v-if="selectedArea === 'site'" class="space-y-6">
                <div class="space-y-2">
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Post rate limits</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    Configure how frequently users can post.
                  </div>
                </div>

                <div v-if="siteError" class="text-sm text-red-700 dark:text-red-300">
                  {{ siteError }}
                </div>

                <div v-else class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Posts</label>
                    <InputNumber v-model="sitePostsPerWindow" :min="1" :max="100" class="w-full" />
                    <div class="text-xs text-gray-500 dark:text-gray-400">Max posts in the window.</div>
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Window (minutes)</label>
                    <InputNumber v-model="siteWindowMinutes" :min="1" :max="1440" class="w-full" />
                    <div class="text-xs text-gray-500 dark:text-gray-400">Rolling window size.</div>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <Button
                    label="Save"
                    icon="pi pi-check"
                    severity="secondary"
                    :loading="siteSaving"
                    :disabled="siteSaving"
                    @click="saveSiteConfig"
                  />
                  <div v-if="siteSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                </div>
              </div>

              <div v-if="selectedArea === 'users'" class="space-y-4">
                <div class="flex items-center gap-2">
                  <InputText
                    v-model="userQuery"
                    class="w-full"
                    placeholder="Search users by username, name, or phone…"
                    @keydown.enter.prevent="runUserSearch()"
                  />
                  <Button
                    label="Search"
                    icon="pi pi-search"
                    severity="secondary"
                    :loading="searching"
                    :disabled="searching"
                    @click="runUserSearch()"
                  />
                </div>

                <AppInlineAlert v-if="searchError" severity="danger">
                  {{ searchError }}
                </AppInlineAlert>

                <div v-if="searchedOnce && results.length === 0" class="text-sm text-gray-600 dark:text-gray-300">
                  No users found.
                </div>

                <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800 -mx-4">
                  <div
                    v-for="u in results"
                    :key="u.id"
                    role="button"
                    tabindex="0"
                    class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                    @click="onUserRowClick(u)"
                    @keydown.enter.prevent="onUserRowClick(u)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex min-w-0 items-start gap-3">
                        <AppAvatarCircle
                          :src="u.avatarUrl ?? null"
                          :name="u.name"
                          :username="u.username"
                          size-class="h-10 w-10"
                          bg-class="moh-surface"
                        />

                        <div class="min-w-0">
                          <template v-if="u.usernameIsSet && u.username">
                            <div class="flex items-center gap-2 min-w-0">
                              <div class="font-semibold truncate">
                                {{ u.name || u.username }}
                              </div>
                              <AppVerifiedBadge :status="u.verifiedStatus" :premium="u.premium" />
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
                              @{{ u.username }}
                            </div>
                          </template>
                          <template v-else>
                            <div class="font-semibold text-gray-900 dark:text-gray-50">
                              Username not set
                            </div>
                          </template>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-gray-200"
                        aria-label="Edit user"
                        @click.stop="openEdit(u)"
                      >
                        <i class="pi pi-pencil" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                <Dialog
                  v-model:visible="editOpen"
                  modal
                  header="Edit user"
                  :draggable="false"
                  :style="{ width: '34rem' }"
                >
                  <div v-if="editingUser" class="space-y-4">
                    <div class="space-y-2">
                      <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Phone</label>
                      <InputText v-model="editPhone" class="w-full font-mono" placeholder="+15551234567" />
                    </div>

                    <div class="space-y-2">
                      <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Username</label>
                      <div class="flex items-center gap-2">
                        <InputText v-model="editUsername" class="w-full font-mono" placeholder="username" />
                        <div class="shrink-0 w-8 flex items-center justify-center">
                          <i v-if="usernameAvailability === 'checking'" class="pi pi-spin pi-spinner text-gray-500" aria-hidden="true" />
                          <i
                            v-else-if="usernameAvailability === 'available' || usernameAvailability === 'same'"
                            class="pi pi-check text-green-600"
                            aria-hidden="true"
                          />
                          <i
                            v-else-if="usernameAvailability === 'taken' || usernameAvailability === 'invalid'"
                            class="pi pi-times text-red-600"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      <div v-if="usernameHelperText" class="text-sm" :class="usernameHelperToneClass">
                        {{ usernameHelperText }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        Leave blank to clear username.
                      </div>
                    </div>

                    <div class="space-y-2">
                      <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
                      <InputText v-model="editName" class="w-full" :maxlength="50" />
                    </div>

                    <div class="space-y-2">
                      <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Bio</label>
                      <Textarea
                        v-model="editBio"
                        class="w-full"
                        rows="4"
                        autoResize
                        :maxlength="160"
                        placeholder="Tell people a bit about yourself…"
                      />
                    </div>

                    <div class="space-y-2">
                      <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Premium</label>
                      <Select
                        v-model="editPremium"
                        :options="premiumOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select…"
                        class="w-full"
                      />
                    </div>

                    <div class="space-y-2">
                      <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Verified badge</label>
                      <Select
                        v-model="editVerifiedStatus"
                        :options="verifiedOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select…"
                        class="w-full"
                      />
                    </div>

                    <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">User details</div>

                      <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div class="text-xs text-gray-500 dark:text-gray-400">User ID</div>
                        <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
                          {{ editingUser?.id || '—' }}
                        </div>

                        <div class="text-xs text-gray-500 dark:text-gray-400">Joined</div>
                        <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
                          {{ joinedAtLabel }}
                        </div>

                        <div class="text-xs text-gray-500 dark:text-gray-400">Username locked</div>
                        <div class="text-sm text-gray-800 dark:text-gray-200">
                          <Tag :value="editingUser?.usernameIsSet ? 'Yes' : 'No'" :severity="editingUser?.usernameIsSet ? 'info' : 'secondary'" class="!text-xs" />
                        </div>

                        <div class="text-xs text-gray-500 dark:text-gray-400">Site admin</div>
                        <div class="text-sm text-gray-800 dark:text-gray-200">
                          <Tag :value="editingUser?.siteAdmin ? 'Yes' : 'No'" :severity="editingUser?.siteAdmin ? 'success' : 'secondary'" class="!text-xs" />
                        </div>

                        <div class="text-xs text-gray-500 dark:text-gray-400">Premium</div>
                        <div class="text-sm text-gray-800 dark:text-gray-200">
                          <Tag :value="editingUser?.premium ? 'Yes' : 'No'" :severity="editingUser?.premium ? 'warning' : 'secondary'" class="!text-xs" />
                        </div>

                        <div class="text-xs text-gray-500 dark:text-gray-400">Status</div>
                        <div class="text-sm text-gray-800 dark:text-gray-200">
                          <Tag
                            :value="verificationStatusLabel"
                            :severity="verificationStatusSeverity"
                            class="!text-xs"
                          />
                        </div>

                        <div class="text-xs text-gray-500 dark:text-gray-400">Verified at</div>
                        <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
                          {{ verificationVerifiedAtLabel }}
                        </div>

                        <div class="text-xs text-gray-500 dark:text-gray-400">Unverified at</div>
                        <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
                          {{ verificationUnverifiedAtLabel }}
                        </div>
                      </div>
                    </div>

                    <AppInlineAlert v-if="editError" severity="danger">
                      {{ editError }}
                    </AppInlineAlert>
                  </div>

                  <template #footer>
                    <Button label="Cancel" text severity="secondary" :disabled="saving" @click="editOpen = false" />
                    <Button
                      label="Save"
                      icon="pi pi-check"
                      :loading="saving"
                      :disabled="saving || !editingUser || !canSave"
                      @click="saveUser()"
                    />
                  </template>
                </Dialog>
              </div>
              <div v-else class="text-sm text-gray-600 dark:text-gray-300">
                Choose an area from the left.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'

definePageMeta({
  layout: 'app',
  title: 'Admin',
  middleware: ['admin'],
})

usePageSeo({
  title: 'Admin',
  description: 'Admin tools for Men of Hunger.',
  canonicalPath: '/admin',
  noindex: true,
})

type AdminArea = 'users' | 'site'

const selectedArea = ref<AdminArea | null>('users')

type SiteConfig = {
  id: number
  postsPerWindow: number
  windowSeconds: number
}

type AdminUser = {
  id: string
  createdAt: string
  phone: string
  username: string | null
  usernameIsSet: boolean
  name: string | null
  bio: string | null
  avatarUrl?: string | null
  siteAdmin: boolean
  premium: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  verifiedAt: string | null
  unverifiedAt: string | null
}

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'

const siteCfg = ref<SiteConfig | null>(null)
const siteSaving = ref(false)
const siteSaved = ref(false)
const siteError = ref<string | null>(null)
const sitePostsPerWindow = ref<number>(5)
const siteWindowMinutes = ref<number>(5)

watch(
  () => selectedArea.value,
  async (area) => {
    if (area !== 'site') return
    if (siteCfg.value) return
    siteError.value = null
    try {
      const res = await apiFetchData<{ config: SiteConfig }>('/admin/site-config', { method: 'GET' })
      siteCfg.value = res.config
      sitePostsPerWindow.value = res.config.postsPerWindow ?? 5
      siteWindowMinutes.value = Math.max(1, Math.round((res.config.windowSeconds ?? 300) / 60))
    } catch (e: unknown) {
      siteError.value = getApiErrorMessage(e) || 'Failed to load site settings.'
    }
  },
  { flush: 'post' },
)

async function saveSiteConfig() {
  siteSaved.value = false
  siteError.value = null
  siteSaving.value = true
  try {
    const res = await apiFetchData<{ config: SiteConfig }>('/admin/site-config', {
      method: 'PATCH',
      body: {
        postsPerWindow: sitePostsPerWindow.value,
        windowSeconds: Math.max(10, Math.round(siteWindowMinutes.value * 60)),
      },
    })
    siteCfg.value = res.config
    siteSaved.value = true
  } catch (e: unknown) {
    siteError.value = getApiErrorMessage(e) || 'Failed to save site settings.'
  } finally {
    siteSaving.value = false
  }
}

const userQuery = ref('')
const searching = ref(false)
const searchedOnce = ref(false)
const searchError = ref<string | null>(null)
const results = ref<AdminUser[]>([])

async function runUserSearch() {
  if (searching.value) return
  searchError.value = null
  searchedOnce.value = true
  searching.value = true
  try {
    const res = await apiFetchData<{ users: AdminUser[]; nextCursor: string | null }>('/admin/users/search', {
      method: 'GET',
      query: { q: userQuery.value.trim(), limit: 25 },
    })
    results.value = res.users
  } catch (e: unknown) {
    searchError.value = getApiErrorMessage(e) || 'Failed to search users.'
  } finally {
    searching.value = false
  }
}

const editOpen = ref(false)
const editingUser = ref<AdminUser | null>(null)
const saving = ref(false)
const editError = ref<string | null>(null)

const editPhone = ref('')
const editUsername = ref('')
const editName = ref('')
const editBio = ref('')
const editPremium = ref(false)
const editVerifiedStatus = ref<AdminUser['verifiedStatus']>('none')

type UsernameAvailability = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid' | 'same'
const usernameAvailability = ref<UsernameAvailability>('unknown')
const usernameHelperText = ref<string | null>(null)
const usernameHelperToneClass = computed(() => {
  if (usernameAvailability.value === 'available' || usernameAvailability.value === 'same') return 'text-green-700 dark:text-green-300'
  if (usernameAvailability.value === 'taken' || usernameAvailability.value === 'invalid') return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
})

let usernameDebounceTimer: ReturnType<typeof setTimeout> | null = null

function resetUsernameCheck() {
  usernameHelperText.value = null
  usernameAvailability.value = 'unknown'
  if (usernameDebounceTimer) {
    clearTimeout(usernameDebounceTimer)
    usernameDebounceTimer = null
  }
}

async function checkUsernameAvailability(username: string) {
  usernameAvailability.value = 'checking'
  usernameHelperText.value = null
  try {
    const res = await apiFetchData<{ available: boolean; normalized: string | null; error?: string }>('/admin/users/username/available', {
      method: 'GET',
      query: { username },
    })

    if (res.available) {
      usernameAvailability.value = 'available'
      usernameHelperText.value = res.normalized ? `Available: @${res.normalized}` : 'Available.'
    } else {
      usernameAvailability.value = res.error ? 'invalid' : 'taken'
      usernameHelperText.value = res.error || 'That username is taken.'
    }
  } catch (e: unknown) {
    usernameAvailability.value = 'unknown'
    usernameHelperText.value = getApiErrorMessage(e) || 'Failed to check username.'
  }
}

const currentUsernameLower = computed(() => (editingUser.value?.username ?? '').trim().toLowerCase())
const canSave = computed(() => {
  if (!editingUser.value) return false
  const desired = editUsername.value.trim()
  if (!desired) return true // clearing is allowed
  const desiredLower = desired.toLowerCase()
  if (desiredLower && desiredLower === currentUsernameLower.value) return true // unchanged
  return usernameAvailability.value === 'available'
})

watch(
  editUsername,
  (value) => {
    if (!editingUser.value) return

    if (usernameDebounceTimer) clearTimeout(usernameDebounceTimer)
    usernameHelperText.value = null
    usernameAvailability.value = 'unknown'

    const trimmed = value.trim()
    if (!trimmed) return

    const trimmedLower = trimmed.toLowerCase()
    if (trimmedLower === currentUsernameLower.value) {
      usernameAvailability.value = 'same'
      usernameHelperText.value = 'Unchanged.'
      return
    }

    usernameDebounceTimer = setTimeout(() => {
      void checkUsernameAvailability(trimmed)
    }, 500)
  },
  { flush: 'post' }
)

onBeforeUnmount(() => {
  if (usernameDebounceTimer) clearTimeout(usernameDebounceTimer)
})

const verifiedOptions = [
  { label: 'Not verified', value: 'none' as const },
  { label: 'Identity verified', value: 'identity' as const },
  { label: 'Manually verified', value: 'manual' as const },
]

const premiumOptions = [
  { label: 'Not premium', value: false },
  { label: 'Premium', value: true },
]

function formatIso(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  // Example: "Jan 24, 2026 · 6:55 PM"
  const date = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(d)

  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)

  return `${date} · ${time}`
}

const verificationStatusLabel = computed(() => {
  const s = editingUser.value?.verifiedStatus
  if (s === 'identity') return 'Identity verified'
  if (s === 'manual') return 'Manually verified'
  return 'Not verified'
})

const verificationStatusSeverity = computed(() => {
  const s = editingUser.value?.verifiedStatus
  if (s === 'identity' || s === 'manual') return 'info'
  return 'secondary'
})

const verificationVerifiedAtLabel = computed(() => formatIso(editingUser.value?.verifiedAt))
const verificationUnverifiedAtLabel = computed(() => formatIso(editingUser.value?.unverifiedAt))
const joinedAtLabel = computed(() => formatIso(editingUser.value?.createdAt))

function openEdit(u: AdminUser) {
  editingUser.value = u
  editError.value = null
  editPhone.value = u.phone
  editUsername.value = u.username ?? ''
  editName.value = u.name ?? ''
  editBio.value = u.bio ?? ''
  editPremium.value = Boolean(u.premium)
  editVerifiedStatus.value = u.verifiedStatus ?? 'none'
  resetUsernameCheck()
  editOpen.value = true
}

function onUserRowClick(u: AdminUser) {
  // Row click: go to public profile when possible.
  // If username isn't set, there is no public profile; open edit instead.
  const username = (u.username ?? '').trim()
  if (u.usernameIsSet && username) {
    void navigateTo(`/u/${encodeURIComponent(username)}`)
    return
  }
  openEdit(u)
}

async function saveUser() {
  const u = editingUser.value
  if (!u) return
  if (saving.value) return

  saving.value = true
  editError.value = null

  try {
    const res = await apiFetchData<{ user: AdminUser }>(`/admin/users/${encodeURIComponent(u.id)}/profile`, {
      method: 'PATCH',
      body: {
        phone: editPhone.value.trim(),
        username: editUsername.value.trim() ? editUsername.value.trim() : null,
        name: editName.value.trim() ? editName.value.trim() : null,
        bio: editBio.value.trim() ? editBio.value.trim() : null,
        premium: editPremium.value,
        verifiedStatus: editVerifiedStatus.value,
      },
    })

    // Update results list in-place.
    results.value = results.value.map((x) => (x.id === u.id ? res.user : x))
    editingUser.value = res.user
    editOpen.value = false
  } catch (e: unknown) {
    editError.value = getApiErrorMessage(e) || 'Failed to save user.'
  } finally {
    saving.value = false
  }
}

const { width, height } = useWindowSize()
const isTinyViewport = computed(() => {
  if (!import.meta.client) return false
  return width.value < 768 || height.value < 680
})

const showAreasPane = computed(() => (isTinyViewport.value ? !selectedArea.value : true))
const showContentPane = computed(() => (isTinyViewport.value ? Boolean(selectedArea.value) : true))

const gridClass = computed(() => {
  if (isTinyViewport.value) return 'grid-cols-1'
  return 'grid-cols-[18rem_1fr]'
})
</script>


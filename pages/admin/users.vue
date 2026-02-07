<template>
  <div class="py-4 space-y-4">
    <div class="px-4">
      <AppPageHeader title="Users" icon="pi-users" description="Search and edit users.">
      <template #leading>
        <!-- Only show back on mobile; desktop has the admin left pane. -->
        <Button
          class="md:hidden"
          text
          severity="secondary"
          icon="pi pi-chevron-left"
          aria-label="Back"
          @click="navigateTo('/admin')"
        />
      </template>
      </AppPageHeader>
    </div>

    <div class="px-4 flex items-center gap-2">
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

    <div v-if="searchError" class="px-4">
      <AppInlineAlert severity="danger">
        {{ searchError }}
      </AppInlineAlert>
    </div>

    <div v-if="searchedOnce && results.length === 0" class="px-4 text-sm text-gray-600 dark:text-gray-300">
      No users found.
    </div>

    <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
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
            <AppUserAvatar
              :user="u"
              size-class="h-10 w-10"
              bg-class="moh-surface"
            />

            <div class="min-w-0">
              <template v-if="u.usernameIsSet && u.username">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="font-semibold truncate">
                    {{ u.name || u.username }}
                  </div>
                  <AppVerifiedBadge :status="u.verifiedStatus" :premium="u.premium" :premium-plus="u.premiumPlus" />
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
              <AppLogoLoader v-if="usernameAvailability === 'checking'" :size="24" class="shrink-0" />
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
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Membership</label>
          <Select
            v-model="editMembership"
            :options="membershipOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select…"
            class="w-full"
          />
          <div v-if="membershipPrereqError" class="text-sm text-red-700 dark:text-red-300">
            {{ membershipPrereqError }}
          </div>
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

            <div class="text-xs text-gray-500 dark:text-gray-400">Membership</div>
            <div class="text-sm text-gray-800 dark:text-gray-200">
              <Tag :value="membershipLabel" :severity="membershipSeverity" class="!text-xs" />
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
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Users',
  middleware: 'admin',
})

usePageSeo({
  title: 'Users',
  description: 'Admin user search and editing.',
  canonicalPath: '/admin/users',
  noindex: true,
})

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
  premiumPlus: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  verifiedAt: string | null
  unverifiedAt: string | null
}

const { apiFetch, apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import { useFormSubmit } from '~/composables/useFormSubmit'

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
    const res = await apiFetch<AdminUser[]>('/admin/users/search', {
      method: 'GET',
      query: { q: userQuery.value.trim(), limit: 25 },
    })
    results.value = res.data ?? []
  } catch (e: unknown) {
    searchError.value = getApiErrorMessage(e) || 'Failed to search users.'
  } finally {
    searching.value = false
  }
}

const editOpen = ref(false)
const editingUser = ref<AdminUser | null>(null)
const editError = ref<string | null>(null)

const editPhone = ref('')
const editUsername = ref('')
const editName = ref('')
const editBio = ref('')
type MembershipTier = 'none' | 'premium' | 'premiumPlus'
const editMembership = ref<MembershipTier>('none')
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
const membershipPrereqError = computed(() => {
  if (editMembership.value === 'none') return null
  if (editVerifiedStatus.value === 'none') return 'User must be verified before enabling Premium or Premium+.'
  return null
})
const canSave = computed(() => {
  if (!editingUser.value) return false
  if (membershipPrereqError.value) return false
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

const membershipOptions = [
  { label: 'None', value: 'none' as const },
  { label: 'Premium', value: 'premium' as const },
  { label: 'Premium+', value: 'premiumPlus' as const },
]

const membershipLabel = computed(() => {
  const u = editingUser.value
  if (!u) return '—'
  if (u.premiumPlus) return 'Premium+'
  if (u.premium) return 'Premium'
  return 'None'
})

const membershipSeverity = computed(() => {
  const u = editingUser.value
  if (!u) return 'secondary'
  if (u.premiumPlus) return 'warning'
  if (u.premium) return 'warning'
  return 'secondary'
})

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

const verificationVerifiedAtLabel = computed(() => formatDateTime(editingUser.value?.verifiedAt))
const verificationUnverifiedAtLabel = computed(() => formatDateTime(editingUser.value?.unverifiedAt))
const joinedAtLabel = computed(() => formatDateTime(editingUser.value?.createdAt))

function openEdit(u: AdminUser) {
  editingUser.value = u
  editError.value = null
  editPhone.value = u.phone
  editUsername.value = u.username ?? ''
  editName.value = u.name ?? ''
  editBio.value = u.bio ?? ''
  editMembership.value = u.premiumPlus ? 'premiumPlus' : u.premium ? 'premium' : 'none'
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

const { submit: saveUser, submitting: saving } = useFormSubmit(
  async () => {
    const u = editingUser.value
    if (!u) return
    editError.value = null

    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/profile`, {
      method: 'PATCH',
      body: {
        phone: editPhone.value.trim(),
        username: editUsername.value.trim() ? editUsername.value.trim() : null,
        name: editName.value.trim() ? editName.value.trim() : null,
        bio: editBio.value.trim() ? editBio.value.trim() : null,
        premium: editMembership.value === 'premium' || editMembership.value === 'premiumPlus',
        premiumPlus: editMembership.value === 'premiumPlus',
        verifiedStatus: editVerifiedStatus.value,
      },
    })

    // Update results list in-place.
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    editingUser.value = updated
    editOpen.value = false
  },
  {
    defaultError: 'Failed to save user.',
    onError: (message) => {
      editError.value = message
    },
  },
)
</script>


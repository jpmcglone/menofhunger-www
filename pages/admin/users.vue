<template>
  <AppPageContent bottom="standard">
  <div class="py-4 space-y-4">
    <div class="px-4">
      <AppPageHeader title="Users" icon="tabler:users" description="Search and edit users.">
      <template #leading>
        <!-- Only show back on mobile; desktop has the admin left pane. -->
        <Button
          class="md:hidden"
          text
          severity="secondary"
          aria-label="Back"
          @click="navigateTo('/admin')"
        >
          <template #icon>
            <Icon name="tabler:chevron-left" aria-hidden="true" />
          </template>
        </Button>
      </template>
      </AppPageHeader>
    </div>

    <div class="px-4">
      <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Banned users</div>
            <div class="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
              Site admins can unban accounts here.
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button
              :label="bannedOpen ? 'Hide' : 'Show'"
              severity="secondary"
              size="small"
              :loading="bannedLoading"
              :disabled="bannedLoading"
              @click="toggleBannedOpen"
            />
            <Button
              label="Refresh"
              severity="secondary"
              size="small"
              :loading="bannedLoading"
              :disabled="bannedLoading || !bannedOpen"
              @click="refreshBannedUsers"
            >
              <template #icon>
                <Icon name="tabler:refresh" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <div v-if="bannedOpen" class="mt-4 space-y-3">
          <div class="flex items-center gap-2">
            <InputText
              v-model="bannedQuery"
              class="w-full"
              placeholder="Filter banned users (username, name, email, phone)…"
              @keydown.enter.prevent="refreshBannedUsers"
            />
            <Button
              label="Filter"
              severity="secondary"
              :loading="bannedLoading"
              :disabled="bannedLoading"
              @click="refreshBannedUsers"
            />
          </div>

          <AppInlineAlert v-if="bannedError" severity="danger">{{ bannedError }}</AppInlineAlert>

          <div v-if="!bannedLoading && bannedUsers.length === 0" class="text-sm text-gray-600 dark:text-gray-300">
            No banned users.
          </div>

          <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div v-for="u in bannedUsers" :key="u.id" class="bg-white/60 dark:bg-zinc-950/20 px-4 py-3">
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-3">
                  <AppUserAvatar :user="u" size-class="h-9 w-9" bg-class="moh-surface" />
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="font-semibold truncate">
                        {{ u.name || u.username || 'User' }}
                      </div>
                      <Tag value="Banned" severity="danger" class="!text-xs" />
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
                      <span v-if="u.username">@{{ u.username }}</span>
                      <span v-else class="italic">username not set</span>
                    </div>
                    <div v-if="u.bannedReason" class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      Reason: <span class="font-medium">{{ u.bannedReason }}</span>
                    </div>
                    <div v-if="u.bannedAt" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
                      Banned at: {{ formatDateTime(u.bannedAt) }}
                    </div>
                  </div>
                </div>

                <Button
                  label="Unban"
                  severity="secondary"
                  size="small"
                  :loading="unbanLoadingId === u.id"
                  :disabled="Boolean(unbanLoadingId)"
                  @click="unbanUser(u)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
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
        severity="secondary"
        :loading="searching"
        :disabled="searching"
        @click="runUserSearch()"
      >
        <template #icon>
          <Icon name="tabler:search" aria-hidden="true" />
        </template>
      </Button>
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
                  <Tag v-if="u.bannedAt" value="Banned" severity="danger" class="!text-xs" />
                  <AppVerifiedBadge
                    :status="u.verifiedStatus"
                    :premium="u.premium"
                    :premium-plus="u.premiumPlus"
                    :is-organization="u.isOrganization"
                    :steward-badge-enabled="u.stewardBadgeEnabled ?? true"
                  />
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
            <Icon name="tabler:pencil" aria-hidden="true" />
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
              <Icon
                v-else-if="usernameAvailability === 'available' || usernameAvailability === 'same'"
                name="tabler:check"
                class="text-green-600"
                aria-hidden="true"
              />
              <Icon
                v-else-if="usernameAvailability === 'taken' || usernameAvailability === 'invalid'"
                name="tabler:x"
                class="text-red-600"
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
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Organization account</label>
          <div class="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <Checkbox v-model="editIsOrganization" binary inputId="moh-admin-is-org" />
            <div class="min-w-0">
              <label for="moh-admin-is-org" class="block text-sm font-semibold text-gray-900 dark:text-gray-50">
                Organization account
              </label>
              <div class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                Shows an Organization badge and a squircle avatar in clients.
              </div>
            </div>
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
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Email verification</div>

          <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">Email</div>
            <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
              {{ editingUser?.email || '—' }}
            </div>

            <div class="text-xs text-gray-500 dark:text-gray-400">Email status</div>
            <div class="text-sm text-gray-800 dark:text-gray-200">
              <Tag
                :value="editingUser?.email ? (editingUser?.emailVerifiedAt ? 'Verified' : 'Unverified') : 'No email'"
                :severity="!editingUser?.email ? 'secondary' : editingUser?.emailVerifiedAt ? 'success' : 'warning'"
                class="!text-xs"
              />
            </div>

            <div class="text-xs text-gray-500 dark:text-gray-400">Email verified at</div>
            <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
              {{ emailVerifiedAtLabel }}
            </div>

            <div class="text-xs text-gray-500 dark:text-gray-400">Verification requested</div>
            <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
              {{ emailVerificationRequestedAtLabel }}
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <Button
              label="Unverify email"
              severity="danger"
              size="small"
              :loading="emailAdminSaving"
              :disabled="emailAdminSaving || !editingUser?.email || !editingUser?.emailVerifiedAt"
              @click="unverifyEmail"
            />
            <div class="text-xs text-gray-600 dark:text-gray-300">
              Marks the email as unverified and invalidates existing verification links.
            </div>
          </div>

          <AppInlineAlert v-if="emailAdminError" class="mt-3" severity="danger">
            {{ emailAdminError }}
          </AppInlineAlert>
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

        <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Account ban</div>
          <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm text-gray-700 dark:text-gray-200">
              <Tag
                :value="editingUser?.bannedAt ? 'Banned' : 'Not banned'"
                :severity="editingUser?.bannedAt ? 'danger' : 'secondary'"
                class="!text-xs"
              />
              <span v-if="editingUser?.bannedAt" class="ml-2 text-xs text-gray-600 dark:text-gray-300 font-mono">
                {{ formatDateTime(editingUser?.bannedAt) }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <Button
                v-if="editingUser?.bannedAt"
                label="Unban"
                severity="secondary"
                size="small"
                :loading="banSaving"
                :disabled="banSaving"
                @click="unbanEditingUser"
              />
              <Button
                v-else
                label="Ban user"
                severity="danger"
                size="small"
                :loading="banSaving"
                :disabled="banSaving"
                @click="banEditingUser"
              />
            </div>
          </div>

          <div v-if="!editingUser?.bannedAt" class="mt-3 space-y-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Reason (optional)
            </label>
            <Textarea v-model="banReason" class="w-full" rows="2" autoResize :maxlength="500" placeholder="Internal note for admins…" />
          </div>

          <div v-if="editingUser?.bannedReason" class="mt-3 text-xs text-gray-600 dark:text-gray-300">
            Current reason: <span class="font-medium">{{ editingUser.bannedReason }}</span>
          </div>

          <AppInlineAlert v-if="banError" class="mt-3" severity="danger">
            {{ banError }}
          </AppInlineAlert>
        </div>

        <AppInlineAlert v-if="editError" severity="danger">
          {{ editError }}
        </AppInlineAlert>
      </div>

      <template #footer>
        <Button label="Cancel" text severity="secondary" :disabled="saving" @click="editOpen = false" />
        <Button
          label="Save"
          :loading="saving"
          :disabled="saving || !editingUser || !canSave"
          @click="saveUser()"
        >
          <template #icon>
            <Icon name="tabler:check" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </Dialog>
  </div>
  </AppPageContent>
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
  email: string | null
  emailVerifiedAt: string | null
  emailVerificationRequestedAt: string | null
  username: string | null
  usernameIsSet: boolean
  name: string | null
  bio: string | null
  avatarUrl?: string | null
  siteAdmin: boolean
  bannedAt: string | null
  bannedReason: string | null
  bannedByAdminId: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
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
const emailAdminError = ref<string | null>(null)
const emailAdminSaving = ref(false)
const banReason = ref('')
const banSaving = ref(false)
const banError = ref<string | null>(null)

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
type MembershipTier = 'none' | 'premium' | 'premiumPlus'
const editMembership = ref<MembershipTier>('none')
const editVerifiedStatus = ref<AdminUser['verifiedStatus']>('none')
const editIsOrganization = ref(false)

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
const emailVerifiedAtLabel = computed(() => formatDateTime(editingUser.value?.emailVerifiedAt))
const emailVerificationRequestedAtLabel = computed(() => formatDateTime(editingUser.value?.emailVerificationRequestedAt))

function openEdit(u: AdminUser) {
  editingUser.value = u
  editError.value = null
  emailAdminError.value = null
  banError.value = null
  banReason.value = ''
  editPhone.value = u.phone
  editUsername.value = u.username ?? ''
  editName.value = u.name ?? ''
  editBio.value = u.bio ?? ''
  editMembership.value = u.premiumPlus ? 'premiumPlus' : u.premium ? 'premium' : 'none'
  editVerifiedStatus.value = u.verifiedStatus ?? 'none'
  editIsOrganization.value = Boolean(u.isOrganization)
  resetUsernameCheck()
  editOpen.value = true
}

function toggleBannedOpen() {
  bannedOpen.value = !bannedOpen.value
  if (bannedOpen.value) void refreshBannedUsers()
}

async function refreshBannedUsers() {
  if (bannedLoading.value) return
  bannedLoading.value = true
  bannedError.value = null
  try {
    const res = await apiFetch<AdminUser[]>('/admin/users/banned', {
      method: 'GET',
      query: { q: bannedQuery.value.trim(), limit: 25 },
    })
    bannedUsers.value = res.data ?? []
  } catch (e: unknown) {
    bannedError.value = getApiErrorMessage(e) || 'Failed to load banned users.'
  } finally {
    bannedLoading.value = false
  }
}

async function unbanUser(u: AdminUser) {
  if (unbanLoadingId.value) return
  const ok = window.confirm(`Unban ${u.username ? `@${u.username}` : 'this user'}?`)
  if (!ok) return
  unbanLoadingId.value = u.id
  try {
    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/unban`, {
      method: 'POST',
    })
    // remove from banned list
    bannedUsers.value = bannedUsers.value.filter((x) => x.id !== u.id)
    // update search results in-place if present
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    if (editingUser.value?.id === u.id) editingUser.value = updated
  } catch (e: unknown) {
    bannedError.value = getApiErrorMessage(e) || 'Failed to unban user.'
  } finally {
    unbanLoadingId.value = null
  }
}

async function banEditingUser() {
  const u = editingUser.value
  if (!u) return
  if (banSaving.value) return
  const ok = window.confirm(
    `Ban ${u.username ? `@${u.username}` : 'this user'}?\n\nThey will be logged out immediately and will not be able to log in.`,
  )
  if (!ok) return
  banSaving.value = true
  banError.value = null
  try {
    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/ban`, {
      method: 'POST',
      body: { reason: banReason.value.trim() ? banReason.value.trim() : undefined },
    })
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    editingUser.value = updated
    // keep the banned list fresh if it’s open
    if (bannedOpen.value) void refreshBannedUsers()
  } catch (e: unknown) {
    banError.value = getApiErrorMessage(e) || 'Failed to ban user.'
  } finally {
    banSaving.value = false
  }
}

async function unbanEditingUser() {
  const u = editingUser.value
  if (!u) return
  if (banSaving.value) return
  const ok = window.confirm(`Unban ${u.username ? `@${u.username}` : 'this user'}?`)
  if (!ok) return
  banSaving.value = true
  banError.value = null
  try {
    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/unban`, {
      method: 'POST',
    })
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    editingUser.value = updated
    if (bannedOpen.value) void refreshBannedUsers()
  } catch (e: unknown) {
    banError.value = getApiErrorMessage(e) || 'Failed to unban user.'
  } finally {
    banSaving.value = false
  }
}

async function unverifyEmail() {
  const u = editingUser.value
  if (!u) return
  if (!u.email) return
  if (!u.emailVerifiedAt) return
  if (emailAdminSaving.value) return

  // Safety: admins can clear verification, but only the user can re-verify.
  const ok = window.confirm(
    `Unverify ${u.email}?\n\nThis will mark the email as unverified and invalidate existing verification links.\nThe user will need to verify again themselves.`,
  )
  if (!ok) return

  emailAdminSaving.value = true
  emailAdminError.value = null
  try {
    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/email/unverify`, {
      method: 'POST',
    })
    // Update results list in-place.
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    editingUser.value = updated
  } catch (e: unknown) {
    emailAdminError.value = getApiErrorMessage(e) || 'Failed to unverify email.'
  } finally {
    emailAdminSaving.value = false
  }
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
        isOrganization: editIsOrganization.value,
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


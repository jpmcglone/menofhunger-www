<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Follow visibility</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Choose who can see your follower/following counts and lists.
      </div>
    </div>

    <Select
      v-model="followVisibilityInput"
      :options="followVisibilityOptions"
      option-label="label"
      option-value="value"
      placeholder="Select..."
      class="w-full"
      :disabled="privacySaving"
    />

    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Birthday visibility</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Control whether your profile shows your full birthday, month/day only, or nothing.
      </div>
    </div>

    <Select
      v-model="birthdayVisibilityInput"
      :options="birthdayVisibilityOptions"
      option-label="label"
      option-value="value"
      placeholder="Select..."
      class="w-full"
      :disabled="privacySaving"
    />

    <div class="flex items-center gap-3">
      <Button
        label="Save"
        severity="secondary"
        :loading="privacySaving"
        :disabled="privacySaving || !privacyDirty"
        @click="savePrivacy"
      >
        <template #icon>
          <Icon name="tabler:check" aria-hidden="true" />
        </template>
      </Button>
      <div v-if="privacySaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
    </div>

    <div v-if="privacyError" class="text-sm text-red-700 dark:text-red-300">
      {{ privacyError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuth'
import { useFormSave } from '~/composables/useFormSave'
import { useSyncUserCaches } from '~/composables/settings/useSyncUserCaches'

type FollowVisibility = 'all' | 'verified' | 'premium' | 'none'
type BirthdayVisibility = 'none' | 'monthDay' | 'full'

const { user: authUser } = useAuth()
const { apiFetchData } = useApiClient()
const syncUserCaches = useSyncUserCaches()

const followVisibilityOptions: Array<{ label: string; value: FollowVisibility }> = [
  { label: 'Public (anyone)', value: 'all' },
  { label: 'Verified members', value: 'verified' },
  { label: 'Premium members', value: 'premium' },
  { label: 'Only me', value: 'none' },
]
const birthdayVisibilityOptions: Array<{ label: string; value: BirthdayVisibility }> = [
  { label: 'Hide birthday', value: 'none' },
  { label: 'Month and day only', value: 'monthDay' },
  { label: 'Full birthday (with year)', value: 'full' },
]

const followVisibilityInput = ref<FollowVisibility>('all')
const birthdayVisibilityInput = ref<BirthdayVisibility>('monthDay')
const privacyError = ref<string | null>(null)

watch(
  () => authUser.value?.followVisibility,
  (v) => {
    followVisibilityInput.value = (v || 'all') as FollowVisibility
  },
  { immediate: true },
)

watch(
  () => authUser.value?.birthdayVisibility,
  (v) => {
    birthdayVisibilityInput.value = (v || 'monthDay') as BirthdayVisibility
  },
  { immediate: true },
)

const privacyDirty = computed(() =>
  (authUser.value?.followVisibility || 'all') !== followVisibilityInput.value ||
  (authUser.value?.birthdayVisibility || 'monthDay') !== birthdayVisibilityInput.value,
)

const { save: savePrivacyRequest, saving: privacySaving, saved: privacySaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const result = await apiFetchData<{ user: AuthUser }>('/users/me/settings', {
      method: 'PATCH',
      body: {
        followVisibility: followVisibilityInput.value,
        birthdayVisibility: birthdayVisibilityInput.value,
      },
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save privacy.',
    onError: (message) => {
      privacyError.value = message
    },
  },
)

async function savePrivacy() {
  privacyError.value = null
  privacySaved.value = false
  await savePrivacyRequest()
}
</script>

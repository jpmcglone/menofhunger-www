<template>
  <section class="w-full max-w-xl space-y-6">
    <AppPageHeader title="Settings" icon="pi-cog" description="Account settings for your profile." />

    <Card>
      <template #title>Username</template>
      <template #content>
        <div class="space-y-4">
          <div class="space-y-3">
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
                {{ authUser?.usernameIsSet ? 'Username (case change only)' : 'Choose a username' }}
              </label>

              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500 dark:text-gray-400">@</span>
                <InputText
                  v-model="usernameInput"
                  class="w-full"
                  placeholder="your_handle"
                  autocomplete="off"
                  :disabled="saving"
                />

                <div class="shrink-0 w-8 flex items-center justify-center">
                  <i v-if="checking" class="pi pi-spin pi-spinner text-gray-500" aria-hidden="true" />
                  <i
                    v-else-if="availability === 'available' || availability === 'same'"
                    class="pi pi-check text-green-600"
                    aria-hidden="true"
                  />
                  <i
                    v-else-if="availability === 'taken' || availability === 'invalid'"
                    class="pi pi-times text-red-600"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div v-if="helperText" class="text-sm" :class="helperToneClass">
                {{ helperText }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                6–15 characters. Must start with a letter. Letters, numbers, underscores only.
                <span v-if="authUser?.usernameIsSet" class="ml-1">
                  You can only change capitalization of your current username.
                </span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <Button
                label="Save"
                icon="pi pi-check"
                :loading="saving"
                :disabled="saving || (authUser?.usernameIsSet ? availability !== 'same' : availability !== 'available')"
                @click="save"
              />
              <div v-if="saved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Settings'
})

usePageSeo({
  title: 'Settings',
  description: 'Account settings.',
  noindex: true
})

type Availability = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid' | 'same'

const { user: authUser } = useAuth()

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'

const usernameInput = ref('')
const availability = ref<Availability>('unknown')
const checking = computed(() => availability.value === 'checking')
const helperText = ref<string | null>(null)
const helperToneClass = computed(() => {
  if (availability.value === 'available' || availability.value === 'same') return 'text-green-700 dark:text-green-300'
  if (availability.value === 'taken' || availability.value === 'invalid') return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
})

const saving = ref(false)
const saved = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function resetHelper() {
  helperText.value = null
  availability.value = 'unknown'
  saved.value = false
}

async function checkAvailability(username: string) {
  availability.value = 'checking'
  helperText.value = null

  try {
    const result = await apiFetchData<{ available: boolean; normalized: string | null; error?: string }>(
      '/users/username/available',
      {
      method: 'GET',
      query: { username }
      }
    )

    if (result.available) {
      availability.value = 'available'
      helperText.value = `Available: @${result.normalized}`
    } else {
      availability.value = result.error ? 'invalid' : 'taken'
      helperText.value = result.error || 'That username is taken.'
    }
  } catch (e: unknown) {
    availability.value = 'unknown'
    helperText.value = getApiErrorMessage(e) || 'Failed to check username.'
  }
}

watch(
  usernameInput,
  (value) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    resetHelper()

    const trimmed = value.trim()
    if (!trimmed) return

    const currentLower = (authUser.value?.username ?? '').trim().toLowerCase()
    if (authUser.value?.usernameIsSet && currentLower && trimmed.toLowerCase() === currentLower) {
      availability.value = 'same'
      helperText.value = 'Unchanged (case-only edit).'
      return
    }

    debounceTimer = setTimeout(() => {
      void checkAvailability(trimmed)
    }, 500)
  },
  { flush: 'post' }
)

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

async function save() {
  saved.value = false
  helperText.value = null

  const username = usernameInput.value.trim()
  if (!username) return

  if (authUser.value?.usernameIsSet) {
    const currentLower = (authUser.value?.username ?? '').trim().toLowerCase()
    if (!currentLower || username.toLowerCase() !== currentLower) {
      availability.value = 'invalid'
      helperText.value = 'You can only change capitalization of your current username.'
      return
    }
  }

  saving.value = true
  try {
    const result = await apiFetchData<{ user: any }>('/users/me/username', {
      method: 'PATCH',
      body: { username },
    })

    // Update client auth state with latest user data.
    authUser.value = result.user ?? authUser.value
    saved.value = true
  } catch (e: unknown) {
    helperText.value = getApiErrorMessage(e) || 'Failed to save username.'
  } finally {
    saving.value = false
  }
}
</script>


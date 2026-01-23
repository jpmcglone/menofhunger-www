<template>
  <section class="w-full max-w-xl space-y-6">
    <header class="space-y-2">
      <div class="flex items-center gap-2">
        <i class="pi pi-cog" aria-hidden="true" />
        <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Account settings for your profile.
      </p>
    </header>

    <Card>
      <template #title>Username</template>
      <template #content>
        <div class="space-y-4">
          <div v-if="authUser?.usernameIsSet" class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-gray-200">
            <div class="font-semibold">Username already set</div>
            <div class="mt-1">
              Your username is <span class="font-mono">@{{ authUser.username }}</span>.
            </div>
          </div>

          <div v-else class="space-y-3">
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Choose a username</label>

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
                    v-else-if="availability === 'available'"
                    class="pi pi-check text-green-600"
                    aria-hidden="true"
                  />
                  <i
                    v-else-if="availability === 'taken'"
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
              </div>
            </div>

            <div class="flex items-center gap-3">
              <Button
                label="Save"
                icon="pi pi-check"
                :loading="saving"
                :disabled="saving || availability !== 'available'"
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

type Availability = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid'

const { user: authUser, me } = useAuth()
if (authUser.value === null) {
  // Ensure we have user data for usernameIsSet display.
  await me()
}

const config = useRuntimeConfig()
const apiBaseUrl = (config.public.apiBaseUrl as string) || ''

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  return `${base}/${p}`
}

const usernameInput = ref('')
const availability = ref<Availability>('unknown')
const checking = computed(() => availability.value === 'checking')
const helperText = ref<string | null>(null)
const helperToneClass = computed(() => {
  if (availability.value === 'available') return 'text-green-700 dark:text-green-300'
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
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const url = joinUrl(apiBaseUrl, '/users/username/available')
    const result = await $fetch<{ data: { available: boolean; normalized: string | null; error?: string } }>(url, {
      method: 'GET',
      query: { username },
      credentials: 'include',
      headers
    })

    if (result.data.available) {
      availability.value = 'available'
      helperText.value = `Available: @${result.data.normalized}`
    } else {
      availability.value = result.data.error ? 'invalid' : 'taken'
      helperText.value = result.data.error || 'That username is taken.'
    }
  } catch (e: unknown) {
    availability.value = 'unknown'
    helperText.value = e instanceof Error ? e.message : 'Failed to check username.'
  }
}

watch(
  usernameInput,
  (value) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    resetHelper()

    const trimmed = value.trim()
    if (!trimmed) return

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

  saving.value = true
  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const url = joinUrl(apiBaseUrl, '/users/me/username')
    const result = await $fetch<{ data: { ok: boolean; user?: any; error?: string } }>(url, {
      method: 'PATCH',
      body: { username },
      credentials: 'include',
      headers
    })

    if (!result.data.ok) {
      availability.value = 'invalid'
      helperText.value = result.data.error || 'Could not save username.'
      return
    }

    // Update client auth state with latest user data.
    authUser.value = result.data.user ?? authUser.value
    saved.value = true
  } catch (e: unknown) {
    helperText.value = e instanceof Error ? e.message : 'Failed to save username.'
  } finally {
    saving.value = false
  }
}
</script>


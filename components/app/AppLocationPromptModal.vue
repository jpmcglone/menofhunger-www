<template>
  <AppModal
    v-if="open"
    v-model="open"
    title="Find Men Near You"
    max-width-class="max-w-sm"
    :dismissable-mask="false"
    :show-close="false"
    max-height="min(90vh, 28rem)"
  >
    <div class="moh-gutter-x py-5 flex flex-col gap-5">
      <p class="text-sm moh-text-muted leading-relaxed">
        Add your ZIP code to discover and connect with other men in your state.
      </p>

      <!-- ZIP input -->
      <div class="flex flex-col gap-2">
        <label for="location-zip-input" class="sr-only">ZIP code</label>
        <InputText
          id="location-zip-input"
          v-model="zipInput"
          inputmode="numeric"
          maxlength="5"
          placeholder="5-digit ZIP code"
          class="w-full text-center text-lg font-semibold tracking-widest"
          :invalid="previewNotFound"
          autofocus
          @input="onZipInput"
        />

        <!-- State preview -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div v-if="preview" class="flex items-center justify-center gap-2 py-1">
            <ClientOnly>
              <AppStateShape
                v-if="preview.state"
                :state="preview.state"
                class="h-6 w-6 shrink-0 opacity-80"
              />
            </ClientOnly>
            <span class="text-sm font-medium moh-text">{{ preview.stateDisplay ?? preview.state }}</span>
            <span v-if="preview.city" class="text-sm moh-text-muted">· {{ preview.city }}</span>
          </div>
          <div v-else-if="previewLoading" class="flex justify-center py-1">
            <Icon name="tabler:loader-2" class="animate-spin moh-text-muted" />
          </div>
          <div v-else-if="previewNotFound" class="flex justify-center py-1">
            <span class="text-xs text-red-500">ZIP code not found</span>
          </div>
        </Transition>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-2">
        <Button
          label="Set my location"
          class="w-full"
          :disabled="!preview || saving"
          :loading="saving"
          @click="save"
        />
        <Button
          label="Skip for now"
          severity="secondary"
          text
          class="w-full"
          :disabled="skipping"
          :loading="skipping"
          @click="skip"
        />
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import type { LocationPreviewResponse, UserDto } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const { user } = useAuth()
const { apiFetchData } = useApiClient()

// Show when logged in, fully onboarded, no location set, and user hasn't skipped.
// The OnboardingGate takes precedence and includes a ZIP field — defer until that is done.
const open = computed({
  get: () => {
    const u = user.value
    if (!u?.id) return false
    const needsOnboarding = !u.usernameIsSet || !u.birthdate || !Array.isArray(u.interests) || u.interests.length < 1 || !u.menOnlyConfirmed
    if (needsOnboarding) return false
    return !u.locationZip && !u.locationPromptSkipped
  },
  set: () => {},
})

const zipInput = ref('')
const preview = ref<LocationPreviewResponse | null>(null)
const previewLoading = ref(false)
const previewNotFound = ref(false)
const saving = ref(false)
const skipping = ref(false)

let previewDebounce: ReturnType<typeof setTimeout> | null = null

function onZipInput() {
  preview.value = null
  previewNotFound.value = false
  if (previewDebounce) clearTimeout(previewDebounce)
  const zip = zipInput.value.replace(/\D/g, '').slice(0, 5)
  zipInput.value = zip
  if (zip.length !== 5) return
  previewDebounce = setTimeout(() => void fetchPreview(zip), 300)
}

async function fetchPreview(zip: string) {
  previewLoading.value = true
  previewNotFound.value = false
  try {
    preview.value = await apiFetchData<LocationPreviewResponse>('/users/location-preview', {
      method: 'GET',
      query: { zip },
    })
  } catch {
    preview.value = null
    previewNotFound.value = true
  } finally {
    previewLoading.value = false
  }
}

async function save() {
  if (!preview.value) return
  saving.value = true
  try {
    const updated = await apiFetchData<{ user: UserDto }>('/users/me/profile', {
      method: 'PATCH',
      body: { locationQuery: zipInput.value },
    })
    if (updated?.user && user.value) {
      Object.assign(user.value, updated.user)
    }
    if (preview.value.state) {
      await navigateTo({ path: '/l', query: { state: preview.value.state } })
    }
  } catch (_e) {
    console.error('Failed to save location:', getApiErrorMessage(_e))
  } finally {
    saving.value = false
  }
}

async function skip() {
  skipping.value = true
  try {
    const updated = await apiFetchData<{ user: UserDto }>('/users/me/skip-location-prompt', {
      method: 'POST',
    })
    if (updated?.user && user.value) {
      Object.assign(user.value, updated.user)
    }
  } catch (_e) {
    console.error('Failed to skip location prompt:', getApiErrorMessage(_e))
  } finally {
    skipping.value = false
  }
}
</script>

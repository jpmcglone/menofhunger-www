<template>
  <AppModal
    v-if="open && !cropOpen"
    v-model="open"
    title="Your profile"
    max-width-class="max-w-sm"
    :dismissable-mask="false"
    :show-close="true"
    max-height="min(90vh, 32rem)"
  >
    <div class="moh-gutter-x py-5 flex flex-col items-center gap-5">
      <label class="relative cursor-pointer">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Choose profile photo"
          class="sr-only"
          :disabled="saving || cropOpen"
          @change="onPick"
        >
        <AppAvatarCircle
          :src="avatarUser?.avatarUrl"
          :avatar-video="avatarUser?.avatarVideo"
          :name="avatarUser?.name"
          :username="avatarUser?.username"
          :is-organization="avatarUser?.isOrganization"
          size-class="h-24 w-24 text-2xl"
          :show-presence="false"
        />
        <span
          class="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
          aria-hidden="true"
        >
          <Icon name="tabler:camera" class="text-sm" />
        </span>
      </label>

      <div class="w-full space-y-2">
        <label class="text-sm font-medium moh-text-muted">Display name</label>
        <InputText
          v-model="displayName"
          class="w-full"
          placeholder="How you appear"
          maxlength="50"
          autocomplete="name"
          :disabled="saving"
        />
        <p class="text-xs moh-text-muted">A first name is enough.</p>
      </div>

      <details class="w-full space-y-3">
        <summary class="min-h-11 flex items-center cursor-pointer font-medium">More details <span class="ml-1 moh-text-muted">(optional)</span></summary>
        <label class="block space-y-2"><span>Recovery email</span><InputText v-model="email" type="email" autocomplete="email" class="w-full" :disabled="saving" /><span class="block text-xs moh-text-muted">Helps if you lose access to your phone number.</span></label>
        <label class="block space-y-2"><span>ZIP code</span><InputText v-model="zipCode" inputmode="numeric" autocomplete="postal-code" maxlength="5" class="w-full" :disabled="saving" /></label>
        <label v-if="!user?.hasRecruiter" class="block space-y-2"><span>Referral code</span><InputText v-model="referralCode" autocomplete="off" class="w-full" :disabled="saving" /></label>
        <label class="block space-y-2"><span>How did you hear about us?</span><Select v-model="heardAboutUs" :options="HEARD_ABOUT_US_OPTIONS" option-label="label" option-value="value" placeholder="Select one" show-clear class="w-full" :disabled="saving" /></label>
        <InputText v-if="heardAboutUs === 'other'" v-model="heardAboutOther" aria-label="How you found us" placeholder="Tell us how you found us" maxlength="80" class="w-full" :disabled="saving" />
      </details>
      <p v-if="error" class="w-full text-xs text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
    <template #footer>
      <Button
        label="Done"
        class="w-full !bg-black !text-white !border-black dark:!bg-white dark:!text-black dark:!border-white"
        rounded
        :disabled="saving || cropOpen"
        :loading="saving"
        @click="save"
      />
    </template>
  </AppModal>
  <AppProfileEditAvatarCropDialog
    v-model="cropOpen"
    :file="cropFile"
    :disabled="saving"
    :is-organization="user?.isOrganization"
    @cancel="clearCrop"
    @cropped="onCropped"
  />
</template>

<script setup lang="ts">
import { HEARD_ABOUT_US_OPTIONS } from '~/utils/onboarding'
import type { HeardAboutUs, UserDto  } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { putPresignedFile } from '~/utils/put-presigned-file'

const { step, finishProfile } = useFirstRunFlow()
const { capturedReferralCode, markReferralApplied } = useReferralCapture()
const { user, patchUser } = useAuth()
const { apiFetchData } = useApiClient()

const open = computed({
  get: () => step.value === 'profile',
  set: (value) => { if (!value && !saving.value) finishProfile() },
})

const displayName = ref('')
const email = ref('')
const zipCode = ref('')
const referralCode = ref('')
const heardAboutUs = ref<HeardAboutUs | null>(null)
const heardAboutOther = ref('')
const previewUrl = ref<string | null>(null)
const pendingFile = ref<File | null>(null)
const cropOpen = ref(false)
const cropFile = ref<File | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)

const avatarUser = computed(() => {
  if (!user.value) return null
  return {
    ...user.value,
    name: displayName.value || user.value.name,
    avatarUrl: previewUrl.value || user.value.avatarUrl,
    avatarVideo: previewUrl.value ? null : user.value.avatarVideo,
  }
})

watch(
  () => step.value,
  (next) => {
    clearCrop()
    if (next !== 'profile') return
    displayName.value = user.value?.name ?? ''
    email.value = user.value?.email ?? ''
    zipCode.value = user.value?.locationZip ?? ''
    referralCode.value = capturedReferralCode.value
    heardAboutUs.value = user.value?.heardAboutUs ?? null
    heardAboutOther.value = user.value?.heardAboutUsOther ?? ''
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
    pendingFile.value = null
    error.value = null
  },
  { immediate: true },
)

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || saving.value) return
  error.value = null
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    error.value = 'Unsupported image type. Please upload a JPG, PNG, or WebP.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Avatar is too large (max 5MB).'
    return
  }
  cropFile.value = file
  cropOpen.value = true
}

function clearCrop() {
  cropOpen.value = false
  cropFile.value = null
}

function onCropped(file: File) {
  pendingFile.value = file
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  clearCrop()
}

async function save() {
  if (saving.value || cropOpen.value) return
  saving.value = true
  error.value = null
  try {
    if (pendingFile.value) {
      const file = pendingFile.value
      const init = await apiFetchData<{
        key: string
        uploadUrl: string
        headers: Record<string, string>
        maxBytes?: number
      }>('/uploads/avatar/init', {
        method: 'POST',
        body: { contentType: file.type },
      })
      if (init.maxBytes && file.size > init.maxBytes) {
        throw new Error('That photo is too large. Try another.')
      }
      await putPresignedFile(init.uploadUrl, init.headers, file)
      const committed = await apiFetchData<{ user: UserDto }>('/uploads/avatar/commit', {
        method: 'POST',
        body: { key: init.key },
      })
      if (committed?.user) patchUser(committed.user)
      pendingFile.value = null
    }

    const trimmed = displayName.value.trim()
    if (trimmed && trimmed !== (user.value?.name ?? '')) {
      const updated = await apiFetchData<{ user: UserDto }>('/users/me/profile', {
        method: 'PATCH',
        body: { name: trimmed },
      })
      if (updated?.user) patchUser(updated.user)
    }

    const details: Record<string, unknown> = {}
    if (email.value.trim() && email.value.trim() !== user.value?.email) details.email = email.value.trim()
    if (zipCode.value.trim() && zipCode.value.trim() !== user.value?.locationZip) details.locationQuery = zipCode.value.trim()
    if (heardAboutUs.value) {
      details.heardAboutUs = heardAboutUs.value
      details.heardAboutUsOther = heardAboutUs.value === 'other' ? heardAboutOther.value.trim() : null
    }
    if (Object.keys(details).length) {
      const result = await apiFetchData<{ user: UserDto }>('/users/me/onboarding', { method: 'PATCH', body: details })
      patchUser(result.user)
    }
    if (referralCode.value.trim() && !user.value?.hasRecruiter) {
      await apiFetchData('/billing/referral/set-recruiter', { method: 'POST', body: { code: referralCode.value.trim() } })
      markReferralApplied(referralCode.value.trim())
      patchUser({ hasRecruiter: true })
    }
    finishProfile()
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || "Couldn't save your profile."
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

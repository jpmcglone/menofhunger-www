<template>
  <AppFormModal
    :model-value="modelValue"
    title="Edit profile"
    :saving="saving"
    :can-submit="isSelf"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="saveProfile"
  >
    <div class="space-y-4">
      <!-- Banner: edge-to-edge, no corner radius. Avatar overflows below. -->
      <div class="relative shrink-0 border-0 border-b border-gray-200 bg-white dark:border-zinc-800 dark:bg-black/20">
        <div class="overflow-hidden">
          <div class="relative">
            <div class="aspect-[3/1] w-full min-h-0 shrink-0 overflow-hidden bg-gray-200 dark:bg-zinc-900">
              <img
                v-if="editBannerPreviewUrl"
                :src="editBannerPreviewUrl"
                alt=""
                class="h-full w-full object-contain"
                loading="lazy"
                decoding="async"
              >
            </div>

            <div class="absolute right-3 top-3">
              <Button
                rounded
                severity="secondary"
                :aria-label="pendingBannerFile ? 'Reset banner change' : 'Edit banner'"
                :disabled="saving || !isSelf"
                @click="pendingBannerFile ? clearPendingBanner() : openBannerPicker()"
              >
                <template #icon>
                  <Icon :name="pendingBannerFile ? 'tabler:x' : 'tabler:camera'" aria-hidden="true" />
                </template>
              </Button>
            </div>

            <div
              v-if="pendingBannerFile"
              class="absolute inset-x-0 bottom-0 px-3 py-2"
            >
              <div
                class="mx-auto w-fit rounded-lg bg-black/45 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                style="text-shadow: 0 1px 2px rgba(0,0,0,.55);"
              >
                Pending
              </div>
            </div>
          </div>
        </div>

        <div class="absolute left-4 bottom-0 z-10 translate-y-1/2">
          <div class="relative h-28 w-28 overflow-hidden rounded-full bg-gray-200 ring-4 ring-white dark:bg-zinc-800 dark:ring-black">
            <img
              v-if="editAvatarPreviewUrl"
              :src="editAvatarPreviewUrl"
              alt=""
              class="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            >

            <div class="absolute inset-0 flex items-center justify-center">
              <Button
                rounded
                severity="secondary"
                :aria-label="pendingAvatarFile ? 'Reset avatar change' : 'Edit avatar'"
                :disabled="saving || !isSelf"
                @click="pendingAvatarFile ? clearPendingAvatar() : openAvatarPicker()"
              >
                <template #icon>
                  <Icon :name="pendingAvatarFile ? 'tabler:x' : 'tabler:camera'" aria-hidden="true" />
                </template>
              </Button>
            </div>

            <div
              v-if="pendingAvatarFile"
              class="absolute inset-x-0 bottom-0 px-2 pb-2"
            >
              <div
                class="mx-auto w-fit rounded-lg bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
                style="text-shadow: 0 1px 2px rgba(0,0,0,.55);"
              >
                Pending
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Spacer so the form doesn't sit under the overhanging avatar -->
      <div class="h-16" aria-hidden="true" />

      <input
        ref="bannerInputEl"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        :disabled="saving || !isSelf"
        @change="onBannerInputChange"
      >
      <input
        ref="avatarInputEl"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        :disabled="saving || !isSelf"
        @change="onAvatarInputChange"
      >

      <AppProfileEditAvatarCropDialog
        v-model="avatarCropOpen"
        :file="avatarCropFile"
        :disabled="saving"
        @cancel="onAvatarCropCancelled"
        @cropped="onAvatarCropped"
      />

      <AppProfileEditBannerCropDialog
        v-model="bannerCropOpen"
        :file="bannerCropFile"
        :disabled="saving"
        @cancel="onBannerCropCancelled"
        @cropped="onBannerCropped"
      />

      <AppFormField label="Name">
        <InputText v-model="editName" class="w-full" :maxlength="50" />
        <template #helper>{{ nameCharCount.display }}</template>
      </AppFormField>

      <AppFormField label="Bio">
        <Textarea
          v-model="editBio"
          class="w-full"
          rows="4"
          autoResize
          :maxlength="160"
          placeholder="Tell people a bit about yourself…"
        />
        <template #helper>{{ bioCharCount.display }}</template>
      </AppFormField>

      <AppInlineAlert v-if="editError" severity="danger">
        {{ editError }}
      </AppInlineAlert>
    </div>
  </AppFormModal>
</template>

<script setup lang="ts">
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import { useFormSubmit } from '~/composables/useFormSubmit'

type PublicProfile = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  premium: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl?: string | null
  bannerUrl?: string | null
}

const props = defineProps<{
  modelValue: boolean
  profile: PublicProfile | null
  isSelf: boolean
  profileAvatarUrl: string | null
  profileBannerUrl: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'patchProfile', patch: Partial<Pick<PublicProfile, 'name' | 'bio' | 'avatarUrl' | 'bannerUrl'>>): void
}>()

const { apiFetchData } = useApiClient()
const { user: authUser } = useAuth()
const { invalidateUserPreviewCache } = useUserPreview()
const usersStore = useUsersStore()

function syncUserCaches(
  nextUser: import('~/composables/useAuth').AuthUser | null | undefined,
  previousUsername?: string | null,
) {
  const prev = (previousUsername ?? '').trim().toLowerCase()
  const next = (nextUser?.username ?? '').trim().toLowerCase()
  if (prev) invalidateUserPreviewCache(prev)
  if (next) invalidateUserPreviewCache(next)
  if (!nextUser?.id) return
  usersStore.upsert({
    id: nextUser.id,
    username: nextUser.username ?? null,
    name: nextUser.name ?? null,
    bio: nextUser.bio ?? null,
    premium: nextUser.premium,
    premiumPlus: nextUser.premiumPlus,
    verifiedStatus: nextUser.verifiedStatus,
    avatarUrl: nextUser.avatarUrl ?? null,
    bannerUrl: nextUser.bannerUrl ?? null,
    pinnedPostId: nextUser.pinnedPostId ?? null,
  })
}

const isSelf = computed(() => Boolean(props.isSelf))
const profileAvatarUrl = computed(() => props.profileAvatarUrl ?? null)
const profileBannerUrl = computed(() => props.profileBannerUrl ?? null)

const editName = ref('')
const editBio = ref('')
const nameCharCount = useFormCharCount(editName, 50)
const bioCharCount = useFormCharCount(editBio, 160)
const editError = ref<string | null>(null)

// We stage avatar changes locally (preview) and only upload/commit when the user hits Save.
const avatarInputEl = ref<HTMLInputElement | null>(null)
const pendingAvatarFile = ref<File | null>(null)
const pendingAvatarPreviewUrl = ref<string | null>(null)

// Banner staged upload
const bannerInputEl = ref<HTMLInputElement | null>(null)
const pendingBannerFile = ref<File | null>(null)
const pendingBannerPreviewUrl = ref<string | null>(null)

// Crop step (Twitter-like): choose file -> crop -> stage cropped file
const avatarCropOpen = ref(false)
const avatarCropFile = ref<File | null>(null)

const editAvatarPreviewUrl = computed(() => pendingAvatarPreviewUrl.value || profileAvatarUrl.value)
const editBannerPreviewUrl = computed(() => pendingBannerPreviewUrl.value || profileBannerUrl.value)

function clearPendingAvatar() {
  pendingAvatarFile.value = null
  if (pendingAvatarPreviewUrl.value) {
    URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
    pendingAvatarPreviewUrl.value = null
  }
  if (avatarInputEl.value) avatarInputEl.value.value = ''
}

function clearPendingBanner() {
  pendingBannerFile.value = null
  if (pendingBannerPreviewUrl.value) {
    URL.revokeObjectURL(pendingBannerPreviewUrl.value)
    pendingBannerPreviewUrl.value = null
  }
  if (bannerInputEl.value) bannerInputEl.value.value = ''
}

function clearAvatarCropState() {
  avatarCropOpen.value = false
  avatarCropFile.value = null
}

function stageAvatarFile(file: File) {
  // Clean up old preview URL (if any).
  if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
  pendingAvatarFile.value = file
  pendingAvatarPreviewUrl.value = URL.createObjectURL(file)
}

function stageBannerFile(file: File) {
  if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
  pendingBannerFile.value = file
  pendingBannerPreviewUrl.value = URL.createObjectURL(file)
}

// Banner crop state
const bannerCropOpen = ref(false)
const bannerCropFile = ref<File | null>(null)

function clearBannerCropState() {
  bannerCropOpen.value = false
  bannerCropFile.value = null
}

function openBannerPicker() {
  if (!isSelf.value) return
  bannerInputEl.value?.click()
}

function onBannerInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  handleBannerSelectedFile(file)
}

function handleBannerSelectedFile(file: File) {
  if (!isSelf.value) return

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(file.type)) {
    editError.value = 'Unsupported image type. Please upload a JPG, PNG, or WebP.'
    clearPendingBanner()
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    editError.value = 'Banner is too large (max 8MB).'
    clearPendingBanner()
    return
  }

  editError.value = null
  bannerCropFile.value = file
  bannerCropOpen.value = true
}

function openCropForAvatarFile(file: File) {
  clearAvatarCropState()
  avatarCropFile.value = file
  avatarCropOpen.value = true
}

function onAvatarCropCancelled() {
  clearAvatarCropState()
  clearPendingAvatar()
}

function onAvatarCropped(file: File) {
  stageAvatarFile(file)
  clearAvatarCropState()
}

function onBannerCropCancelled() {
  clearBannerCropState()
  clearPendingBanner()
}

function onBannerCropped(file: File) {
  stageBannerFile(file)
  clearBannerCropState()
}

function openAvatarPicker() {
  if (!isSelf.value) return
  avatarInputEl.value?.click()
}

function onAvatarInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  handleAvatarSelectedFile(file)
}

function handleAvatarSelectedFile(file: File) {
  if (!isSelf.value) return

  // Basic client-side checks (server also validates).
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(file.type)) {
    editError.value = 'Unsupported image type. Please upload a JPG, PNG, or WebP.'
    clearPendingAvatar()
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    editError.value = 'Avatar is too large (max 5MB).'
    clearPendingAvatar()
    return
  }

  editError.value = null
  // Route through cropper before staging.
  openCropForAvatarFile(file)
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      clearAvatarCropState()
      clearBannerCropState()
      clearPendingAvatar()
      clearPendingBanner()
      return
    }
    editError.value = null
    editName.value = props.profile?.name || ''
    editBio.value = props.profile?.bio || ''
    clearAvatarCropState()
    clearBannerCropState()
    clearPendingAvatar()
    clearPendingBanner()

  }
)

const { submit: saveProfile, submitting: saving } = useFormSubmit(
  async () => {
    if (!isSelf.value) return
    editError.value = null

    // If a banner is staged, upload + commit it first.
    if (pendingBannerFile.value) {
      const file = pendingBannerFile.value
      const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
        '/uploads/banner/init',
        {
          method: 'POST',
          body: { contentType: file.type }
        }
      )

      const putRes = await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: init.headers,
        body: file,
      })
      if (!putRes.ok) throw new Error('Failed to upload banner.')

      const committed = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/uploads/banner/commit', {
        method: 'POST',
        body: { key: init.key },
      })

      const previousUsername = authUser.value?.username ?? null
      authUser.value = committed?.user ?? authUser.value
      syncUserCaches(committed?.user, previousUsername)
      emit('patchProfile', { bannerUrl: committed?.user?.bannerUrl ?? null })
      clearPendingBanner()
    }

    // If an avatar is staged, upload + commit it first.
    if (pendingAvatarFile.value) {
      const file = pendingAvatarFile.value
      const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
        '/uploads/avatar/init',
        {
          method: 'POST',
          body: { contentType: file.type }
        }
      )

      const putRes = await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: init.headers,
        body: file,
      })
      if (!putRes.ok) throw new Error('Failed to upload avatar.')

      const committed = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/uploads/avatar/commit', {
        method: 'POST',
        body: { key: init.key },
      })

      const previousUsername = authUser.value?.username ?? null
      authUser.value = committed.user ?? authUser.value
      syncUserCaches(committed?.user, previousUsername)
      emit('patchProfile', { avatarUrl: committed.user?.avatarUrl ?? null })
      // Avatar is now persisted; clear staged state so UI reflects "applied".
      clearPendingAvatar()
    }

    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body: {
        name: editName.value,
        bio: editBio.value
      }
    })

    // Update profile state (public view) and auth user state (self).
    const u = result.user
    const previousUsername = authUser.value?.username ?? null
    emit('patchProfile', { name: u?.name ?? null, bio: u?.bio ?? null })
    authUser.value = u ?? authUser.value
    syncUserCaches(u, previousUsername)
    emit('update:modelValue', false)
  },
  {
    defaultError: 'Failed to save profile.',
    onError: (message) => {
      editError.value = message
    },
  },
)

onBeforeUnmount(() => {
  clearAvatarCropState()
  clearBannerCropState()
  if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
  if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
})
</script>


<template>
  <section class="w-full max-w-2xl space-y-6">
    <Card>
      <template #content>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex items-start gap-4">
            <div class="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true">
              <img
                v-if="profileAvatarUrl"
                :src="profileAvatarUrl"
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              >
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <div class="text-xl font-bold text-gray-900 dark:text-gray-50">
                  {{ profileName }}
                </div>
                <AppVerifiedBadge :status="profile?.verifiedStatus" />
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                @{{ profile?.username }}
              </div>
            </div>
          </div>

          <div v-if="isSelf" class="flex justify-end">
            <Button label="Edit profile" icon="pi pi-pencil" severity="secondary" @click="editOpen = true" />
          </div>
        </div>

        <div v-if="profile?.bio" class="mt-4 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {{ profile.bio }}
        </div>
        <div v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No bio yet.
        </div>
      </template>
    </Card>

    <Dialog v-model:visible="editOpen" modal header="Edit profile" :draggable="false" :style="{ width: '32rem' }">
      <div class="space-y-4">
        <AppInlineAlert severity="info" title="Changes are staged">
          Your avatar, name, and bio won’t update until you hit <span class="font-semibold">Save</span>.
        </AppInlineAlert>

        <div class="rounded-xl border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-black/20">
          <div class="flex items-center gap-3">
            <div class="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true">
              <img
                v-if="editAvatarPreviewUrl"
                :src="editAvatarPreviewUrl"
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              >
            </div>

            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-gray-800 dark:text-gray-200">
                Avatar
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <FileUpload
                  ref="avatarUploadRef"
                  mode="basic"
                  customUpload
                  accept="image/png,image/jpeg,image/webp"
                  :maxFileSize="5 * 1024 * 1024"
                  chooseLabel="Choose image"
                  :disabled="saving"
                  severity="secondary"
                  class="p-button-outlined"
                  @select="onAvatarFileSelect"
                />

                <Button
                  v-if="pendingAvatarFile"
                  label="Remove"
                  icon="pi pi-times"
                  text
                  severity="secondary"
                  :disabled="saving"
                  @click="clearPendingAvatar"
                />

                <Tag v-if="pendingAvatarFile" value="Pending" severity="warning" />
              </div>
              <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                JPG/PNG/WebP up to 5MB.
                <span v-if="pendingAvatarFileName" class="ml-1">
                  Selected: <span class="font-medium">{{ pendingAvatarFileName }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <Dialog v-model:visible="cropOpen" modal header="Crop avatar" :draggable="false" :style="{ width: 'min(60rem, 96vw)' }">
          <div class="grid gap-4 sm:grid-cols-[1fr_16rem]">
            <div class="min-w-0 rounded-xl border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-black/20">
              <ClientOnly>
                <Cropper
                  v-if="cropSrc"
                  ref="cropperRef"
                  class="h-[24rem] w-full min-w-0"
                  :src="cropSrc"
                  :stencil-component="CircleStencil"
                  :stencil-props="{ aspectRatio: 1 }"
                  :canvas="{ width: 640, height: 640 }"
                  image-restriction="stencil"
                  :default-size="avatarDefaultSize"
                  :default-position="avatarDefaultPosition"
                  @change="onCropChange"
                />
              </ClientOnly>
            </div>

            <div class="space-y-3">
              <div class="text-sm font-medium text-gray-800 dark:text-gray-200">
                Preview
              </div>
              <div class="mx-auto h-32 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800">
                <img v-if="cropPreviewUrl" :src="cropPreviewUrl" alt="" class="h-full w-full object-cover" />
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                This is how your avatar will appear. The saved image remains a square (best for future layouts), but it’s displayed as a circle.
              </div>
            </div>
          </div>

          <template #footer>
            <Button label="Cancel" text severity="secondary" :disabled="saving" @click="cancelCrop" />
            <Button label="Apply" icon="pi pi-check" severity="secondary" :disabled="!cropHasSelection || saving" @click="applyCrop" />
          </template>
        </Dialog>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
          <InputText v-model="editName" class="w-full" :maxlength="50" />
          <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-end">
            {{ editName.trim().length }}/50
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Bio</label>
          <Textarea v-model="editBio" class="w-full" rows="4" autoResize :maxlength="160" />
          <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-end">
            {{ editBio.trim().length }}/160
          </div>
        </div>

        <AppInlineAlert v-if="editError" severity="danger">
          {{ editError }}
        </AppInlineAlert>
      </div>

      <template #footer>
        <Button label="Cancel" text severity="secondary" :disabled="saving" @click="editOpen = false" />
        <Button label="Save" icon="pi pi-check" :loading="saving" :disabled="saving" @click="saveProfile" />
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Profile'
})

usePageSeo({
  title: 'Profile',
  description: 'User profile.',
  noindex: true
})

type PublicProfile = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarKey?: string | null
  avatarUpdatedAt?: string | null
}

const route = useRoute()
const usernameParam = computed(() => String(route.params.username || ''))
const normalizedUsername = computed(() => usernameParam.value.trim().toLowerCase())

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'

const { data, error } = await useAsyncData(`public-profile:${normalizedUsername.value}`, async () => {
  const result = await apiFetchData<{ user: PublicProfile }>(
    `/users/${encodeURIComponent(normalizedUsername.value)}`,
    { method: 'GET' }
  )
  return result.user
})

const profile = computed(() => data.value ?? null)

const { user: authUser } = useAuth()
const { assetUrl } = useAssets()

const isSelf = computed(() => Boolean(authUser.value?.id && profile.value?.id && authUser.value.id === profile.value.id))

const profileName = computed(() => profile.value?.name || profile.value?.username || 'User')
const profileAvatarUrl = computed(() => assetUrl(profile.value?.avatarKey))

const editOpen = ref(false)
const editName = ref('')
const editBio = ref('')
const editError = ref<string | null>(null)
const saving = ref(false)

import { Cropper, CircleStencil } from 'vue-advanced-cropper'

// We stage avatar changes locally (preview) and only upload/commit when the user hits Save.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const avatarUploadRef = ref<any>(null)
const pendingAvatarFile = ref<File | null>(null)
const pendingAvatarPreviewUrl = ref<string | null>(null)

// Crop step (Twitter-like): choose file -> crop -> stage cropped file
const cropOpen = ref(false)
const cropSrc = ref<string | null>(null)
const cropPreviewUrl = ref<string | null>(null)
const cropHasSelection = ref(false)
const cropOriginalFile = ref<File | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cropperRef = ref<any>(null)
let cropPreviewRaf: number | null = null

// Default crop: as large as possible and centered.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const avatarDefaultSize = ({ imageSize }: any) => {
  const size = Math.floor(Math.min(imageSize.width, imageSize.height) * 0.98)
  return { width: size, height: size }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const avatarDefaultPosition = ({ coordinates, imageSize }: any) => {
  return {
    left: Math.round(imageSize.width / 2 - coordinates.width / 2),
    top: Math.round(imageSize.height / 2 - coordinates.height / 2),
  }
}

const pendingAvatarFileName = computed(() => pendingAvatarFile.value?.name ?? null)
const editAvatarPreviewUrl = computed(() => pendingAvatarPreviewUrl.value || profileAvatarUrl.value)

function clearPendingAvatar() {
  pendingAvatarFile.value = null
  if (pendingAvatarPreviewUrl.value) {
    URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
    pendingAvatarPreviewUrl.value = null
  }
  avatarUploadRef.value?.clear?.()
}

function clearCropState() {
  cropOpen.value = false
  cropHasSelection.value = false
  cropOriginalFile.value = null
  if (cropPreviewRaf) {
    cancelAnimationFrame(cropPreviewRaf)
    cropPreviewRaf = null
  }
  if (cropSrc.value) {
    URL.revokeObjectURL(cropSrc.value)
    cropSrc.value = null
  }
  if (cropPreviewUrl.value) {
    URL.revokeObjectURL(cropPreviewUrl.value)
    cropPreviewUrl.value = null
  }
  cropperRef.value = null
}

function stageAvatarFile(file: File) {
  // Clean up old preview URL (if any).
  if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
  pendingAvatarFile.value = file
  pendingAvatarPreviewUrl.value = URL.createObjectURL(file)
}

function openCropForFile(file: File) {
  clearCropState()
  cropOriginalFile.value = file
  cropSrc.value = URL.createObjectURL(file)
  cropOpen.value = true
  cropHasSelection.value = true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onAvatarFileSelect(e: any) {
  if (!isSelf.value) return
  const file: File | null = e?.files?.[0] ?? null
  if (!file) return

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
  openCropForFile(file)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onCropChange(e: any) {
  // `e.canvas` is an HTMLCanvasElement representing the current crop (square),
  // we render a smaller circle preview for UX.
  const canvas: HTMLCanvasElement | null = e?.canvas ?? null
  cropHasSelection.value = Boolean(canvas)
  if (!canvas) return

  if (cropPreviewRaf) cancelAnimationFrame(cropPreviewRaf)
  cropPreviewRaf = requestAnimationFrame(() => {
    try {
      const previewCanvas = document.createElement('canvas')
      const size = 256
      previewCanvas.width = size
      previewCanvas.height = size
      const ctx = previewCanvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(canvas, 0, 0, size, size)

      if (cropPreviewUrl.value) URL.revokeObjectURL(cropPreviewUrl.value)
      previewCanvas.toBlob((blob) => {
        if (!blob) return
        cropPreviewUrl.value = URL.createObjectURL(blob)
      }, 'image/jpeg', 0.92)
    } finally {
      cropPreviewRaf = null
    }
  })
}

function cancelCrop() {
  // If user cancels cropping, do not stage anything.
  clearCropState()
  clearPendingAvatar()
}

async function applyCrop() {
  if (!cropHasSelection.value) return
  const cropper = cropperRef.value
  const result = cropper?.getResult?.()
  const canvas: HTMLCanvasElement | null = result?.canvas ?? null
  if (!canvas) return

  const original = cropOriginalFile.value
  const outType = (original?.type === 'image/png' || original?.type === 'image/webp') ? original.type : 'image/jpeg'

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), outType, outType === 'image/jpeg' ? 0.92 : undefined)
  })
  if (!blob) {
    editError.value = 'Failed to crop image.'
    return
  }

  const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg'
  const filename = `avatar.${ext}`
  const croppedFile = new File([blob], filename, { type: outType })
  stageAvatarFile(croppedFile)
  clearCropState()
}

watch(
  () => editOpen.value,
  (open) => {
    if (!open) {
      clearCropState()
      clearPendingAvatar()
      return
    }
    editError.value = null
    editName.value = profile.value?.name || ''
    editBio.value = profile.value?.bio || ''
    clearCropState()
    clearPendingAvatar()
  }
)

async function saveProfile() {
  if (!isSelf.value) return
  editError.value = null
  saving.value = true
  try {
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

      const committed = await apiFetchData<{ user: any }>('/uploads/avatar/commit', {
        method: 'POST',
        body: { key: init.key },
      })

      authUser.value = committed.user ?? authUser.value
      data.value = {
        ...(data.value as PublicProfile),
        avatarKey: committed.user?.avatarKey ?? null,
        avatarUpdatedAt: committed.user?.avatarUpdatedAt ?? null,
      }
      // Avatar is now persisted; clear staged state so UI reflects "applied".
      clearPendingAvatar()
    }

    const result = await apiFetchData<{ user: any }>('/users/me/profile', {
      method: 'PATCH',
      body: {
        name: editName.value,
        bio: editBio.value
      }
    })

    // Update profile state (public view) and auth user state (self).
    data.value = {
      ...(data.value as PublicProfile),
      name: result.user?.name ?? null,
      bio: result.user?.bio ?? null
    }
    authUser.value = result.user ?? authUser.value
    editOpen.value = false
  } catch (e: unknown) {
    editError.value = getApiErrorMessage(e) || 'Failed to save profile.'
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  clearCropState()
  if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
})
</script>


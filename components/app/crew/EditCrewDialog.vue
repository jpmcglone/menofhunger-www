<template>
  <AppFormModal
    :model-value="modelValue"
    title="Edit Crew"
    :saving="saving"
    :can-submit="canSubmit"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="saveCrew"
  >
    <div class="space-y-4">
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

            <div class="absolute right-3 top-3 flex gap-2">
              <Button
                v-if="showBannerTrash"
                rounded
                :severity="pendingBannerRemoval ? 'secondary' : 'danger'"
                :aria-label="pendingBannerRemoval ? 'Undo cover removal' : 'Remove cover'"
                :disabled="saving || !canEdit"
                @click="pendingBannerRemoval ? undoPendingBannerRemoval() : requestBannerRemoval()"
              >
                <template #icon>
                  <Icon :name="pendingBannerRemoval ? 'tabler:arrow-back-up' : 'tabler:trash'" aria-hidden="true" />
                </template>
              </Button>
              <Button
                rounded
                severity="secondary"
                :aria-label="pendingBannerFile ? 'Discard cover change' : 'Edit cover'"
                :disabled="saving || !canEdit"
                @click="pendingBannerFile ? clearPendingBanner() : openBannerPicker()"
              >
                <template #icon>
                  <Icon :name="pendingBannerFile ? 'tabler:x' : 'tabler:camera'" aria-hidden="true" />
                </template>
              </Button>
            </div>

            <div
              v-if="pendingBannerFile || pendingBannerRemoval"
              class="absolute inset-x-0 bottom-0 px-3 py-2"
            >
              <div
                class="mx-auto w-fit rounded-lg bg-black/45 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                style="text-shadow: 0 1px 2px rgba(0,0,0,.55);"
              >
                {{ pendingBannerRemoval ? 'Will be removed' : 'Pending' }}
              </div>
            </div>
          </div>
        </div>

        <div class="absolute left-4 bottom-0 z-10 translate-y-1/2">
          <div
            class="relative h-28 w-28 overflow-hidden bg-gray-200 ring-4 ring-white dark:bg-zinc-800 dark:ring-black"
            :class="avatarRoundClass"
          >
            <img
              v-if="editAvatarPreviewUrl"
              :src="editAvatarPreviewUrl"
              alt=""
              class="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            >

            <div class="absolute inset-0 flex items-center justify-center gap-1.5">
              <Button
                v-if="showAvatarTrash"
                rounded
                size="small"
                :severity="pendingAvatarRemoval ? 'secondary' : 'danger'"
                :aria-label="pendingAvatarRemoval ? 'Undo avatar removal' : 'Remove avatar'"
                :disabled="saving || !canEdit"
                @click="pendingAvatarRemoval ? undoPendingAvatarRemoval() : requestAvatarRemoval()"
              >
                <template #icon>
                  <Icon :name="pendingAvatarRemoval ? 'tabler:arrow-back-up' : 'tabler:trash'" aria-hidden="true" />
                </template>
              </Button>
              <Button
                rounded
                severity="secondary"
                :aria-label="pendingAvatarFile ? 'Discard avatar change' : 'Edit avatar'"
                :disabled="saving || !canEdit"
                @click="pendingAvatarFile ? clearPendingAvatar() : openAvatarPicker()"
              >
                <template #icon>
                  <Icon :name="pendingAvatarFile ? 'tabler:x' : 'tabler:camera'" aria-hidden="true" />
                </template>
              </Button>
            </div>

            <div
              v-if="pendingAvatarFile || pendingAvatarRemoval"
              class="absolute inset-x-0 bottom-0 px-2 pb-2"
            >
              <div
                class="mx-auto w-fit rounded-lg bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
                style="text-shadow: 0 1px 2px rgba(0,0,0,.55);"
              >
                {{ pendingAvatarRemoval ? 'Will be removed' : 'Pending' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="h-16" aria-hidden="true" />

      <input
        ref="bannerInputEl"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        :disabled="saving || !canEdit"
        @change="onBannerInputChange"
      >
      <input
        ref="avatarInputEl"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        :disabled="saving || !canEdit"
        @change="onAvatarInputChange"
      >

      <AppProfileEditAvatarCropDialog
        v-model="avatarCropOpen"
        variant="group"
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
        <InputText
          v-model="editName"
          class="w-full"
          :maxlength="80"
          :disabled="!canEdit"
          placeholder="Untitled Crew"
        />
        <template #helper>
          Leave blank for &ldquo;Untitled Crew&rdquo;. Renaming rotates your public URL; the old link redirects.
          {{ nameCharCount.display }}
        </template>
      </AppFormField>

      <AppFormField label="Tagline">
        <InputText
          v-model="editTagline"
          class="w-full"
          :maxlength="160"
          :disabled="!canEdit"
          placeholder="One-line pitch"
        />
        <template #helper>{{ taglineCharCount.display }}</template>
      </AppFormField>

      <AppFormField label="Bio">
        <Textarea
          v-model="editBio"
          class="w-full"
          rows="4"
          auto-resize
          :maxlength="4000"
          :disabled="!canEdit"
          placeholder="What's your Crew about?"
        />
        <template #helper>{{ bioCharCount.display }}</template>
      </AppFormField>

      <AppFormField v-if="nonOwnerMembers.length > 0" label="Designated successor">
        <select
          v-model="editSuccessorId"
          class="w-full border moh-border rounded-lg p-2 bg-transparent"
          :disabled="!canEdit"
        >
          <option :value="null">(None &mdash; longest-tenured member inherits)</option>
          <option
            v-for="m in nonOwnerMembers"
            :key="m.user.id"
            :value="m.user.id"
          >
            {{ memberLabel(m) }}
          </option>
        </select>
        <template #helper>
          Takes over if you go inactive for 30 days.
        </template>
      </AppFormField>

      <AppInlineAlert v-if="editError" severity="danger">
        {{ editError }}
      </AppInlineAlert>

      <!-- Danger zone: only the owner can disband. Kept inside the same dialog
           so all crew-level destructive actions live next to where they're
           configured (mirrors how account-level destructive actions sit beside
           profile editing). -->
      <div
        v-if="isOwner"
        class="mt-2 rounded-xl border border-red-200 dark:border-red-900/60 p-4 space-y-2"
      >
        <div class="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</div>
        <p class="text-xs moh-text-muted">
          Disbanding clears the Crew, its chat, and all memberships. This can&rsquo;t be undone.
        </p>
        <Button
          label="Disband Crew"
          rounded
          severity="danger"
          size="small"
          :loading="disbanding"
          :disabled="saving || disbanding"
          @click="confirmDisband"
        />
      </div>
    </div>
  </AppFormModal>
</template>

<script setup lang="ts">
import { useFormSubmit } from '~/composables/useFormSubmit'
import type { CrewMemberListItem, CrewPrivate, CrewPublic } from '~/types/api'
import { crewAvatarRoundClass } from '~/utils/avatar-rounding'

const props = defineProps<{
  modelValue: boolean
  crew: CrewPublic | null
  isOwner: boolean
  /**
   * Whether the viewer can edit this crew as a site admin override (i.e. they
   * are not the owner but `siteAdmin` is true on `/auth/me`). Controls a
   * visual cue only — the API enforces the same gate server-side.
   */
  isAdminOverride?: boolean
  /**
   * If set, save via `PATCH /crew/:crewId` (admin path). Otherwise the dialog
   * falls back to `PATCH /crew/me` (owner path). The owner can use either
   * path, but we keep `/crew/me` as the default because it's the older
   * stable shape and exercised by more tests.
   */
  targetCrewId?: string | null
  /** Currently designated successor user id, if any. */
  designatedSuccessorUserId?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'updated', crew: CrewPrivate): void
  (e: 'disbanded'): void
}>()

const { apiFetchData } = useApiClient()
const { assetUrl } = useAssets()
const crewApi = useCrew()

const isOwner = computed(() => Boolean(props.isOwner))
const isAdminOverride = computed(() => Boolean(props.isAdminOverride))
const canEdit = computed(() => isOwner.value || isAdminOverride.value)
const avatarRoundClass = crewAvatarRoundClass()

const coverUrl = computed(() => props.crew?.coverUrl ?? null)
const avatarUrl = computed(() => props.crew?.avatarUrl ?? null)

const nonOwnerMembers = computed<CrewMemberListItem[]>(() =>
  (props.crew?.members ?? []).filter((m) => m.role !== 'owner'),
)

function memberLabel(m: CrewMemberListItem): string {
  const u = m.user
  return u.name?.trim() || u.username?.trim() || u.id
}

const editName = ref('')
const editTagline = ref('')
const editBio = ref('')
const editSuccessorId = ref<string | null>(null)

const nameCharCount = useFormCharCount(editName, 80)
const taglineCharCount = useFormCharCount(editTagline, 160)
const bioCharCount = useFormCharCount(editBio, 4000)

const editError = ref<string | null>(null)

const avatarInputEl = ref<HTMLInputElement | null>(null)
const pendingAvatarFile = ref<File | null>(null)
const pendingAvatarPreviewUrl = ref<string | null>(null)
// Staged removal: Save will send `avatarImageUrl: null` to clear the stored
// image. Mutually exclusive with a staged file (upload wins, see stageAvatarFile).
const pendingAvatarRemoval = ref(false)

const bannerInputEl = ref<HTMLInputElement | null>(null)
const pendingBannerFile = ref<File | null>(null)
const pendingBannerPreviewUrl = ref<string | null>(null)
const pendingBannerRemoval = ref(false)

const avatarCropOpen = ref(false)
const avatarCropFile = ref<File | null>(null)

const bannerCropOpen = ref(false)
const bannerCropFile = ref<File | null>(null)

const editAvatarPreviewUrl = computed(() => {
  if (pendingAvatarFile.value && pendingAvatarPreviewUrl.value) return pendingAvatarPreviewUrl.value
  if (pendingAvatarRemoval.value) return null
  return avatarUrl.value
})
const editBannerPreviewUrl = computed(() => {
  if (pendingBannerFile.value && pendingBannerPreviewUrl.value) return pendingBannerPreviewUrl.value
  if (pendingBannerRemoval.value) return null
  return coverUrl.value
})

const showAvatarTrash = computed(
  () =>
    canEdit.value
    && (Boolean(avatarUrl.value) || pendingAvatarRemoval.value)
    && !pendingAvatarFile.value,
)
const showBannerTrash = computed(
  () =>
    canEdit.value
    && (Boolean(coverUrl.value) || pendingBannerRemoval.value)
    && !pendingBannerFile.value,
)

const { confirm: confirmRemoval } = useAppConfirm()

// Crew name is allowed to be blank ("Untitled Crew"); only block on
// over-limit fields. Submissions require either owner OR site admin.
const canSubmit = computed(
  () =>
    canEdit.value
    && !nameCharCount.isOver.value
    && !taglineCharCount.isOver.value
    && !bioCharCount.isOver.value,
)

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

function clearBannerCropState() {
  bannerCropOpen.value = false
  bannerCropFile.value = null
}

function stageAvatarFile(file: File) {
  if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
  pendingAvatarFile.value = file
  pendingAvatarPreviewUrl.value = URL.createObjectURL(file)
  pendingAvatarRemoval.value = false
}

function stageBannerFile(file: File) {
  if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
  pendingBannerFile.value = file
  pendingBannerPreviewUrl.value = URL.createObjectURL(file)
  pendingBannerRemoval.value = false
}

async function requestAvatarRemoval() {
  if (!canEdit.value) return
  const ok = await confirmRemoval({
    header: 'Remove Crew avatar?',
    message: 'The Crew photo will be cleared when you save. The change is reversible until you save.',
    confirmLabel: 'Remove',
    confirmSeverity: 'danger',
  })
  if (!ok) return
  clearPendingAvatar()
  pendingAvatarRemoval.value = true
}

function undoPendingAvatarRemoval() {
  pendingAvatarRemoval.value = false
}

async function requestBannerRemoval() {
  if (!canEdit.value) return
  const ok = await confirmRemoval({
    header: 'Remove Crew cover?',
    message: 'The cover image will be cleared when you save. The change is reversible until you save.',
    confirmLabel: 'Remove',
    confirmSeverity: 'danger',
  })
  if (!ok) return
  clearPendingBanner()
  pendingBannerRemoval.value = true
}

function undoPendingBannerRemoval() {
  pendingBannerRemoval.value = false
}

function openBannerPicker() {
  if (!canEdit.value) return
  bannerInputEl.value?.click()
}

function onBannerInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  handleBannerSelectedFile(file)
}

function handleBannerSelectedFile(file: File) {
  if (!canEdit.value) return

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(file.type)) {
    editError.value = 'Unsupported image type. Please upload a JPG, PNG, or WebP.'
    clearPendingBanner()
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    editError.value = 'Cover is too large (max 8MB).'
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
  if (!canEdit.value) return
  avatarInputEl.value?.click()
}

function onAvatarInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  handleAvatarSelectedFile(file)
}

function handleAvatarSelectedFile(file: File) {
  if (!canEdit.value) return

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
  openCropForAvatarFile(file)
}

// Mirrors the EditGroupDialog upload flow but uses `purpose: 'crew'` so the
// backend stores under uploads/<userId>/crew-images/.
async function uploadImageFile(file: File): Promise<string> {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image is too large (max 8MB).')
  }
  const init = await apiFetchData<{ key: string; uploadUrl?: string; headers: Record<string, string>; skipUpload?: boolean }>(
    '/uploads/post-media/init',
    { method: 'POST', body: { contentType: file.type, purpose: 'crew' } },
  )
  if (!init.skipUpload && init.uploadUrl) {
    const putRes = await fetch(init.uploadUrl, { method: 'PUT', headers: init.headers, body: file })
    if (!putRes.ok) throw new Error('Upload failed.')
  }
  const committed = await apiFetchData<{ key: string }>('/uploads/post-media/commit', {
    method: 'POST',
    body: { key: init.key },
  })
  const url = assetUrl(committed.key)
  if (!url) throw new Error('Assets URL is not configured; cannot set image.')
  return url
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      clearAvatarCropState()
      clearBannerCropState()
      clearPendingAvatar()
      clearPendingBanner()
      pendingAvatarRemoval.value = false
      pendingBannerRemoval.value = false
      return
    }
    editError.value = null
    const c = props.crew
    editName.value = c?.name ?? ''
    editTagline.value = c?.tagline ?? ''
    editBio.value = c?.bio ?? ''
    editSuccessorId.value = props.designatedSuccessorUserId ?? null
    clearAvatarCropState()
    clearBannerCropState()
    clearPendingAvatar()
    clearPendingBanner()
    pendingAvatarRemoval.value = false
    pendingBannerRemoval.value = false
  },
)

const { submit: saveCrew, submitting: saving } = useFormSubmit(
  async () => {
    if (!canEdit.value) return
    if (!props.crew) return
    editError.value = null

    // null  -> "clear this image"
    // string -> "set to this URL"
    // undefined -> "leave as-is" (omitted from payload)
    let coverImageUrl: string | null | undefined
    let avatarImageUrl: string | null | undefined

    if (pendingBannerFile.value) {
      coverImageUrl = await uploadImageFile(pendingBannerFile.value)
      clearPendingBanner()
    } else if (pendingBannerRemoval.value) {
      coverImageUrl = null
    }
    if (pendingAvatarFile.value) {
      avatarImageUrl = await uploadImageFile(pendingAvatarFile.value)
      clearPendingAvatar()
    } else if (pendingAvatarRemoval.value) {
      avatarImageUrl = null
    }

    const patch = {
      name: editName.value.trim() || null,
      tagline: editTagline.value.trim() || null,
      bio: editBio.value.trim() || null,
      designatedSuccessorUserId: editSuccessorId.value,
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
      ...(avatarImageUrl !== undefined ? { avatarImageUrl } : {}),
    }

    // If a target crew id is provided (admin override path), use the
    // `/crew/:crewId` endpoint. Otherwise the owner path uses `/crew/me`.
    const updated = props.targetCrewId
      ? await crewApi.updateCrew(props.targetCrewId, patch)
      : await crewApi.updateMyCrew(patch)

    pendingBannerRemoval.value = false
    pendingAvatarRemoval.value = false
    emit('updated', updated)
    emit('update:modelValue', false)
  },
  {
    defaultError: 'Failed to save Crew.',
    onError: (message) => {
      editError.value = message
    },
  },
)

const disbanding = ref(false)

async function confirmDisband() {
  if (!isOwner.value) return
  if (!confirm('Disband this Crew? This cannot be undone — the chat and all membership will be cleared.')) return
  disbanding.value = true
  editError.value = null
  try {
    await crewApi.disbandCrew()
    useNuxtApp().$posthog?.capture('crew_disbanded', {})
    emit('disbanded')
    emit('update:modelValue', false)
  } catch (e) {
    editError.value = (e as Error)?.message || 'Could not disband the Crew.'
  } finally {
    disbanding.value = false
  }
}

onBeforeUnmount(() => {
  clearAvatarCropState()
  clearBannerCropState()
  if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
  if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
})
</script>

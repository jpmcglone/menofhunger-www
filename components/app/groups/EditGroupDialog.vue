<template>
  <AppFormModal
    :model-value="modelValue"
    title="Edit group"
    :saving="saving"
    :can-submit="canSubmit"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="saveGroup"
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

            <div class="absolute right-3 top-3">
              <Button
                rounded
                severity="secondary"
                :aria-label="pendingBannerFile ? 'Reset banner change' : 'Edit banner'"
                :disabled="saving || !isOwner"
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

            <div class="absolute inset-0 flex items-center justify-center">
              <Button
                rounded
                severity="secondary"
                :aria-label="pendingAvatarFile ? 'Reset avatar change' : 'Edit avatar'"
                :disabled="saving || !isOwner"
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

      <div class="h-16" aria-hidden="true" />

      <input
        ref="bannerInputEl"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        :disabled="saving || !isOwner"
        @change="onBannerInputChange"
      >
      <input
        ref="avatarInputEl"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        :disabled="saving || !isOwner"
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
        <InputText v-model="editName" class="w-full" :maxlength="120" />
        <template #helper>{{ nameCharCount.display }}</template>
      </AppFormField>

      <AppFormField label="Description">
        <Textarea
          v-model="editDescription"
          class="w-full"
          rows="2"
          autoResize
          :maxlength="160"
          placeholder="What is this group about?"
        />
        <template #helper>{{ descriptionCharCount.display }}</template>
      </AppFormField>

      <AppFormField label="Rules">
        <Textarea
          v-model="editRules"
          class="w-full"
          rows="4"
          autoResize
          :maxlength="8000"
          placeholder="Optional community guidelines…"
        />
        <template #helper>
          Optional. {{ rulesCharCount.display }}
        </template>
      </AppFormField>

      <AppFormField label="Who can join">
        <div class="flex flex-wrap gap-2">
          <Button
            label="Open"
            rounded
            size="small"
            :severity="editJoinPolicy === 'open' ? 'primary' : 'secondary'"
            :disabled="saving || !isOwner || isCurrentlyPrivate"
            @click="editJoinPolicy = 'open'"
          />
          <Button
            label="Private"
            rounded
            size="small"
            :severity="editJoinPolicy === 'approval' ? 'primary' : 'secondary'"
            :disabled="saving || !isOwner"
            @click="editJoinPolicy = 'approval'"
          >
            <template #icon>
              <Icon name="tabler:lock" aria-hidden="true" />
            </template>
          </Button>
        </div>
        <template #helper>
          <template v-if="isCurrentlyPrivate">
            <span class="moh-text-muted">A private group cannot be made open. This is permanent.</span>
          </template>
          <template v-else-if="editJoinPolicy === 'open'">
            Any verified member can find this group and read its posts.
          </template>
          <template v-else>
            <span>
              Only members can see posts. New members are approved by you or a moderator.
            </span>
            <span class="block mt-1 text-amber-700 dark:text-amber-400">
              Heads up: once a group is private, it can never be made open again.
            </span>
          </template>
        </template>
      </AppFormField>

      <AppInlineAlert v-if="editError" severity="danger">
        {{ editError }}
      </AppInlineAlert>
    </div>
  </AppFormModal>
</template>

<script setup lang="ts">
import { useFormSubmit } from '~/composables/useFormSubmit'
import type { CommunityGroupShell } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'

const props = defineProps<{
  modelValue: boolean
  shell: CommunityGroupShell | null
  isOwner: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'updated', shell: CommunityGroupShell): void
}>()

const { apiFetchData } = useApiClient()
const { assetUrl } = useAssets()

const isOwner = computed(() => Boolean(props.isOwner))
const isCurrentlyPrivate = computed(() => props.shell?.joinPolicy === 'approval')
const avatarRoundClass = groupAvatarRoundClass()
const { confirm } = useAppConfirm()

const coverUrl = computed(() => props.shell?.coverImageUrl ?? null)
const avatarUrl = computed(() => props.shell?.avatarImageUrl ?? null)

const editName = ref('')
const editDescription = ref('')
const editRules = ref('')
const editJoinPolicy = ref<'open' | 'approval'>('open')
const nameCharCount = useFormCharCount(editName, 120)
const descriptionCharCount = useFormCharCount(editDescription, 160)
const rulesCharCount = useFormCharCount(editRules, 8000)
const editError = ref<string | null>(null)

const avatarInputEl = ref<HTMLInputElement | null>(null)
const pendingAvatarFile = ref<File | null>(null)
const pendingAvatarPreviewUrl = ref<string | null>(null)

const bannerInputEl = ref<HTMLInputElement | null>(null)
const pendingBannerFile = ref<File | null>(null)
const pendingBannerPreviewUrl = ref<string | null>(null)

const avatarCropOpen = ref(false)
const avatarCropFile = ref<File | null>(null)

const bannerCropOpen = ref(false)
const bannerCropFile = ref<File | null>(null)

const editAvatarPreviewUrl = computed(() => pendingAvatarPreviewUrl.value || avatarUrl.value)
const editBannerPreviewUrl = computed(() => pendingBannerPreviewUrl.value || coverUrl.value)

const canSubmit = computed(
  () =>
    isOwner.value
    && editName.value.trim().length > 0
    && editDescription.value.trim().length > 0
    && !nameCharCount.isOver.value
    && !descriptionCharCount.isOver.value
    && !rulesCharCount.isOver.value,
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
}

function stageBannerFile(file: File) {
  if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
  pendingBannerFile.value = file
  pendingBannerPreviewUrl.value = URL.createObjectURL(file)
}

function openBannerPicker() {
  if (!isOwner.value) return
  bannerInputEl.value?.click()
}

function onBannerInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  handleBannerSelectedFile(file)
}

function handleBannerSelectedFile(file: File) {
  if (!isOwner.value) return

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
  if (!isOwner.value) return
  avatarInputEl.value?.click()
}

function onAvatarInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  handleAvatarSelectedFile(file)
}

function handleAvatarSelectedFile(file: File) {
  if (!isOwner.value) return

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
    { method: 'POST', body: { contentType: file.type, purpose: 'group' } },
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
      return
    }
    editError.value = null
    const s = props.shell
    editName.value = s?.name ?? ''
    editDescription.value = s?.description ?? ''
    editRules.value = s?.rules ?? ''
    editJoinPolicy.value = s?.joinPolicy ?? 'open'
    clearAvatarCropState()
    clearBannerCropState()
    clearPendingAvatar()
    clearPendingBanner()
  },
)

const { submit: saveGroup, submitting: saving } = useFormSubmit(
  async () => {
    if (!isOwner.value) return
    const s = props.shell
    if (!s?.id) return
    editError.value = null

    // Confirm one-way privacy transition before any uploads. Going open -> private
    // is permanent: members joined under the public-readability promise and the
    // API rejects any future attempt to revert. Spell that out plainly.
    if (s.joinPolicy === 'open' && editJoinPolicy.value === 'approval') {
      const ok = await confirm({
        header: 'Make this group private?',
        message: "Posts will be hidden from non-members and new members will need approval. This can't be undone — a private group can never be made open again.",
        confirmLabel: 'Make private',
        confirmSeverity: 'danger',
      })
      if (!ok) return
    }

    let coverImageUrl: string | undefined
    let avatarImageUrl: string | undefined

    if (pendingBannerFile.value) {
      coverImageUrl = await uploadImageFile(pendingBannerFile.value)
      clearPendingBanner()
    }
    if (pendingAvatarFile.value) {
      avatarImageUrl = await uploadImageFile(pendingAvatarFile.value)
      clearPendingAvatar()
    }

    const updated = await apiFetchData<CommunityGroupShell>(`/groups/${encodeURIComponent(s.id)}`, {
      method: 'PATCH',
      body: {
        name: editName.value.trim(),
        description: editDescription.value.trim(),
        rules: editRules.value.trim() || null,
        joinPolicy: editJoinPolicy.value,
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        ...(avatarImageUrl !== undefined ? { avatarImageUrl } : {}),
      },
    })

    emit('updated', updated)
    emit('update:modelValue', false)
  },
  {
    defaultError: 'Failed to save group.',
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

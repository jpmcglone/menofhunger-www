<template>
  <div>
    <div class="relative shrink-0 border-0 border-b border-gray-200 bg-white dark:border-zinc-800 dark:bg-black/20">
      <div class="overflow-hidden">
        <div class="relative">
          <div class="aspect-[3/1] w-full min-h-0 shrink-0 overflow-hidden bg-gray-200 dark:bg-zinc-900">
            <img
              v-if="editor.editBannerPreviewUrl"
              :src="editor.editBannerPreviewUrl"
              alt=""
              class="h-full w-full"
              :class="bannerFitClass"
              loading="lazy"
              decoding="async"
            >
          </div>

          <div class="absolute right-3 top-3 flex gap-2">
            <Button
              v-if="editor.showBannerTrash"
              rounded
              :severity="editor.pendingBannerRemoval ? 'secondary' : 'danger'"
              :aria-label="editor.pendingBannerRemoval ? `Undo ${bannerNoun} removal` : `Remove ${bannerNoun}`"
              :disabled="saving || !canEdit"
              @click="editor.pendingBannerRemoval ? editor.undoPendingBannerRemoval() : editor.requestBannerRemoval()"
            >
              <template #icon>
                <Icon :name="editor.pendingBannerRemoval ? 'tabler:arrow-back-up' : 'tabler:trash'" aria-hidden="true" />
              </template>
            </Button>
            <Button
              rounded
              severity="secondary"
              :aria-label="editor.pendingBannerFile ? `Discard ${bannerNoun} change` : `Edit ${bannerNoun}`"
              :disabled="saving || !canEdit"
              @click="editor.pendingBannerFile ? editor.clearPendingBanner() : editor.openBannerPicker()"
            >
              <template #icon>
                <Icon :name="editor.pendingBannerFile ? 'tabler:x' : 'tabler:camera'" aria-hidden="true" />
              </template>
            </Button>
          </div>

          <div
            v-if="editor.pendingBannerFile || editor.pendingBannerRemoval"
            class="absolute inset-x-0 bottom-0 px-3 py-2"
          >
            <div
              class="mx-auto w-fit rounded-lg bg-black/45 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
              style="text-shadow: 0 1px 2px rgba(0,0,0,.55);"
            >
              {{ bannerPendingLabel }}
            </div>
          </div>
        </div>
      </div>

      <div class="absolute left-4 bottom-0 z-10 translate-y-1/2">
        <div
          class="relative h-28 w-28 overflow-hidden bg-gray-200 ring-4 ring-white dark:bg-zinc-800 dark:ring-black"
          :class="resolvedAvatarRoundClass"
        >
          <img
            v-if="editor.editAvatarPreviewUrl"
            :src="editor.editAvatarPreviewUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          >

          <AppProfileEditAvatarVideoDraftPreview
            v-if="allowVideo && open && editor.pendingVideoEdit && !editor.pendingAvatarRemoval"
            :edit="editor.pendingVideoEdit"
          />
          <AppAvatarVideo
            v-else-if="allowVideo && open && !editor.pendingAvatarFile && !editor.pendingAvatarRemoval && avatarVideo"
            :asset="avatarVideo"
          />

          <div class="absolute inset-0 flex items-center justify-center gap-1.5">
            <Button
              v-if="editor.showAvatarTrash"
              rounded
              size="small"
              :severity="editor.pendingAvatarRemoval ? 'secondary' : 'danger'"
              :aria-label="editor.pendingAvatarRemoval ? 'Undo avatar removal' : 'Remove avatar'"
              :disabled="saving || !canEdit"
              @click="editor.pendingAvatarRemoval ? editor.undoPendingAvatarRemoval() : editor.requestAvatarRemoval()"
            >
              <template #icon>
                <Icon :name="editor.pendingAvatarRemoval ? 'tabler:arrow-back-up' : 'tabler:trash'" aria-hidden="true" />
              </template>
            </Button>
            <Button
              rounded
              severity="secondary"
              :aria-label="editor.pendingAvatarFile ? 'Discard avatar change' : 'Edit avatar'"
              :disabled="saving || !canEdit"
              @click="editor.pendingAvatarFile ? editor.clearPendingAvatar() : editor.openAvatarPicker()"
            >
              <template #icon>
                <Icon :name="editor.pendingAvatarFile ? 'tabler:x' : 'tabler:camera'" aria-hidden="true" />
              </template>
            </Button>
          </div>

          <div
            v-if="editor.pendingAvatarFile || editor.pendingAvatarRemoval"
            class="absolute inset-x-0 bottom-0 px-2 pb-2"
          >
            <div
              class="mx-auto w-fit rounded-lg bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
              style="text-shadow: 0 1px 2px rgba(0,0,0,.55);"
            >
              {{ avatarPendingLabel }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="h-16" aria-hidden="true" />

    <input
      :ref="editor.setBannerInputEl"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      class="hidden"
      :disabled="saving || !canEdit"
      @change="editor.onBannerInputChange"
    >
    <input
      :ref="editor.setAvatarInputEl"
      type="file"
      :accept="avatarAccept"
      class="hidden"
      :disabled="saving || !canEdit"
      @change="editor.onAvatarInputChange"
    >

    <AppProfileEditAvatarVideoDialog
      v-if="allowVideo"
      :file="editor.videoEditorFile"
      :is-organization="isOrganization"
      @cancel="editor.clearVideoEditor"
      @selected="editor.stageVideo"
    />
    <AppProfileEditAvatarCropDialog
      v-model="editor.avatarCropOpen"
      :variant="cropVariant"
      :file="editor.avatarCropFile"
      :disabled="saving"
      :is-organization="isOrganization"
      @cancel="editor.onAvatarCropCancelled"
      @cropped="editor.onAvatarCropped"
    />
    <AppProfileEditBannerCropDialog
      v-model="editor.bannerCropOpen"
      :file="editor.bannerCropFile"
      :disabled="saving"
      @cancel="editor.onBannerCropCancelled"
      @cropped="editor.onBannerCropped"
    />
  </div>
</template>

<script setup lang="ts">
import type { AvatarVideoDto } from '~/types/api-contracts.gen'
import { bannerAvatarEditorKey, type BannerAvatarEditorVariant } from '~/composables/useStagedBannerAvatarEdit'
import { avatarRoundClass as userAvatarRoundClass, crewAvatarRoundClass, groupAvatarRoundClass } from '~/utils/avatar-rounding'

const editor = inject(bannerAvatarEditorKey)
if (!editor) throw new Error('AppBannerAvatarEditor requires useStagedBannerAvatarEdit')

const props = withDefaults(defineProps<{
  variant: BannerAvatarEditorVariant
  saving?: boolean
  canEdit?: boolean
  open?: boolean
  avatarVideo?: AvatarVideoDto | null
  isOrganization?: boolean
  avatarRoundClass?: string
}>(), { saving: false, canEdit: true, open: false, avatarVideo: null, avatarRoundClass: undefined })

const isOrganization = computed(() => props.isOrganization ?? props.variant === 'organization')
const allowVideo = computed(() => props.variant === 'user' || props.variant === 'organization')
const cropVariant = computed(() => (props.variant === 'group' || props.variant === 'crew' ? 'group' : 'user'))
const bannerNoun = computed(() => (props.variant === 'user' || props.variant === 'organization' ? 'banner' : 'cover'))
const bannerFitClass = computed(() => (props.variant === 'user' || props.variant === 'organization' ? 'object-cover' : 'object-contain'))
const resolvedAvatarRoundClass = computed(() => {
  if (props.avatarRoundClass) return props.avatarRoundClass
  if (props.variant === 'organization') return userAvatarRoundClass(true)
  if (props.variant === 'group') return groupAvatarRoundClass()
  if (props.variant === 'crew') return crewAvatarRoundClass()
  return userAvatarRoundClass(false)
})
const avatarAccept = computed(() =>
  allowVideo.value && editor.canSetVideoAvatar
    ? 'image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm'
    : 'image/png,image/jpeg,image/webp',
)

const bannerPendingLabel = computed(() => {
  if (editor.pendingBannerRemoval) return 'Will be removed'
  if (allowVideo.value && props.saving) return 'Uploading…'
  return allowVideo.value ? 'Not saved yet' : 'Pending'
})
const avatarPendingLabel = computed(() => {
  if (editor.pendingAvatarRemoval) return 'Will be removed'
  if (allowVideo.value && props.saving) return 'Uploading…'
  return allowVideo.value ? 'Not saved yet' : 'Pending'
})
</script>

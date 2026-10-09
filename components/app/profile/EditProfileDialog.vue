<template>
  <AppModal
    :model-value="modelValue"
    title="Edit profile"
    show-submit
    :saving="saving"
    :can-submit="canEdit"
    body-class="p-4"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="saveProfile"
  >
    <div class="space-y-4">
      <AppBannerAvatarEditor
        :variant="isOrganization ? 'organization' : 'user'"
        :saving="saving"
        :can-edit="canEdit"
        :open="modelValue"
        :avatar-video="profile?.avatarVideo"
        :is-organization="isOrganization"
        :avatar-round-class="avatarRoundClass"
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
          auto-resize
          :maxlength="160"
          placeholder="Tell people a bit about yourself…"
        />
        <template #helper>{{ bioCharCount.display }}</template>
      </AppFormField>

      <AppFormField label="Place">
        <InputText
          v-model="editLocationQuery"
          class="w-full"
          :maxlength="80"
          placeholder="ZIP, or City, Country"
        />
        <template #helper>
          United States: your ZIP. Somewhere else: City, Country.
        </template>
      </AppFormField>

      <!-- Links moved to their own editor: website, Rumble, YouTube and the rest live on the links page. -->
      <NuxtLink
        v-if="isSelf && !isAdminMode"
        to="/settings/links"
        class="flex min-h-11 items-center gap-3 rounded-xl border moh-border px-3 py-2 transition-colors hover:bg-[var(--moh-surface-hover)]"
      >
        <Icon name="tabler:link" class="size-5 shrink-0 moh-text-muted" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          <span class="block text-[15px] font-semibold">Links</span>
          <span class="block text-sm moh-text-muted">{{ linksSummary }}</span>
        </span>
        <Icon name="tabler:chevron-right" class="shrink-0 moh-text-muted" aria-hidden="true" />
      </NuxtLink>

      <AppInlineAlert v-if="editError" severity="danger">
        {{ editError }}
      </AppInlineAlert>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { useFormSubmit } from '~/composables/useFormSubmit'
import { bannerAvatarEditorKey, useStagedBannerAvatarEdit } from '~/composables/useStagedBannerAvatarEdit'
import { useSyncUserCaches } from '~/composables/settings/useSyncUserCaches'
import { avatarRoundClass as getAvatarRoundClass } from '~/utils/avatar-rounding'
import { avatarVideoBasePath } from '~/utils/avatar-video-upload'
import { putPresignedFile } from '~/utils/put-presigned-file'

type PublicProfile = {
  id: string
  createdAt?: string
  username: string | null
  name: string | null
  bio: string | null
  /** Deprecated mirror; links are edited in Settings → Links. */
  website?: string | null
  links?: import('~/types/api').ProfileLink[]
  xUsername?: string | null
  pickaxUsername?: string | null
  rumbleUrl?: string | null
  linkedinUrl?: string | null
  youtubeUrl?: string | null
  locationDisplay?: string | null
  locationZip?: string | null
  locationCity?: string | null
  locationCounty?: string | null
  locationState?: string | null
  locationCountry?: string | null
  birthdayMonthDay?: string | null
  premium: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  isOrganization?: boolean
  avatarUrl?: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
  bannerUrl?: string | null
}

const props = defineProps<{
  modelValue: boolean
  profile: PublicProfile | null
  isSelf: boolean
  /** When set, the editing session is admin-acting-on-behalf-of. Calls admin endpoints. */
  targetUserId?: string
  profileAvatarUrl: string | null
  profileBannerUrl: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved'): void
  (e: 'patchProfile', patch: Partial<Pick<
    PublicProfile,
    'name' | 'bio' | 'avatarVideo' | 'avatarUrl' | 'bannerUrl' | 'locationZip' | 'locationDisplay' | 'locationCity' | 'locationCounty' | 'locationState' | 'locationCountry'
  >>): void
}>()

const { apiFetchData } = useApiClient()
const { user: authUser, patchUser } = useAuth()
const syncUserCaches = useSyncUserCaches()

const isSelf = computed(() => Boolean(props.isSelf))
const isAdminMode = computed(() => Boolean(props.targetUserId))
const canEdit = computed(() => isSelf.value || isAdminMode.value)
const isOrganization = computed(() => Boolean(props.profile?.isOrganization))
const avatarRoundClass = computed(() => getAvatarRoundClass(isOrganization.value))
const profileAvatarUrl = computed(() => props.profileAvatarUrl ?? null)
const profileBannerUrl = computed(() => props.profileBannerUrl ?? null)

const editName = ref('')
const editBio = ref('')
const editLocationQuery = ref('')
const linksSummary = computed(() => {
  const count = props.profile?.links?.length ?? 0
  return count > 0 ? `${count} ${count === 1 ? 'link' : 'links'}` : 'Add your website, podcast, and more'
})
const nameCharCount = useFormCharCount(editName, 50)
const bioCharCount = useFormCharCount(editBio, 160)
const editError = ref<string | null>(null)

const photo = useStagedBannerAvatarEdit({
  avatarUrl: profileAvatarUrl,
  bannerUrl: profileBannerUrl,
  canEdit,
  allowAvatarRemoval: isAdminMode,
  allowVideo: true,
  videoTargetUserId: () => props.targetUserId,
  open: () => props.modelValue,
  avatarNoun: 'avatar',
  bannerNoun: 'banner',
  error: editError,
})
const pendingAvatarFile = toRef(photo, 'pendingAvatarFile')
const pendingBannerFile = toRef(photo, 'pendingBannerFile')
const pendingAvatarRemoval = toRef(photo, 'pendingAvatarRemoval')
const pendingBannerRemoval = toRef(photo, 'pendingBannerRemoval')
const pendingVideoEdit = toRef(photo, 'pendingVideoEdit')
const canSetVideoAvatar = toRef(photo, 'canSetVideoAvatar')
const { stageVideo, clearPendingAvatar, clearPendingBanner } = photo
provide(bannerAvatarEditorKey, photo)

function locationQueryFromProfile(profile: { locationZip?: string | null; locationCountry?: string | null; locationDisplay?: string | null } | null | undefined) {
  if (profile?.locationCountry && profile.locationCountry !== 'US' && profile.locationDisplay) return profile.locationDisplay
  return profile?.locationZip ?? ''
}

function hydrateEditFields() {
  editError.value = null
  editName.value = props.profile?.name || ''
  editBio.value = props.profile?.bio || ''
  editLocationQuery.value = locationQueryFromProfile(props.profile)
}

function fillEmptyEditFieldsFromProfile() {
  if (!props.modelValue) return
  if (!editName.value && props.profile?.name) editName.value = props.profile.name
  if (!editBio.value && props.profile?.bio) editBio.value = props.profile.bio
  if (!editLocationQuery.value) editLocationQuery.value = locationQueryFromProfile(props.profile)
}

watch(
  () => props.modelValue,
  (open) => {
    photo.reset()
    if (!open) return
    hydrateEditFields()
  },
  { immediate: true },
)

watch(
  () => [
    props.profile?.name,
    props.profile?.bio,
    props.profile?.locationZip,
  ] as const,
  () => fillEmptyEditFieldsFromProfile(),
)

const actionSounds = useActionSounds()
const { submit: saveProfile, submitting: saving } = useFormSubmit(
  async () => {
    if (!canEdit.value) return
    editError.value = null

    const soundStartedAt = Date.now()
    const hadMediaUpload = Boolean(pendingAvatarFile.value || pendingBannerFile.value)
    const adminId = props.targetUserId ?? null
    const bannerInitUrl = adminId ? `/admin/users/${adminId}/uploads/banner/init` : '/uploads/banner/init'
    const bannerCommitUrl = adminId ? `/admin/users/${adminId}/uploads/banner/commit` : '/uploads/banner/commit'
    const bannerDeleteUrl = adminId ? `/admin/users/${adminId}/uploads/banner` : '/uploads/banner'
    const avatarInitUrl = adminId ? `/admin/users/${adminId}/uploads/avatar/init` : '/uploads/avatar/init'
    const avatarCommitUrl = adminId ? `/admin/users/${adminId}/uploads/avatar/commit` : '/uploads/avatar/commit'
    const avatarDeleteUrl = adminId ? `/admin/users/${adminId}/uploads/avatar` : '/uploads/avatar'
    const videoBaseUrl = avatarVideoBasePath(adminId)
    const profilePatchUrl = adminId ? `/admin/users/${adminId}/profile` : '/users/me/profile'

    // Banner removal: a staged file always wins (the file was picked AFTER
    // removal was asked for, by mutual-exclusion in stageBannerFile).
    if (pendingBannerRemoval.value && !pendingBannerFile.value) {
      const committed = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>(bannerDeleteUrl, {
        method: 'DELETE',
      })
      // Patch the live profile page first so cache refresh cannot blank the header.
      emit('patchProfile', { bannerUrl: committed?.user?.bannerUrl ?? null })
      if (!adminId) {
        const previousUsername = authUser.value?.username ?? null
        patchUser(committed?.user)
        syncUserCaches(committed?.user, previousUsername)
      }
      pendingBannerRemoval.value = false
    }

    // If a banner is staged, upload + commit it first.
    if (pendingBannerFile.value) {
      const file = pendingBannerFile.value
      const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
        bannerInitUrl,
        {
          method: 'POST',
          body: { contentType: file.type }
        }
      )
      if (init.maxBytes && file.size > init.maxBytes) {
        throw new Error(`Banner is too large after cropping (max ${Math.max(1, Math.floor(init.maxBytes / (1024 * 1024)))}MB).`)
      }

      await putPresignedFile(init.uploadUrl, init.headers, file)

      const committed = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>(bannerCommitUrl, {
        method: 'POST',
        body: { key: init.key },
      })

      // Patch the live profile page first so cache refresh cannot blank the header.
      emit('patchProfile', { bannerUrl: committed?.user?.bannerUrl ?? null })
      if (!adminId) {
        const previousUsername = authUser.value?.username ?? null
        patchUser(committed?.user)
        syncUserCaches(committed?.user, previousUsername)
      }
      clearPendingBanner()
    }

    // Avatar removal: same precedence rules as the banner.
    if (pendingAvatarRemoval.value && !pendingAvatarFile.value) {
      const committed = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>(avatarDeleteUrl, {
        method: 'DELETE',
      })
      emit('patchProfile', { avatarUrl: committed?.user?.avatarUrl ?? null, avatarVideo: committed?.user?.avatarVideo ?? null })
      if (!adminId) {
        const previousUsername = authUser.value?.username ?? null
        patchUser(committed?.user)
        syncUserCaches(committed?.user, previousUsername)
      }
      pendingAvatarRemoval.value = false
    }

    // If an avatar is staged, upload + commit it first.
    if (pendingVideoEdit.value) {
      const edit = pendingVideoEdit.value
      const identity = authUser.value?.id
      const init = await apiFetchData<{ id: string; uploadUrl: string; headers: Record<string, string> }>(`${videoBaseUrl}/init`, {
        method: 'POST', body: { contentType: edit.file.type },
      })
      if (authUser.value?.id !== identity || (props.targetUserId ?? null) !== adminId) throw new Error('Account changed.')
      await putPresignedFile(init.uploadUrl, init.headers, edit.file)
      if (authUser.value?.id !== identity || (props.targetUserId ?? null) !== adminId) throw new Error('Account changed.')
      type Status = { status: string; error: string | null; user: import('~/composables/useAuth').AuthUser | null }
      let status = await apiFetchData<Status>(`${videoBaseUrl}/${init.id}/commit`, { method: 'POST', body: edit.selection })
      const deadline = Date.now() + 180_000
      while (['queued', 'processing'].includes(status.status) && Date.now() < deadline) {
        if (authUser.value?.id !== identity || (props.targetUserId ?? null) !== adminId) throw new Error('Account changed. Reopen the editor to continue.')
        await new Promise(resolve => setTimeout(resolve, 1500))
        status = await apiFetchData<Status>(`${videoBaseUrl}/${init.id}`)
      }
      if (status.status !== 'ready' || !status.user) throw new Error(status.error || 'Your video is still processing. Your avatar will update when it is ready.')
      if (authUser.value?.id !== identity || (props.targetUserId ?? null) !== adminId) throw new Error('Account changed.')
      emit('patchProfile', { avatarUrl: status.user.avatarUrl ?? null, avatarVideo: status.user.avatarVideo ?? null })
      if (!adminId) patchUser(status.user)
      syncUserCaches(status.user, props.profile?.username ?? null)
      clearPendingAvatar()
    } else if (pendingAvatarFile.value) {
      const file = pendingAvatarFile.value
      const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
        avatarInitUrl,
        {
          method: 'POST',
          body: { contentType: file.type }
        }
      )
      if (init.maxBytes && file.size > init.maxBytes) {
        throw new Error(`Avatar is too large after cropping (max ${Math.max(1, Math.floor(init.maxBytes / (1024 * 1024)))}MB).`)
      }

      await putPresignedFile(init.uploadUrl, init.headers, file)

      const committed = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>(avatarCommitUrl, {
        method: 'POST',
        body: { key: init.key },
      })

      emit('patchProfile', { avatarUrl: committed.user?.avatarUrl ?? null, avatarVideo: committed.user?.avatarVideo ?? null })
      if (!adminId) {
        const previousUsername = authUser.value?.username ?? null
        patchUser(committed?.user)
        syncUserCaches(committed?.user, previousUsername)
      }
      clearPendingAvatar()
    }

    if (adminId) {
      // Admin editing another user's profile — response is the full UserDto (not wrapped under `user`).
      const result = await apiFetchData<import('~/types/api').UserDto>(profilePatchUrl, {
        method: 'PATCH',
        body: {
          name: editName.value,
          bio: editBio.value,
          locationQuery: editLocationQuery.value,
        }
      })
      emit('patchProfile', {
        name: result?.name ?? null,
        bio: result?.bio ?? null,
        locationZip: result?.locationZip ?? null,
        locationDisplay: result?.locationDisplay ?? null,
        locationCity: result?.locationCity ?? null,
        locationCounty: result?.locationCounty ?? null,
        locationState: result?.locationState ?? null,
        locationCountry: result?.locationCountry ?? null,
      })
    } else {
      const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>(profilePatchUrl, {
        method: 'PATCH',
        body: {
          name: editName.value,
          bio: editBio.value,
          locationQuery: editLocationQuery.value,
        }
      })
      const u = result.user
      const previousUsername = authUser.value?.username ?? null
      emit('patchProfile', {
        name: u?.name ?? null,
        bio: u?.bio ?? null,
        locationZip: u?.locationZip ?? null,
        locationDisplay: u?.locationDisplay ?? null,
        locationCity: u?.locationCity ?? null,
        locationCounty: u?.locationCounty ?? null,
        locationState: u?.locationState ?? null,
        locationCountry: u?.locationCountry ?? null,
      })
      patchUser(u)
      syncUserCaches(u, previousUsername)
    }

    if (hadMediaUpload && Date.now() - soundStartedAt >= 3000) void actionSounds.play('upload-ready')
    emit('update:modelValue', false)
    if (!adminId) emit('saved')
  },
  {
    defaultError: 'Failed to save profile.',
    onError: (message) => {
      editError.value = message
    },
  },
)

defineExpose({ pendingAvatarRemoval, canSetVideoAvatar, stageVideo, saveProfile })
</script>

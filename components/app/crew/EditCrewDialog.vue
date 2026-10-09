<template>
  <AppModal
    :model-value="modelValue"
    title="Edit Crew"
    show-submit
    :saving="saving"
    :can-submit="canSubmit"
    body-class="p-4"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="saveCrew"
  >
    <div class="space-y-4">
      <AppBannerAvatarEditor variant="crew" :saving="saving" :can-edit="canEdit" :open="modelValue" />

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
  </AppModal>
</template>

<script setup lang="ts">
import { presignedUpload } from '~/utils/put-presigned-file'
import { useFormSubmit } from '~/composables/useFormSubmit'
import { bannerAvatarEditorKey, useStagedBannerAvatarEdit } from '~/composables/useStagedBannerAvatarEdit'
import type { CrewMemberListItem, CrewPrivate, CrewPublic } from '~/types/api'

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
const photo = useStagedBannerAvatarEdit({
  avatarUrl,
  bannerUrl: coverUrl,
  canEdit,
  allowAvatarRemoval: isAdminOverride,
  open: () => props.modelValue,
  avatarNoun: 'Crew avatar',
  bannerNoun: 'Crew cover',
  error: editError,
})
provide(bannerAvatarEditorKey, photo)

// Crew name is allowed to be blank ("Untitled Crew"); only block on
// over-limit fields. Submissions require either owner OR site admin.
const canSubmit = computed(
  () =>
    canEdit.value
    && !nameCharCount.isOver.value
    && !taglineCharCount.isOver.value
    && !bioCharCount.isOver.value,
)

async function uploadImageFile(file: File): Promise<string> {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image is too large (max 8MB).')
  }
  const committed = await presignedUpload(apiFetchData, 'post-media', file, { initBody: { purpose: 'crew' } })
  const url = assetUrl(committed.key)
  if (!url) throw new Error('Assets URL is not configured; cannot set image.')
  return url
}

watch(
  () => props.modelValue,
  (open) => {
    photo.reset()
    if (!open) return
    editError.value = null
    const c = props.crew
    editName.value = c?.name ?? ''
    editTagline.value = c?.tagline ?? ''
    editBio.value = c?.bio ?? ''
    editSuccessorId.value = props.designatedSuccessorUserId ?? null
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

    if (photo.pendingBannerFile) {
      coverImageUrl = await uploadImageFile(photo.pendingBannerFile)
      photo.clearPendingBanner()
    } else if (photo.pendingBannerRemoval) {
      coverImageUrl = null
    }
    if (photo.pendingAvatarFile) {
      avatarImageUrl = await uploadImageFile(photo.pendingAvatarFile)
      photo.clearPendingAvatar()
    } else if (photo.pendingAvatarRemoval) {
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

    photo.pendingBannerRemoval = false
    photo.pendingAvatarRemoval = false
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

</script>

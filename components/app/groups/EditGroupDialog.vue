<template>
  <AppModal
    :model-value="modelValue"
    title="Edit group"
    show-submit
    :saving="saving"
    :can-submit="canSubmit"
    body-class="p-4"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="saveGroup"
  >
    <div class="space-y-4">
      <AppBannerAvatarEditor variant="group" :saving="saving" :can-edit="canEdit" :open="modelValue" />

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
            :disabled="saving || !canEdit || isCurrentlyPrivate"
            @click="editJoinPolicy = 'open'"
          />
          <Button
            label="Request to join"
            rounded
            size="small"
            :severity="editJoinPolicy === 'approval' ? 'primary' : 'secondary'"
            :disabled="saving || !canEdit"
            @click="editJoinPolicy = 'approval'"
          >
            <template #icon>
              <Icon name="tabler:lock" aria-hidden="true" />
            </template>
          </Button>
        </div>
        <template #helper>
          <template v-if="isCurrentlyPrivate">
            <span class="moh-text-muted">An approval-required group cannot be made open. This is permanent.</span>
          </template>
          <template v-else-if="editJoinPolicy === 'open'">
            Any verified member can find this group and read its posts.
          </template>
          <template v-else>
            <span>
              People request to join and are approved by you or a moderator. Posts stay hidden from non-members.
            </span>
            <span class="block mt-1 text-amber-700 dark:text-amber-400">
              Heads up: once a group requires approval, it can never be made open again.
            </span>
          </template>
        </template>
      </AppFormField>

      <AppInlineAlert v-if="editError" severity="danger">
        {{ editError }}
      </AppInlineAlert>

      <section v-if="canEdit" class="space-y-2 border-t moh-border pt-4" aria-labelledby="group-danger-zone">
        <h3 id="group-danger-zone" class="text-base font-semibold moh-text">Danger zone</h3>
        <div class="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-500/40 dark:bg-red-500/10">
          <p class="min-w-0 flex-1 text-sm moh-text">Delete this group and everything in it.</p>
          <Button label="Delete group…" severity="danger" outlined rounded size="small" :disabled="saving" @click="deleteOpen = true" />
        </div>
      </section>
    </div>
  </AppModal>
  <AppGroupsDeleteGroupDialog v-model="deleteOpen" :shell="shell" @deleted="onDeleted" />
</template>

<script setup lang="ts">
import { useFormSubmit } from '~/composables/useFormSubmit'
import { bannerAvatarEditorKey, useStagedBannerAvatarEdit } from '~/composables/useStagedBannerAvatarEdit'
import type { CommunityGroupShell } from '~/types/api'

const props = defineProps<{
  modelValue: boolean
  shell: CommunityGroupShell | null
  /**
   * Whether the viewer is the group's owner (regular member-level edit path).
   */
  isOwner: boolean
  /**
   * Whether the viewer can edit this group as a site admin override (i.e. they
   * are not the owner but `siteAdmin` is true on `/auth/me`). Controls the
   * "admin action" affordance only — the API enforces the same gate server-side.
   */
  isAdminOverride?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'updated', shell: CommunityGroupShell): void
}>()

const { apiFetchData } = useApiClient()
const { assetUrl } = useAssets()

const isOwner = computed(() => Boolean(props.isOwner))
const isAdminOverride = computed(() => Boolean(props.isAdminOverride))
const canEdit = computed(() => isOwner.value || isAdminOverride.value)
const isCurrentlyPrivate = computed(() => props.shell?.joinPolicy === 'approval')
const { confirm } = useAppConfirm()
const deleteOpen = ref(false)
async function onDeleted() {
  emit('update:modelValue', false)
  await navigateTo('/groups')
}

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
const photo = useStagedBannerAvatarEdit({
  avatarUrl,
  bannerUrl: coverUrl,
  canEdit,
  allowAvatarRemoval: isAdminOverride,
  open: () => props.modelValue,
  avatarNoun: 'group avatar',
  bannerNoun: 'group cover',
  error: editError,
})
provide(bannerAvatarEditorKey, photo)

const canSubmit = computed(
  () =>
    canEdit.value
    && editName.value.trim().length > 0
    && editDescription.value.trim().length > 0
    && !nameCharCount.isOver.value
    && !descriptionCharCount.isOver.value
    && !rulesCharCount.isOver.value,
)

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
    photo.reset()
    if (!open) return
    editError.value = null
    const s = props.shell
    editName.value = s?.name ?? ''
    editDescription.value = s?.description ?? ''
    editRules.value = s?.rules ?? ''
    editJoinPolicy.value = s?.joinPolicy ?? 'open'
  },
)

const { submit: saveGroup, submitting: saving } = useFormSubmit(
  async () => {
    if (!canEdit.value) return
    const s = props.shell
    if (!s?.id) return
    editError.value = null

    // Confirm one-way privacy transition before any uploads. Going open -> private
    // is permanent: members joined under the public-readability promise and the
    // API rejects any future attempt to revert. Spell that out plainly.
    if (s.joinPolicy === 'open' && editJoinPolicy.value === 'approval') {
      const ok = await confirm({
        header: 'Require approval to join?',
        message: "Posts will be hidden from non-members and new members will need approval. This can't be undone — the group can never be made open again.",
        confirmLabel: 'Require approval',
        confirmSeverity: 'danger',
      })
      if (!ok) return
    }

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

    photo.pendingBannerRemoval = false
    photo.pendingAvatarRemoval = false

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

</script>

<template>
  <Dialog :visible="visible" modal :show-header="false" :close-on-escape="false" :dismissable-mask="false" :draggable="false" :style="{ width: 'min(40rem, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 24px)' }" :pt="{ root: { class: 'moh-edit-post-dialog' }, content: { class: '!p-0' } }" aria-label="Edit post">
    <AppPostComposer
      ref="composer" auto-focus :show-divider="false" placeholder="Edit your post…"
      :initial-text="post.body" :locked-visibility="post.visibility" hide-visibility-picker
      :community-group-id="post.communityGroupId" :group-composer="Boolean(post.communityGroupId)"
      :group-name="groupName" disable-media :register-unsaved-guard="false" mode="edit"
      :edit-post-id="post.id" :edit-post-is-draft="Boolean(post.isDraft)" @edited="emit('edited', $event)"
    >
      <template #close>
        <h2 class="min-w-0 flex-1 text-xl font-semibold">Edit post</h2>
        <Button text rounded severity="secondary" aria-label="Close edit post" class="order-last !h-11 !w-11 shrink-0" :disabled="busy" @click="requestClose">
          <Icon name="tabler:x" class="text-xl" aria-hidden="true" />
        </Button>
      </template>
      <template #audience>
        <span v-if="post.communityGroupId" :title="groupName" class="inline-flex min-h-11 min-w-0 max-w-[48%] items-center gap-2 rounded-xl moh-surface px-3 text-[var(--moh-verified)]" :aria-label="`Group: ${groupName}. Audience cannot be changed.`">
          <AppGroupsGroupAvatar :name="groupName" :src="group?.avatarImageUrl ?? post.groupPreview?.avatarImageUrl" :size="24" />
          <span class="truncate text-sm font-semibold">{{ groupName }}</span>
        </span>
        <span v-else class="inline-flex min-h-11 shrink-0 items-center rounded-full border moh-border px-3" aria-label="Audience cannot be changed">
          <AppComposerAudienceLabel :visibility="post.visibility" />
        </span>
      </template>
    </AppPostComposer>
  </Dialog>
</template>
<script setup lang="ts">
import type { CommunityGroupShell, FeedPost } from '~/types/api'
const props = defineProps<{ post: FeedPost }>()
const emit = defineEmits<{ edited: [payload: { id: string; post: FeedPost }] }>()
const visible = defineModel<boolean>({ required: true })
const composer = ref<{ hasEditChanges: boolean; submitting: boolean } | null>(null)
const busy = computed(() => Boolean(composer.value?.submitting))
const { confirm } = useAppConfirm()
const { apiFetchData } = useApiClient()
const group = ref<CommunityGroupShell | null>(null)
const groupName = computed(() => group.value?.name || props.post.groupPreview?.name || 'Group')
let confirming = false
async function requestClose() {
  if (busy.value || confirming) return
  if (composer.value?.hasEditChanges) {
    confirming = true
    try {
      const discard = await confirm({ header: 'Discard changes?', message: 'Your edits haven’t been saved.', confirmLabel: 'Discard', confirmSeverity: 'danger' })
      if (!discard) return
    } finally { confirming = false }
  }
  visible.value = false
}
useOverlayDismiss(visible, () => { void requestClose() })
onMounted(async () => {
  if (!props.post.communityGroupId) return
  try {
    const groups = await apiFetchData<CommunityGroupShell[]>('/groups/me')
    group.value = groups.find(value => value.id === props.post.communityGroupId) ?? null
  } catch { /* The post remains editable if optional group identity cannot load. */ }
})
</script>
<style>
.moh-edit-post-dialog { border-radius: 24px !important; background: var(--moh-surface-2) !important; overflow: hidden; }
</style>

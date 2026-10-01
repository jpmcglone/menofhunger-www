<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=890-4577 -->
<template>
  <Dialog :visible="true" modal :closable="true" :style="{ width: '26rem', maxWidth: '95vw' }" :pt="{ root: { class: '!rounded-2xl' } }" @update:visible="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <AppIconGlyph name="article" :size="22" />
        <span class="text-lg font-bold text-[var(--moh-text)]">Publish article</span>
      </div>
    </template>

    <div class="space-y-1">
      <div class="flex min-h-11 items-center gap-3 py-2">
        <AppIconGlyph name="board" :size="22" class="shrink-0 moh-text-muted" />
        <label for="article-post-to-board" class="flex-1 cursor-pointer">
          <span class="block text-sm font-semibold moh-text">Also post to the Board</span>
          <span class="block text-xs moh-text-muted">Creates a Board post linking here. Comments stay on the article.</span>
        </label>
        <ToggleSwitch v-model="postToBoard" input-id="article-post-to-board" />
      </div>
      <div class="flex min-h-11 items-center gap-3 py-2" :class="postToBoard ? '' : 'opacity-50'">
        <AppIconGlyph name="home" :size="22" class="shrink-0 moh-text-muted" />
        <label for="article-board-to-feed" class="flex-1 cursor-pointer">
          <span class="block text-sm font-semibold moh-text">Also post to feed</span>
          <span class="block text-xs moh-text-muted">The Board post also appears in the feed.</span>
        </label>
        <ToggleSwitch v-model="shareToFeed" input-id="article-board-to-feed" :disabled="!postToBoard" />
      </div>
    </div>
    <AppPostCrosspostDestinations v-if="destinations.length" ref="destinationsRef" :destinations="destinations" />

    <div class="mt-5 flex items-center justify-end gap-2">
      <button type="button" class="moh-tap min-h-11 px-4 text-sm moh-text-muted hover:text-[var(--moh-text)]" @click="emit('close')">Cancel</button>
      <AppActionButton label="Publish" kind="brand" :loading="publishing" @click="emit('confirm', { postToBoard, shareToFeed, crosspost: destinationsRef?.payload() ?? {} })" />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { CrosspostPayload } from '~/utils/crosspost'
import type { CrosspostDestinationView } from '~/components/app/post/CrosspostDestinations.vue'

const props = defineProps<{ publishing?: boolean; visibility?: string | null }>()
const emit = defineEmits<{
  close: []
  confirm: [options: { postToBoard: boolean; shareToFeed: boolean; crosspost: CrosspostPayload }]
}>()

const api = useBoardApi()
const { user } = useAuth()
const verified = computed(() => user.value?.verifiedStatus === 'manual' || user.value?.verifiedStatus === 'identity')
const postToBoard = ref(true)
const shareToFeed = ref(false)
const pickaxIntegration = usePickaxIntegration()
const xIntegration = useXIntegration()
const destinationsRef = ref<{ payload: () => CrosspostPayload } | null>(null)

const destinations = computed<CrosspostDestinationView[]>(() => {
  if (props.visibility !== 'public') return []
  const rows: CrosspostDestinationView[] = []
  if (pickaxIntegration.connected.value) {
    rows.push(verified.value ? { id: 'pickax', modes: ['link', 'native'] } : { id: 'pickax', modes: [], disabled: true, disabledNote: 'Verify your MOH account to share outward', premiumHref: '/settings/verification' })
  }
  if (xIntegration.connected.value) {
    if (!xIntegration.status.value?.canPost) {
      rows.push({ id: 'x', modes: [], disabled: true, disabledNote: 'Verify your MOH account to share to X', premiumHref: '/settings/verification' })
    } else {
      const allowance = xIntegration.status.value?.allowance
      const allowanceNote = allowance ? `${allowance.totalRemaining ?? allowance.nativePostsLeft} posts left this month · up to ${allowance.linkRemaining ?? allowance.linkPostsLeft} with links` : undefined
      if (allowance && allowance.linkPostsLeft <= 0) {
        rows.push({ id: 'x', modes: [], disabled: true, disabledNote: "You've used this month's X links", allowanceNote })
      } else {
        rows.push({
          id: 'x',
          modes: ['link'],
          linkOnlyReason: 'Articles share as a link on X',
          allowanceNote,
        })
      }
    }
  }
  return rows
})

useOverlayDismiss(() => true, () => emit('close'))

onMounted(async () => {
  void pickaxIntegration.refresh()
  void xIntegration.refresh()
  try {
    const prefs = await api.getPreferences()
    postToBoard.value = prefs.articlePostToBoardDefault
    shareToFeed.value = prefs.shareToFeedDefault
  } catch {
    // Board cross-post stays on. Feed cross-post stays off.
  }
})
</script>

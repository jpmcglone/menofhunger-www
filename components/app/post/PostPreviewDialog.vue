<template>
  <Dialog
    :visible="true"
    modal
    :closable="true"
    :style="{ width: columnWidth > 0 ? `${columnWidth}px` : '40rem', maxWidth: 'calc(100vw - 2rem)' }"
    :pt="{ root: { class: '!rounded-2xl' }, content: { class: '!p-0' } }"
    @update:visible="emit('close')"
  >
    <template #header>
      <span class="text-lg font-bold text-[var(--moh-text)]">{{ editingScheduled ? 'Save scheduled post' : scheduledLabel ? 'Schedule post' : 'Ready to post?' }}</span>
    </template>

    <!-- The real post row, exactly as it will publish. Inert except the images, which open
         full screen so the author can check them. -->
    <div class="border-y moh-border moh-surface-1">
      <div class="pointer-events-none select-none [&_[data-media-open]]:pointer-events-auto">
        <AppPostRow
          v-if="post"
          :post="post"
          :clickable="false"
          :track-views="false"
          preview
          no-border-bottom
        />
      </div>
    </div>
    <div class="p-5">
      <p v-if="scheduledLabel" class="mb-3 text-sm moh-text-muted">
        Publishes {{ scheduledLabel }}
      </p>
      <p v-if="scheduledLabel && !destinations?.length" class="text-sm moh-text-muted" data-testid="schedule-no-destinations">
        No destinations connected. Connect Pickax or X in Settings to post there too. Men of Hunger still publishes this post at the scheduled time.
      </p>

      <AppPostCrosspostDestinations :destinations="destinations ?? []" :initial-selection="initialSelection" :scheduled="Boolean(scheduledLabel)" @change="crosspost = $event" />

      <div class="flex justify-end gap-2" :class="{ 'mt-5': Boolean(destinations?.length) || Boolean(scheduledLabel) }">
        <button
          type="button"
          class="moh-tap min-h-11 px-4 text-sm moh-text-muted hover:text-[var(--moh-text)]"
          @click="emit('close')"
        >
          Cancel
        </button>
        <AppActionButton
          :label="editingScheduled ? 'Save' : scheduledLabel ? 'Schedule' : 'Post'"
          kind="brand"
          :style="post?.kind === 'checkin' ? { '--moh-action-fill': 'var(--moh-verified)', '--moh-action-label': '#fff' } : undefined"
          :loading="busy"
          @click="emit('confirm', { crosspost })"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
// Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=992-3041
import { useElementSize } from '@vueuse/core'
import type { FeedPost } from '~/types/api'
import type { CrosspostPayload } from '~/utils/crosspost'
import type { CrosspostDestinationView } from '~/components/app/post/CrosspostDestinations.vue'

withDefaults(defineProps<{
  /** The post as it will publish, shaped exactly like a feed row. */
  post: FeedPost | null
  scheduledLabel?: string | null
  /** Empty hides the destinations section. */
  destinations?: CrosspostDestinationView[] | null
  initialSelection?: CrosspostPayload
  editingScheduled?: boolean
  busy?: boolean
}>(), { scheduledLabel: null, destinations: null, initialSelection: undefined, editingScheduled: false, busy: false })

const emit = defineEmits<{
  close: []
  confirm: [options: { crosspost: CrosspostPayload }]
}>()

const crosspost = ref<CrosspostPayload>({})
const { width: columnWidth } = useElementSize(useMiddleScroller())

useOverlayDismiss(() => true, () => emit('close'))
</script>

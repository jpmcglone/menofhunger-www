<template>
  <Dialog
    :visible="true"
    modal
    :closable="true"
    :style="{ width: '32rem', maxWidth: '95vw' }"
    :pt="{ root: { class: '!rounded-2xl' } }"
    @update:visible="emit('close')"
  >
    <template #header>
      <span class="text-lg font-bold text-[var(--moh-text)]">{{ scheduledLabel ? 'Schedule post' : 'Ready to post?' }}</span>
    </template>

    <!-- The real post row, exactly as it will publish. Inert except the images, which open
         full screen so the author can check them. -->
    <div class="overflow-hidden rounded-2xl border moh-border bg-[var(--moh-surface-hover)]">
      <div class="pointer-events-none select-none [--moh-gutter-x:0.875rem] [&_[data-media-open]]:pointer-events-auto">
        <AppPostRow
          v-if="post"
          :post="post"
          :clickable="false"
          :track-views="false"
          preview
          no-border-bottom
          compact
        />
      </div>
    </div>
    <p v-if="scheduledLabel" class="mt-3 text-sm moh-text-muted">
      Publishes {{ scheduledLabel }}
    </p>

    <AppCrosspostDestinations v-if="destinations?.length" ref="destinationsRef" :destinations="destinations" />

    <div class="mt-5 flex justify-end gap-2">
      <button
        type="button"
        class="moh-tap min-h-11 px-4 text-sm moh-text-muted hover:text-[var(--moh-text)]"
        @click="emit('close')"
      >
        Cancel
      </button>
      <AppActionButton
        :label="scheduledLabel ? 'Schedule' : 'Post'"
        kind="brand"
        :loading="busy"
        @click="emit('confirm', { crosspost: destinationsRef?.payload() ?? {} })"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import type { CrosspostPayload } from '~/utils/crosspost'
import type { CrosspostDestinationView } from '~/components/app/post/CrosspostDestinations.vue'

withDefaults(defineProps<{
  /** The post as it will publish, shaped exactly like a feed row. */
  post: FeedPost | null
  scheduledLabel?: string | null
  /** Empty hides the destinations section. */
  destinations?: CrosspostDestinationView[] | null
  busy?: boolean
}>(), { scheduledLabel: null, destinations: null, busy: false })

const emit = defineEmits<{
  close: []
  confirm: [options: { crosspost: CrosspostPayload }]
}>()

const destinationsRef = ref<{ payload: () => CrosspostPayload } | null>(null)

useOverlayDismiss(() => true, () => emit('close'))
</script>

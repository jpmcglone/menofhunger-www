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

    <div v-if="pickax" class="mt-4">
      <p class="mb-2 text-[11px] font-semibold tracking-wide moh-text-muted">ALSO POST TO</p>
      <div
        class="flex items-center gap-3 rounded-xl border p-3 transition-colors"
        :class="pickax.disabled ? 'moh-border opacity-60' : pickaxOn ? 'border-sky-400/80' : 'moh-border'"
      >
        <img
          src="/images/brands/pickax.png"
          alt=""
          width="28"
          height="28"
          class="h-7 w-7 rounded-md"
          :class="pickaxOn && !pickax.disabled ? '' : 'opacity-40 grayscale'"
        >
        <label for="post-preview-pickax" class="min-w-0 flex-1 cursor-pointer">
          <span class="block text-sm font-semibold moh-text">Pickax</span>
          <span class="block text-xs moh-text-muted">{{ pickax.disabled ? pickax.note : pickaxOn ? 'Posting a copy with a link back to your profile' : 'Not posting to Pickax' }}</span>
        </label>
        <ToggleSwitch v-model="pickaxOn" input-id="post-preview-pickax" :disabled="pickax.disabled" />
      </div>
    </div>

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
        @click="emit('confirm', { crossPostToPickax: Boolean(pickax && !pickax.disabled && pickaxOn) })"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

withDefaults(defineProps<{
  /** The post as it will publish, shaped exactly like a feed row. */
  post: FeedPost | null
  scheduledLabel?: string | null
  /** Null hides the destinations section entirely (private, group, check-in, reply). */
  pickax?: { disabled: boolean; note: string } | null
  busy?: boolean
}>(), { scheduledLabel: null, pickax: null, busy: false })

const emit = defineEmits<{
  close: []
  confirm: [options: { crossPostToPickax: boolean }]
}>()

const pickaxOn = ref(false)

useOverlayDismiss(() => true, () => emit('close'))
</script>

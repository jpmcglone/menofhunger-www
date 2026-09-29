<template>
  <Dialog
    :visible="true"
    modal
    :closable="true"
    :style="{ width: '29rem', maxWidth: '95vw' }"
    :pt="{ root: { class: '!rounded-2xl' } }"
    @update:visible="emit('close')"
  >
    <template #header>
      <span class="text-lg font-bold text-[var(--moh-text)]">{{ scheduledLabel ? 'Schedule post' : 'Ready to post?' }}</span>
    </template>

    <div class="flex gap-3 rounded-2xl border moh-border bg-[var(--moh-surface-hover)] p-3.5">
      <AppAvatarCircle
        :src="author.avatarUrl ?? null"
        :name="author.name || author.username || ''"
        :username="author.username ?? null"
        size-class="h-10 w-10"
        :show-presence="false"
      />
      <div class="min-w-0 flex-1">
        <p class="flex flex-wrap items-center gap-x-1.5 text-sm">
          <span class="font-bold moh-text">{{ author.name || author.username }}</span>
          <span class="text-xs moh-text-muted">@{{ author.username }} · {{ visibilityLabel }}</span>
        </p>
        <p v-if="body.trim()" class="mt-1 whitespace-pre-wrap break-words text-[15px] moh-text">{{ body }}</p>
        <p v-else class="mt-1 text-[15px] italic moh-text-muted">No text</p>
        <div v-if="mediaThumbs.length" class="mt-2 flex gap-2">
          <img
            v-for="(thumb, i) in mediaThumbs"
            :key="i"
            :src="thumb"
            alt=""
            class="h-14 w-14 rounded-lg object-cover"
          >
        </div>
        <p v-if="pollOptionCount" class="mt-2 text-xs moh-text-muted">Poll · {{ pollOptionCount }} choices</p>
        <span
          v-if="scheduledLabel"
          class="mt-2 inline-flex rounded-full bg-[var(--moh-surface)] px-2.5 py-1 text-xs font-medium moh-text"
        >Scheduled for {{ scheduledLabel }}</span>
      </div>
    </div>

    <div v-if="pickax" class="mt-4">
      <p class="mb-2 text-[11px] font-semibold tracking-wide moh-text-muted">ALSO POST TO</p>
      <div
        class="flex items-center gap-3 rounded-xl border p-3 transition-colors"
        :class="[
          pickax.disabled ? 'moh-border opacity-60' : pickaxOn ? 'border-sky-400/80' : 'moh-border',
        ]"
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
const props = withDefaults(defineProps<{
  author: { name?: string | null; username?: string | null; avatarUrl?: string | null }
  body: string
  visibilityLabel: string
  mediaThumbs?: string[]
  pollOptionCount?: number
  scheduledLabel?: string | null
  /** Null hides the destinations section entirely (private, group, check-in, reply). */
  pickax?: { disabled: boolean; note: string } | null
  busy?: boolean
}>(), { mediaThumbs: () => [], pollOptionCount: 0, scheduledLabel: null, pickax: null, busy: false })

const emit = defineEmits<{
  close: []
  confirm: [options: { crossPostToPickax: boolean }]
}>()

const mediaThumbs = computed(() => props.mediaThumbs ?? [])
const pickaxOn = ref(false)

useOverlayDismiss(() => true, () => emit('close'))
</script>

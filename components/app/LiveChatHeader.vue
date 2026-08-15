<template>
  <!-- Title + user count -->
  <div class="min-w-0 flex items-center gap-2">
    <div :class="['truncate font-semibold text-gray-900 dark:text-gray-50', titleClass]" :id="headingId || undefined">
      {{ title }}
    </div>
    <span v-if="memberCount != null" class="shrink-0 inline-flex items-center gap-1">
      <Icon name="tabler:users" class="text-[12px] opacity-30" aria-hidden="true" />
      <span class="text-[11px] tabular-nums font-medium text-gray-900 dark:text-white">{{ memberCount }}</span>
    </span>
  </div>

  <div class="shrink-0 flex items-center gap-1">
    <button
      type="button"
      aria-label="How live chat works"
      :aria-expanded="infoOpen"
      class="moh-tap cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      @mouseenter="onInfoEnter"
      @mouseleave="onInfoLeave"
      @click="onInfoClick"
    >
      <Icon
        :name="infoOpen ? 'tabler:info-circle-filled' : 'tabler:info-circle'"
        class="text-[15px]"
        aria-hidden="true"
      />
    </button>
    <Popover
      ref="infoPopover"
      :pt="{ root: { class: 'shadow-xl border moh-border moh-popover rounded-2xl p-3 w-64' } }"
      @hide="onInfoHide"
    >
      <div @mouseenter="cancelInfoHide" @mouseleave="onInfoLeave">
        <p class="text-xs font-semibold text-gray-900 dark:text-gray-50">Live chat</p>
        <p class="mt-1 text-xs leading-relaxed moh-text-muted">
          We don’t save the chat. Only you can see what you were here for, and it drops off after 24 hours.
        </p>
      </div>
    </Popover>
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    memberCount?: number | null
    titleClass?: string
    headingId?: string
  }>(),
  {
    memberCount: null,
    titleClass: '',
  },
)

const infoPopover = ref<{ show: (e: Event) => void; hide: () => void } | null>(null)
const infoOpen = ref(false)
const infoPinned = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

function cancelInfoHide() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function onInfoEnter(e: Event) {
  cancelInfoHide()
  infoOpen.value = true
  infoPopover.value?.show(e)
}

function onInfoLeave() {
  if (infoPinned.value) return
  cancelInfoHide()
  hideTimer = setTimeout(() => {
    hideTimer = null
    infoPopover.value?.hide()
  }, 120)
}

function onInfoClick(e: Event) {
  e.stopPropagation()
  cancelInfoHide()
  if (infoPinned.value) {
    infoPinned.value = false
    infoPopover.value?.hide()
    return
  }
  infoPinned.value = true
  infoOpen.value = true
  infoPopover.value?.show(e)
}

function onInfoHide() {
  infoOpen.value = false
  infoPinned.value = false
  cancelInfoHide()
}

onBeforeUnmount(() => {
  cancelInfoHide()
})
</script>

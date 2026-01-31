<template>
  <div>
    <button
      type="button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
      :class="canShare ? 'cursor-pointer' : 'cursor-default opacity-60'"
      aria-label="Share"
      v-tooltip.bottom="tooltip"
      @click="canShare ? toggle($event) : null"
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
        <!-- Twitter-ish share: arrow up out of tray -->
        <path
          d="M12 3v10"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
        />
        <path
          d="M7.5 7.5L12 3l4.5 4.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <Menu v-if="mounted" ref="menuRef" :model="items" popup />
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'

const props = defineProps<{
  canShare: boolean
  items: MenuItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltip: any
}>()

const emit = defineEmits<{
  (e: 'copyLink'): void
}>()

const canShare = computed(() => Boolean(props.canShare))
const tooltip = computed(() => props.tooltip)
const items = computed(() => props.items ?? [])

const menuRef = ref<any>(null)
const mounted = ref(false)

async function toggle(event: Event) {
  mounted.value = true
  await nextTick()
  ;(menuRef.value as any)?.toggle?.(event)
}
</script>


<template>
  <!-- Overlay: must not affect layout -->
  <div class="absolute right-0 -top-2.5 z-20">
    <a
      role="button"
      tabindex="0"
      class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-70"
      aria-label="More"
      v-tooltip.bottom="tooltip"
      @click.stop="toggle($event)"
      @keydown.enter.stop.prevent="toggle($event)"
      @keydown.space.stop.prevent="toggle($event)"
    >
      <i class="pi pi-ellipsis-h text-[18px]" aria-hidden="true" />
    </a>
    <Menu v-if="mounted" ref="menuRef" :model="items" popup />
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'

const props = defineProps<{
  items: MenuItem[]
  // PrimeVue tooltip binding accepts objects; keep this flexible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltip: any
}>()

const items = computed(() => props.items ?? [])
const tooltip = computed(() => props.tooltip)

const menuRef = ref<any>(null)
const mounted = ref(false)

async function toggle(event: Event) {
  mounted.value = true
  await nextTick()
  ;(menuRef.value as any)?.toggle?.(event)
}
</script>


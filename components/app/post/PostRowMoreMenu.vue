<template>
  <!-- Overlay: must not affect layout -->
  <div class="absolute right-0 -top-2.5 z-30 pointer-events-auto">
    <button
      type="button"
      class="moh-tap moh-pressable inline-flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70"
      aria-label="More"
      aria-haspopup="true"
      v-tooltip.bottom="tooltip"
      @click.stop="onButtonClick($event)"
    >
      <Icon name="tabler:dots" class="text-[18px]" aria-hidden="true" />
    </button>
    <Menu v-if="mounted" ref="menuRef" :model="items" popup>
      <template #item="{ item, props }">
        <a v-bind="props.action" class="flex items-center gap-2">
          <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
          <span v-bind="props.label">{{ item.label }}</span>
        </a>
      </template>
    </Menu>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import { useAutoToggleMenu } from '~/composables/useAutoToggleMenu'

const props = defineProps<{
  items: MenuItem[]
  // PrimeVue tooltip binding accepts objects; keep this flexible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltip: any
  onBeforeOpen?: () => void | Promise<void>
}>()

const items = computed(() => props.items ?? [])
const tooltip = computed(() => props.tooltip)

const { mounted, menuRef, toggle } = useAutoToggleMenu()

function onButtonClick(event: MouseEvent) {
  // Toggle must be called synchronously so PrimeVue can anchor the overlay to
  // the click event. Fire the prefetch in the background — since menu items are
  // reactive, the label updates in the already-open menu once the fetch settles.
  toggle(event)
  if (props.onBeforeOpen) {
    void Promise.resolve(props.onBeforeOpen())
  }
}
</script>


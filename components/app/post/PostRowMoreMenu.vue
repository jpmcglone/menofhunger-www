<template>
  <!-- Overlay: must not affect layout -->
  <div class="absolute right-0 -top-2.5 z-20">
    <button
      type="button"
      class="moh-tap inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-opacity hover:opacity-70"
      aria-label="More"
      aria-haspopup="true"
      v-tooltip.bottom="tooltip"
      @click.stop="toggle($event)"
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
}>()

const items = computed(() => props.items ?? [])
const tooltip = computed(() => props.tooltip)

const { mounted, menuRef, toggle } = useAutoToggleMenu()
</script>


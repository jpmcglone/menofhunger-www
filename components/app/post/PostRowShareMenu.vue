<template>
  <div class="flex items-center">
    <button
      ref="shareButtonRef"
      v-tooltip.bottom="tooltip"
      type="button"
      class="moh-tap moh-pressable inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors moh-surface-hover"
      :class="canShare ? 'cursor-pointer' : 'cursor-default opacity-60'"
      aria-label="Share"
      @click="onShareButtonClick"
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
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

    <Menu v-if="mounted" ref="menuRef" :model="menuItems" popup>
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

type MenuItemWithIcon = MenuItem & { iconName?: string }

const props = defineProps<{
  canShare: boolean
  items: MenuItemWithIcon[]
   
  tooltip: any
}>()

const canShare = computed(() => Boolean(props.canShare))
const menuItems = computed(() => props.items ?? [])

const { mounted, menuRef, toggle } = useAutoToggleMenu()
const shareButtonRef = ref<HTMLButtonElement | null>(null)

function onShareButtonClick(event: MouseEvent) {
  if (!canShare.value) return
  toggle(event)
}
</script>

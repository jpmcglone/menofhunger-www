<template>
  <div class="flex items-center">
    <button
      ref="shareButtonRef"
      v-tooltip.bottom="tooltip"
      type="button"
      class="moh-tap moh-pressable inline-flex items-center justify-center p-0.5 transition-colors hover:moh-text"
      :class="canShare ? 'cursor-pointer' : 'cursor-default opacity-60'"
      aria-label="Share"
      @click="onShareButtonClick"
    >
      <AppIconGlyph name="share" :size="20" />
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

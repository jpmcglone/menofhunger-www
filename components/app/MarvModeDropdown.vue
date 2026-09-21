<template>
  <!-- Figma MARV/Mode trigger + menu: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=781-1176 -->
  <div ref="dropdownRef" class="relative" @keydown.escape="open = false">
    <button
      type="button"
      :disabled="disabled"
      :class="plain
        ? 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/8'
        : 'inline-flex min-h-8 items-center gap-1.5 rounded-lg moh-surface-2 px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:opacity-90 disabled:opacity-50'"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      @click="open = !open"
    >
      <span v-if="legend" class="text-[10px] font-semibold uppercase tracking-wide moh-text-muted">{{ legend }}</span>
      <span>{{ marvinModeLabel(modelValue) }}</span>
      <Icon
        name="tabler:chevron-down"
        class="text-[10px] moh-text-muted transition-transform duration-150"
        :class="open ? 'rotate-180' : ''"
        aria-hidden="true"
      />
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1 scale-[0.97]"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-1 scale-[0.97]"
      >
        <ul
          v-if="open"
          ref="menuEl"
          role="listbox"
          :aria-label="ariaLabel"
          class="fixed z-[2000] min-w-[280px] origin-top-right rounded-2xl moh-surface-1 p-1 shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.07]"
          :style="menuStyle"
        >
          <li
            v-for="mode in MARVIN_MODE_ORDER"
            :key="mode"
            role="option"
            :aria-selected="modelValue === mode"
            :class="[
              'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-xs transition-colors',
              modelValue === mode
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5',
            ]"
            @click="pick(mode)"
          >
            <span class="font-semibold">{{ marvinModeLabel(mode) }}</span>
            <span
              class="font-normal tabular-nums"
              :class="modelValue === mode ? 'opacity-70' : 'text-gray-400 dark:text-gray-500'"
            >
              {{ marvinModeMenuCaption(mode, costs) }}
            </span>
          </li>
        </ul>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import type { MarvinCostsDto, MarvinModeDto } from '~/types/api'
import {
  MARVIN_MODE_ORDER,
  marvinModeLabel,
  marvinModeMenuCaption,
} from '~/utils/marvin-mode'

const props = withDefaults(
  defineProps<{
    modelValue: MarvinModeDto
    costs?: MarvinCostsDto | null
    disabled?: boolean
    legend?: string
    ariaLabel?: string
    plain?: boolean
  }>(),
  { ariaLabel: 'Mode', costs: null, disabled: false, legend: '', plain: false },
)
const emit = defineEmits<{ 'update:modelValue': [MarvinModeDto] }>()

const open = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const { style: menuStyle, menuEl, place: placeMenu, reset: resetMenu } = useMenuPosition()
onClickOutside(dropdownRef, () => { open.value = false }, { ignore: [menuEl] })

watch(open, (isOpen) => {
  if (!isOpen) {
    resetMenu()
    return
  }
  const el = dropdownRef.value
  if (!el) return
  placeMenu(el, {
    menuWidth: 280,
    menuHeight: 196,
    gap: 6,
    align: 'end',
    trackViewport: true,
  })
})

function pick(mode: MarvinModeDto) {
  open.value = false
  if (mode === props.modelValue) return
  emit('update:modelValue', mode)
}
</script>

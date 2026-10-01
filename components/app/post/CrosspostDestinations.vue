<template>
  <div v-if="destinations.length" class="mt-4">
    <div v-for="row in destinations" :key="row.id" class="flex min-h-11 items-center gap-3 py-2" :class="row.disabled ? 'opacity-60' : ''">
      <img
        v-if="row.id === 'pickax'"
        src="/images/brands/pickax.png"
        alt=""
        width="22"
        height="22"
        class="h-[22px] w-[22px] shrink-0 rounded-md"
      >
      <Icon v-else name="tabler:brand-x" class="h-[22px] w-[22px] shrink-0" />
      <div class="min-w-0 flex-1">
        <span class="block text-sm font-semibold moh-text">{{ label(row) }}</span>
        <span class="block h-4 truncate text-xs moh-text-muted">{{ subtitle(row) }}</span>
      </div>
      <div class="flex h-11 w-[7.25rem] shrink-0 items-center justify-end">
        <ToggleSwitch
          v-if="row.disabled || isOff(row)"
          :model-value="false"
          :disabled="row.disabled"
          :input-id="`crosspost-${row.id}`"
          :aria-label="label(row)"
          @update:model-value="(on: boolean) => turnOn(row, on)"
        />
        <!-- Same capsule as the audience chip (Figma 304:1027), not a form select. -->
        <button
          v-else
          type="button"
          class="moh-focus inline-flex h-11 max-w-full items-center gap-1.5 rounded-full border moh-border bg-transparent px-3 text-sm font-semibold moh-text"
          :aria-label="label(row)"
          aria-haspopup="menu"
          @click="openMenu($event, row.id)"
        >
          <span>{{ modeLabel(selected[row.id]) }}</span>
          <Icon name="tabler:chevron-down" class="text-sm moh-text-muted" aria-hidden="true" />
        </button>
      </div>
      <Menu
        :ref="(el) => bindMenu(row.id, el)"
        :model="menuModel(row)"
        popup
        append-to="body"
        :base-z-index="OVERLAY_LAYERS.nestedMenu"
      >
        <template #item="{ item, props: itemProps }">
          <a v-bind="itemProps.action" class="flex min-h-11 items-center gap-2">
            <span class="flex-1">{{ item.label }}</span>
            <Icon v-if="item.mode === selected[row.id]" name="tabler:check" class="text-sm" aria-hidden="true" />
          </a>
        </template>
      </Menu>
    </div>
    <NuxtLink
      v-if="premiumRow"
      :to="premiumRow.premiumHref!"
      class="inline-flex min-h-11 items-center text-xs font-semibold underline underline-offset-2"
    >
      {{ premiumRow.premiumHref === '/settings/verification' ? 'Verify your account' : 'Upgrade to Premium' }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import type { CrosspostMode, CrosspostPayload } from '~/utils/crosspost'
import { OVERLAY_LAYERS } from '~/utils/overlay-layers'

export type CrosspostDestinationView = {
  id: 'pickax' | 'x'
  modes: CrosspostMode[]
  linkOnlyReason?: string
  disabled?: boolean
  disabledNote?: string
  allowanceNote?: string
  premiumHref?: string | null
}

const props = defineProps<{ destinations: CrosspostDestinationView[] }>()

const selected = reactive<Record<string, 'off' | CrosspostMode>>({})

const premiumRow = computed(() => props.destinations.find((row) => row.premiumHref) ?? null)

watch(() => props.destinations, (rows) => {
  for (const row of rows) {
    if (!selected[row.id]) selected[row.id] = 'off'
    const mode = selected[row.id]
    if (mode !== 'off' && !row.modes.includes(mode as CrosspostMode)) selected[row.id] = 'off'
  }
}, { immediate: true })

function label(row: CrosspostDestinationView): string {
  return row.id === 'x' ? 'Share on X' : 'Share on Pickax'
}

function isOff(row: CrosspostDestinationView): boolean {
  return (selected[row.id] ?? 'off') === 'off'
}

function defaultMode(row: CrosspostDestinationView): CrosspostMode {
  return row.id === 'pickax' ? 'link' : row.modes.includes('native') ? 'native' : 'link'
}

function turnOn(row: CrosspostDestinationView, on: boolean) {
  if (!on || row.disabled || !row.modes.length) return
  selected[row.id] = defaultMode(row)
}

function pick(row: CrosspostDestinationView, value: 'off' | CrosspostMode) {
  selected[row.id] = value === 'off' || !row.modes.includes(value) ? 'off' : value
}

type ModeItem = MenuItem & { mode: 'off' | CrosspostMode }
const menus: Record<string, { toggle: (event: Event) => void } | null> = {}

function bindMenu(id: string, el: unknown) {
  menus[id] = (el as { toggle?: (event: Event) => void } | null)?.toggle
    ? (el as { toggle: (event: Event) => void })
    : null
}

function openMenu(event: Event, id: string) {
  menus[id]?.toggle(event)
}

function modeLabel(mode: 'off' | CrosspostMode | undefined): string {
  return mode === 'link' ? 'Share' : 'Post'
}

function menuModel(row: CrosspostDestinationView): ModeItem[] {
  return menuOptions(row).map((option) => ({
    label: option.label,
    mode: option.id,
    command: () => pick(row, option.id),
  }))
}

function menuOptions(row: CrosspostDestinationView): Array<{ id: 'off' | CrosspostMode; label: string }> {
  const out: Array<{ id: 'off' | CrosspostMode; label: string }> = []
  if (row.modes.includes('native')) out.push({ id: 'native', label: 'Post' })
  if (row.modes.includes('link')) out.push({ id: 'link', label: 'Share' })
  out.push({ id: 'off', label: "Don't share" })
  return out
}

function subtitle(row: CrosspostDestinationView): string {
  if (row.disabled) return row.disabledNote || ''
  const mode = selected[row.id] ?? 'off'
  if (mode === 'native') return row.id === 'pickax' ? 'Full copy with a link to the original' : 'Your words and photos'
  if (mode === 'link') return row.linkOnlyReason || 'A link back to this post'
  return row.linkOnlyReason || row.allowanceNote || ''
}

function payload(): CrosspostPayload {
  const out: CrosspostPayload = {}
  for (const row of props.destinations) {
    if (row.disabled) continue
    const mode = selected[row.id]
    if (mode === 'link' || mode === 'native') out[row.id] = mode
  }
  return out
}

defineExpose({ payload })
</script>

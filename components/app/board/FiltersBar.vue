<template>
  <div ref="wrapEl" class="inline-flex shrink-0 items-center py-1">
    <button
      ref="triggerEl"
      type="button"
      class="filter-trigger"
      :class="{ 'is-active': activeCount > 0, 'is-open': open }"
      :aria-label="`Board filters: ${summary}`"
      :aria-controls="open ? menuId : undefined"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <Icon name="tabler:adjustments-horizontal" class="size-[18px] shrink-0" aria-hidden="true" />
      <span>Filters</span>
      <span v-if="activeCount" class="filter-count" aria-hidden="true">{{ activeCount }}</span>
      <Icon v-else name="tabler:chevron-down" class="size-3" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <div v-if="open" :id="menuId" ref="menuEl" class="filter-menu" :style="menuStyle" role="menu" aria-label="Board filters" @keydown="onMenuKey">
        <div class="filter-menu-title">Board filters</div>

        <template v-if="showRange">
          <p class="filter-section-label">Range</p>
          <div class="flex flex-wrap gap-1.5 px-3 pb-2">
            <button
              v-for="option in rangeOptions"
              :key="option.value ?? 'front'"
              type="button"
              class="range-chip"
              role="menuitemradio"
              :aria-checked="range === option.value"
              @click="emit('update:range', option.value)"
            >{{ option.label }}</button>
          </div>
        </template>

        <p class="filter-section-label" :class="{ 'filter-divider': showRange }">Audience</p>
        <button
          v-for="option in scopeOptions"
          :key="option.value"
          type="button"
          class="filter-option"
          role="menuitemradio"
          :aria-checked="scope === option.value"
          @click="setScope(option.value)"
        >
          <Icon :name="option.icon" class="filter-option-icon" :class="option.iconClass" aria-hidden="true" />
          <span class="min-w-0 flex-1"><span class="block">{{ option.title }}</span><span class="filter-hint">{{ option.hint }}</span></span>
          <Icon v-if="scope === option.value" name="tabler:check" class="size-4" aria-hidden="true" />
          <Icon v-else-if="option.locked" name="tabler:lock" class="size-4 moh-text-muted" aria-hidden="true" />
        </button>

        <p class="filter-section-label filter-divider">Tags <span class="normal-case tracking-normal font-normal">· matches any, up to 3</span></p>
        <div class="px-3 pb-2">
          <AppBoardTagPicker :model-value="tags" placeholder="Add a tag…" inline-suggestions @update:model-value="emit('update:tags', $event)" />
        </div>

        <template v-if="isAuthed">
          <p class="filter-section-label filter-divider">Your Board</p>
          <button type="button" class="filter-option" role="menuitemcheckbox" :aria-checked="showHidden" @click="emit('update:showHidden', !showHidden)">
            <Icon name="tabler:eye-off" class="filter-option-icon" aria-hidden="true" />
            <span class="min-w-0 flex-1"><span class="block">Hidden threads</span><span class="filter-hint">Only threads you hid, so you can bring them back</span></span>
            <Icon v-if="showHidden" name="tabler:check" class="size-4" aria-hidden="true" />
          </button>
        </template>

        <button v-if="activeCount" type="button" class="filter-reset" role="menuitem" @click="reset">
          <Icon name="tabler:rotate-clockwise" class="size-4" aria-hidden="true" /> Reset filters
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { BoardRange } from '~/types/api'

type Scope = 'all' | 'verifiedOnly' | 'premiumOnly'

const props = defineProps<{
  showRange: boolean
  range: BoardRange | null
  scope: Scope
  tags: string[]
  showHidden: boolean
  isAuthed: boolean
  viewerIsVerified: boolean
  viewerIsPremium: boolean
}>()

const emit = defineEmits<{
  'update:range': [value: BoardRange | null]
  'update:scope': [value: Scope]
  'update:tags': [value: string[]]
  'update:showHidden': [value: boolean]
  reset: []
}>()

const wrapEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const menuId = useId()
const { style: menuStyle, menuEl, place, reset: resetPosition } = useMenuPosition()

const rangeOptions: Array<{ value: BoardRange | null; label: string }> = [
  { value: null, label: 'Front page' },
  { value: 'day', label: 'Past day' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'year', label: 'Past year' },
  { value: 'all', label: 'All time' },
]

const scopeOptions = computed(() => [
  { value: 'all' as const, title: 'All', hint: 'Every thread on the Board', icon: 'tabler:layout-grid', iconClass: '', locked: false },
  {
    value: 'verifiedOnly' as const,
    title: 'Verified',
    hint: props.viewerIsVerified ? 'Threads for verified members' : 'Verification required to read',
    icon: 'tabler:circle-check-filled',
    iconClass: 'scope-verified',
    locked: !props.viewerIsVerified,
  },
  {
    value: 'premiumOnly' as const,
    title: 'Premium',
    hint: props.viewerIsPremium ? 'Threads for premium members' : 'Premium membership required to read',
    icon: 'tabler:rosette-discount-check',
    iconClass: 'scope-premium',
    locked: !props.viewerIsPremium,
  },
])

const activeCount = computed(() =>
  Number(props.showRange && props.range !== null)
  + Number(props.scope !== 'all')
  + Number(props.tags.length > 0)
  + Number(props.showHidden),
)

const summary = computed(() => {
  const parts: string[] = []
  if (props.showRange) parts.push(rangeOptions.find((o) => o.value === props.range)?.label ?? 'Front page')
  parts.push(scopeOptions.value.find((o) => o.value === props.scope)?.title ?? 'All')
  if (props.tags.length) parts.push(props.tags.map((t) => `#${t}`).join(' '))
  if (props.showHidden) parts.push('Hidden')
  return parts.join(', ')
})

function toggle(e: MouseEvent) {
  if (open.value) {
    close()
    return
  }
  place(e.currentTarget as HTMLElement, { align: 'start', menuWidth: 320, menuHeight: 560 })
  open.value = true
  void nextTick(() => menuEl.value?.querySelector<HTMLButtonElement>('button[aria-checked="true"], button')?.focus({ preventScroll: true }))
}

function close(restoreFocus = true) {
  open.value = false
  resetPosition()
  if (restoreFocus) triggerEl.value?.focus({ preventScroll: true })
}

function setScope(value: Scope) {
  emit('update:scope', value)
}

function reset() {
  emit('reset')
  close()
}

function onMenuKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  } else if (event.key === 'Tab' && !menuEl.value?.contains(event.target as Node)) {
    close(false)
  }
}

watch(
  open,
  (isOpen, _prev, onCleanup) => {
    if (!import.meta.client || !isOpen) return
    const onPointerDown = (e: Event) => {
      const target = e.target as Node | null
      if (!target) return
      if (wrapEl.value?.contains(target) || menuEl.value?.contains(target)) return
      close(false)
    }
    window.addEventListener('mousedown', onPointerDown, true)
    window.addEventListener('touchstart', onPointerDown, true)
    onCleanup(() => {
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('touchstart', onPointerDown, true)
    })
  },
  { flush: 'post' },
)
</script>

<style scoped>
.filter-trigger { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 36px; padding: 0 10px; border: 1px solid var(--moh-border); border-radius: 10px; font-size: 12px; font-weight: 600; color: var(--moh-text-muted); background: var(--moh-bg); cursor: pointer; }
.filter-trigger::before { content: ""; position: absolute; inset: -4px 0; }
.filter-trigger:hover, .filter-trigger.is-open { background: var(--moh-surface-2); color: var(--moh-text); }
.filter-trigger.is-active { color: var(--moh-text); }
.filter-count { display: grid; place-items: center; min-width: 20px; height: 20px; border-radius: 50%; background: var(--moh-text); color: var(--moh-bg); font-size: 11px; }
.filter-menu { position: fixed; z-index: 9999; width: 320px; max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); overflow-y: auto; padding: 8px; border-radius: 20px; border: 1px solid var(--moh-border); background: var(--moh-bg); color: var(--moh-text); box-shadow: 0 16px 48px #0003; }
.filter-menu-title { padding: 12px 12px 16px; font-size: 17px; font-weight: 600; }
.filter-section-label { padding: 8px 12px; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--moh-text-muted); }
.filter-divider { border-top: 1px solid var(--moh-border); margin-top: 8px; padding-top: 16px; }
.filter-option { display: flex; align-items: center; gap: 12px; min-height: 48px; width: 100%; padding: 12px; border-radius: 12px; text-align: left; font-size: 15px; font-weight: 600; cursor: pointer; }
.filter-option[aria-checked=true] { background: var(--moh-surface-2); }
.filter-option:hover { background: var(--moh-surface); }
.filter-option-icon { width: 20px; height: 20px; flex-shrink: 0; color: var(--moh-text-muted); }
.filter-hint { display: block; margin-top: 3px; font-size: 12px; line-height: 18px; font-weight: 400; color: var(--moh-text-muted); }
.range-chip { min-height: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--moh-border); font-size: 13px; font-weight: 600; color: var(--moh-text-muted); cursor: pointer; }
.range-chip:hover { color: var(--moh-text); background: var(--moh-surface); }
.range-chip[aria-checked=true] { color: var(--moh-bg); background: var(--moh-text); border-color: var(--moh-text); }
.scope-verified { color: var(--moh-verified); }
.scope-premium { color: var(--moh-premium); }
.filter-reset { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 48px; padding: 12px; margin-top: 8px; border-top: 1px solid var(--moh-border); font-size: 13px; font-weight: 600; color: var(--moh-text-muted); cursor: pointer; }
button:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: -2px; }
</style>

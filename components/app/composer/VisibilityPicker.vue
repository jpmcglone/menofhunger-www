<template>
  <div ref="wrapEl" class="relative">
    <button
      ref="btnEl"
      type="button"
      class="moh-focus moh-surface-hover inline-flex items-center justify-center min-h-11 gap-2 rounded-full border moh-border px-3 transition-colors"
      :title="`Post audience: ${label}`"
      :aria-label="`Select post visibility: ${label}`"
      aria-haspopup="menu"
      :aria-expanded="open"
      :disabled="!viewerIsVerified"
      @click="viewerIsVerified ? toggle() : null"
    >
      <AppComposerAudienceLabel :visibility="modelValue" />
      <Icon v-if="viewerIsVerified" name="tabler:chevron-down" class="text-base moh-text-muted" aria-hidden="true" />
    </button>

    <!-- Teleport so overflow:hidden on parent modals/containers doesn't clip the panel -->
    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        class="fixed z-[2000] w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
        :style="dropdownStyle"
        role="menu"
        aria-label="Post visibility"
      >
      <button
        v-if="allowed.includes('public')"
        type="button"
        class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
        role="menuitem"
        @click="set('public')"
      >
        <AppComposerAudienceLabel visibility="public" />
      </button>

      <button
        v-if="allowed.includes('verifiedOnly')"
        type="button"
        class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-verified"
        role="menuitem"
        @click="set('verifiedOnly')"
      >
        <AppComposerAudienceLabel visibility="verifiedOnly" />
      </button>

      <button
        v-if="allowed.includes('premiumOnly')"
        type="button"
        :disabled="!isPremium"
        :class="[
          'w-full text-left px-3 py-2 text-sm font-semibold transition-colors',
          isPremium ? 'moh-menuitem-premium' : 'text-gray-400 dark:text-zinc-600 cursor-not-allowed'
        ]"
        role="menuitem"
        @click="isPremium ? set('premiumOnly') : null"
      >
        <AppComposerAudienceLabel visibility="premiumOnly" />
        <span v-if="!isPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
      </button>

      <button
        v-if="allowed.includes('onlyMe')"
        type="button"
        class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-onlyme"
        role="menuitem"
        @click="set('onlyMe')"
      >
        <AppComposerAudienceLabel visibility="onlyMe" />
      </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { PostVisibility } from '~/types/api'

const props = defineProps<{
  modelValue: PostVisibility
  allowed: PostVisibility[]
  viewerIsVerified: boolean
  isPremium: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: PostVisibility): void
}>()

const modelValue = computed(() => props.modelValue)
const allowed = computed(() => props.allowed ?? [])
const viewerIsVerified = computed(() => Boolean(props.viewerIsVerified))
const isPremium = computed(() => Boolean(props.isPremium))

const label = computed(() => {
  if (modelValue.value === 'verifiedOnly') return 'Verified'
  if (modelValue.value === 'premiumOnly') return 'Premium'
  if (modelValue.value === 'onlyMe') return 'Only me'
  return 'Public'
})

const open = ref(false)
const wrapEl = ref<HTMLElement | null>(null)
const btnEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)

// Position the teleported panel relative to the button (opens upward when near bottom).
const dropdownStyle = computed(() => {
  if (!open.value || !btnEl.value) return {}
  const r = btnEl.value.getBoundingClientRect()
  const left = Math.max(8, Math.min(r.left, window.innerWidth - 232))
  const panelH = 180 // estimated max panel height
  const spaceBelow = window.innerHeight - r.bottom
  const openUp = spaceBelow < panelH + 8
  return openUp
    ? { bottom: `${window.innerHeight - r.top + 4}px`, left: `${left}px` }
    : { top: `${r.bottom + 4}px`, left: `${left}px` }
})

function set(v: PostVisibility) {
  emit('update:modelValue', v)
  open.value = false
}

function toggle() {
  open.value = !open.value
}

function onDocPointerDown(e: PointerEvent) {
  if (!open.value) return
  const el = wrapEl.value
  const panel = panelEl.value
  const t = e.target as Node | null
  if (!el || !t) return
  // The panel is teleported to <body> so it is not inside wrapEl — treat it
  // as "inside" so that option clicks aren't swallowed before @click fires.
  if (el.contains(t) || panel?.contains(t)) return
  open.value = false
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('pointerdown', onDocPointerDown, { capture: true })
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('pointerdown', onDocPointerDown, { capture: true } as any)
})
</script>

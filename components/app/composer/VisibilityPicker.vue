<template>
  <div ref="wrapEl" class="relative">
    <button
      type="button"
      class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold leading-none transition-colors"
      :class="pillClass"
      aria-label="Select post visibility"
      :disabled="!viewerIsVerified"
      @click="viewerIsVerified ? toggle() : null"
    >
      <Icon v-if="modelValue === 'public'" name="tabler:world" class="mr-1 text-[10px] opacity-80" aria-hidden="true" />
      <AppVerifiedBadge
        v-else-if="modelValue === 'verifiedOnly'"
        class="mr-1"
        status="identity"
        :premium="false"
        :show-tooltip="false"
      />
      <AppVerifiedBadge
        v-else-if="modelValue === 'premiumOnly'"
        class="mr-1"
        status="identity"
        :premium="true"
        :show-tooltip="false"
      />
      <Icon v-else-if="modelValue === 'onlyMe'" name="tabler:eye-off" class="mr-1 text-[10px] opacity-80" aria-hidden="true" />
      {{ label }}
      <Icon v-if="viewerIsVerified" name="tabler:chevron-down" class="ml-1 text-[9px] opacity-80" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
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
        <span class="inline-flex items-center gap-2">
          <Icon name="tabler:world" class="text-[12px] opacity-80" aria-hidden="true" />
          <span>Public</span>
        </span>
      </button>

      <button
        v-if="allowed.includes('verifiedOnly')"
        type="button"
        class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-verified"
        role="menuitem"
        @click="set('verifiedOnly')"
      >
        <span class="inline-flex items-center gap-2">
          <AppVerifiedBadge status="identity" :premium="false" :show-tooltip="false" />
          <span>Verified only</span>
        </span>
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
        <span class="inline-flex items-center gap-2">
          <AppVerifiedBadge status="identity" :premium="true" :show-tooltip="false" />
          <span>Premium only</span>
        </span>
        <span v-if="!isPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
      </button>

      <button
        v-if="allowed.includes('onlyMe')"
        type="button"
        class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-onlyme"
        role="menuitem"
        @click="set('onlyMe')"
      >
        <span class="inline-flex items-center gap-2">
          <Icon name="tabler:eye-off" class="text-[12px]" aria-hidden="true" />
          <span>Only me</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PostVisibility } from '~/types/api'
import { filterPillClasses } from '~/utils/post-visibility'

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

const pillClass = computed(() => `${filterPillClasses(modelValue.value, false)} bg-transparent hover:bg-transparent dark:hover:bg-transparent`)

const open = ref(false)
const wrapEl = ref<HTMLElement | null>(null)

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
  const t = e.target as Node | null
  if (!el || !t) return
  if (el.contains(t)) return
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


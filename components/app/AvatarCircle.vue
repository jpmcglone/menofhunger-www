<template>
  <div
    ref="wrapEl"
    :class="[
      'shrink-0 overflow-hidden rounded-full',
      bgClass,
      sizeClass,
    ]"
    aria-hidden="true"
  >
    <img
      v-if="src"
      :src="src"
      alt=""
      class="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
    >
    <div v-else class="h-full w-full flex items-center justify-center">
      <span
        class="moh-avatar-initial leading-none"
        :style="initialStyle"
      >{{ initial }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string | null
    name?: string | null
    username?: string | null
    sizeClass?: string
    bgClass?: string
  }>(),
  {
    src: null,
    name: null,
    username: null,
    sizeClass: 'h-10 w-10',
    bgClass: 'bg-gray-200 dark:bg-zinc-800',
  },
)

const wrapEl = ref<HTMLElement | null>(null)
const diameterPx = ref<number>(40)

function measure() {
  const el = wrapEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const d = Math.max(1, Math.min(r.width, r.height))
  diameterPx.value = d
}

onMounted(() => {
  measure()
  if (!import.meta.client) return
  const el = wrapEl.value
  if (!el) return

  const ro = new ResizeObserver(() => measure())
  ro.observe(el)
  onBeforeUnmount(() => ro.disconnect())
})

const initialStyle = computed<Record<string, string>>(() => {
  // Keep letter size proportional to avatar diameter.
  // (0.58 feels good for most sizes; adjust later if needed.)
  const d = diameterPx.value
  const fontPx = Math.max(10, Math.round(d * 0.58))
  const strokePx = Math.max(2, Math.round(fontPx * 0.14))
  return {
    fontSize: `${fontPx}px`,
    WebkitTextStrokeWidth: `${strokePx}px`,
  }
})

const initial = computed(() => {
  const raw = (props.name ?? props.username ?? '').trim()
  if (!raw) return '?'
  return raw.slice(0, 1).toUpperCase()
})
</script>


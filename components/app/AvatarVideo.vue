<template>
  <span ref="host" class="absolute inset-0 overflow-hidden" aria-hidden="true">
    <canvas ref="canvas" class="relative h-full w-full opacity-0" />
  </span>
</template>

<script setup lang="ts">
import type { AvatarVideoDto } from '~/types/api-contracts.gen'
import { subscribeAvatarVideo } from '~/utils/avatar-video-playback'

const animate = useAvatarAnimation()
const props = defineProps<{ asset: AvatarVideoDto }>()
const host = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
let visible = false
let unsubscribe: (() => void) | undefined
let observer: IntersectionObserver | undefined
let resize: ResizeObserver | undefined
let motion: MediaQueryList | undefined
let clean: (() => void) | undefined

function update() {
  unsubscribe?.(); unsubscribe = undefined
  const reducedData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  if (!animate.value || !visible || document.hidden || motion?.matches || reducedData || !canvas.value) return
  unsubscribe = subscribeAvatarVideo(props.asset, canvas.value)
}

onMounted(() => {
  motion = matchMedia('(prefers-reduced-motion: reduce)')
  observer = new IntersectionObserver(([entry]) => { visible = Boolean(entry?.isIntersecting); update() })
  observer.observe(host.value!)
  resize = new ResizeObserver(([entry]) => {
    if (!entry || !canvas.value) return
    canvas.value.width = Math.max(1, Math.min(320, Math.ceil(entry.contentRect.width * devicePixelRatio)))
    canvas.value.height = canvas.value.width
  })
  resize.observe(host.value!)
  document.addEventListener('visibilitychange', update)
  motion.addEventListener('change', update)
  clean = () => { document.removeEventListener('visibilitychange', update); motion?.removeEventListener('change', update) }
})
watch(() => [props.asset.id, animate.value], () => { if (import.meta.client) update() })
onBeforeUnmount(() => { unsubscribe?.(); observer?.disconnect(); resize?.disconnect(); clean?.() })
</script>

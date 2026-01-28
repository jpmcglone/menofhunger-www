<template>
  <span
    v-if="isVerified"
    :class="['inline-block shrink-0 align-middle', sizeClass]"
    :style="iconStyle"
    v-tooltip="tooltip"
    aria-label="Verified"
  />
</template>

<script setup lang="ts">
import badgeUrl from '~/assets/images/verified-badge.png'

type VerifiedStatus = 'none' | 'identity' | 'manual'
type Size = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    status?: VerifiedStatus | null
    premium?: boolean
    size?: Size
  }>(),
  { size: 'sm', premium: false }
)

// Twitter-ish blue; works on both light/dark.
const badgeBlue = '#1D9BF0'
// Premium orange.
const badgeOrange = '#F59E0B'

const isVerified = computed(() => Boolean(props.status && props.status !== 'none'))

const badgeColor = computed(() => {
  return isVerified.value && props.premium ? badgeOrange : badgeBlue
})

const tooltip = computed(() => {
  const text = props.status === 'identity' ? 'Identity verified' : props.status === 'manual' ? 'Manually verified' : ''
  if (!text) return null
  // Centered under the badge, no arrow (handled by CSS).
  return { value: text, class: 'moh-tooltip', position: 'bottom' as const }
})

const sizeClass = computed(() => {
  // Scale with surrounding text so it always "matches the font" it's next to.
  // `md` is a touch larger (used in a few header contexts).
  return props.size === 'md' ? 'h-[1.15em] w-[1.15em]' : 'h-[1em] w-[1em]'
})

const iconStyle = computed<Record<string, string>>(() => {
  // Treat the PNG as an alpha mask so we can tint it any color cleanly.
  const url = `url(${badgeUrl})`
  return {
    backgroundColor: badgeColor.value,
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
  }
})
</script>


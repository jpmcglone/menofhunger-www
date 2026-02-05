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
type Size = 'xs' | 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    status?: VerifiedStatus | null
    premium?: boolean
    size?: Size
    showTooltip?: boolean
  }>(),
  { size: 'sm', premium: false, showTooltip: true }
)

// Use semantic CSS variables so the accent stays consistent across the app theme.
const badgeBlue = 'var(--moh-verified)'
const badgeOrange = 'var(--moh-premium)'

const isVerified = computed(() => Boolean(props.status && props.status !== 'none'))

const badgeColor = computed(() => {
  return isVerified.value && props.premium ? badgeOrange : badgeBlue
})

const tooltip = computed(() => {
  if (!props.showTooltip) return null
  const text = props.status === 'identity' ? 'Identity verified' : props.status === 'manual' ? 'Manually verified' : ''
  if (!text) return null
  // Centered under the badge, no arrow (handled by CSS).
  return { value: text, class: 'moh-tooltip', position: 'bottom' as const }
})

const sizeClass = computed(() => {
  // Scale with surrounding text so it always "matches the font" it's next to.
  // `md` is a touch larger (used in a few header contexts).
  if (props.size === 'xs') return 'h-[0.85em] w-[0.85em]'
  if (props.size === 'md') return 'h-[1.15em] w-[1.15em]'
  return 'h-[1em] w-[1em]'
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


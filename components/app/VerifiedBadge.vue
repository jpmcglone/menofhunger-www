<template>
  <span
    v-if="isVerified"
    :class="['inline-block shrink-0 align-middle', sizeClass]"
    :style="iconStyle"
    v-tooltip="tooltip"
    :aria-label="ariaLabel"
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
    premiumPlus?: boolean
    size?: Size
    showTooltip?: boolean
  }>(),
  { size: 'sm', premium: false, premiumPlus: false, showTooltip: true }
)

// Use semantic CSS variables so the accent stays consistent across the app theme.
const badgeBlue = 'var(--moh-verified)'
const badgeOrange = 'var(--moh-premium)'

const isVerified = computed(() => Boolean(props.status && props.status !== 'none'))
const isPremium = computed(() => Boolean(props.premium || props.premiumPlus))

const badgeColor = computed(() => {
  return isVerified.value && isPremium.value ? badgeOrange : badgeBlue
})

const verificationText = computed(() => {
  return props.status === 'identity' ? 'Identity verified' : props.status === 'manual' ? 'Manually verified' : ''
})

const tooltip = computed(() => {
  if (!props.showTooltip) return null
  const base = verificationText.value
  if (!base) return null

  // Premium badge should explicitly call out premium status.
  const text = props.premiumPlus ? `Premium+ member · ${base}` : props.premium ? `Premium member · ${base}` : base
  // Centered under the badge, no arrow (handled by CSS).
  return { value: text, class: 'moh-tooltip', position: 'bottom' as const }
})

const ariaLabel = computed(() => {
  const base = verificationText.value
  if (!base) return 'Verified'
  if (props.premiumPlus) return `Premium+ member, ${base}`
  return props.premium ? `Premium member, ${base}` : base
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


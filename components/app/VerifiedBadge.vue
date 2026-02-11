<template>
  <span v-if="isVerified || showSteward" class="inline-flex shrink-0 align-middle items-center gap-1">
    <span
      v-if="isVerified"
      ref="verifiedEl"
      :class="['inline-block', sizeClass]"
      :style="iconStyle"
      v-tooltip="tooltip"
      :aria-label="ariaLabel"
      @mouseenter="updateTooltipPlacement"
    />
    <span
      v-if="showSteward"
      :class="['inline-flex items-center justify-center text-[var(--moh-premium)]', sizeClass]"
      v-tooltip="stewardTooltip"
      aria-label="Steward (Premium+)"
    >
      <Icon name="tabler:shield-star" class="h-full w-full" aria-hidden="true" />
    </span>
  </span>
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
    isOrganization?: boolean
    stewardBadgeEnabled?: boolean
    size?: Size
    showTooltip?: boolean
  }>(),
  { size: 'sm', premium: false, premiumPlus: false, isOrganization: false, stewardBadgeEnabled: true, showTooltip: true }
)

// Use semantic CSS variables so the accent stays consistent across the app theme.
const badgeBlue = 'var(--moh-verified)'
const badgeOrange = 'var(--moh-premium)'
const badgeOrgLowContrast = 'var(--moh-org)'

const isVerified = computed(() => Boolean(props.status && props.status !== 'none'))
const isPremium = computed(() => Boolean(props.premium || props.premiumPlus))
const showSteward = computed(() => Boolean(props.premiumPlus) && props.stewardBadgeEnabled !== false)
const isOrganization = computed(() => Boolean(props.isOrganization))

const badgeColor = computed(() => {
  if (isOrganization.value) return badgeOrgLowContrast
  return isVerified.value && isPremium.value ? badgeOrange : badgeBlue
})

const verificationText = computed(() => {
  return props.status === 'identity' ? 'Identity verified' : props.status === 'manual' ? 'Manually verified' : ''
})

const tooltipPlacement = ref<'right' | 'left'>('right')
const verifiedEl = ref<HTMLElement | null>(null)

function estimateTooltipWidthPx(text: string): number {
  // Rough estimate: 7px per char + padding, capped.
  // Good enough to decide left/right without measuring DOM tooltip.
  const len = (text ?? '').length
  return Math.min(320, Math.max(140, Math.round(len * 7 + 24)))
}

function updateTooltipPlacement() {
  if (!import.meta.client) return
  const node = verifiedEl.value
  if (!node) return
  const base = verificationText.value
  if (!base) return
  const text = isOrganization.value ? 'Organization account' : base

  const rect = node.getBoundingClientRect()
  const margin = 12
  const est = estimateTooltipWidthPx(text)
  const rightSpace = window.innerWidth - rect.right - margin
  const leftSpace = rect.left - margin

  if (rightSpace >= est) tooltipPlacement.value = 'right'
  else if (leftSpace >= est) tooltipPlacement.value = 'left'
  else tooltipPlacement.value = rightSpace >= leftSpace ? 'right' : 'left'
}

const tooltip = computed(() => {
  if (!props.showTooltip) return null
  const base = verificationText.value
  if (!base) return null

  const text = isOrganization.value ? 'Organization account' : base
  // Prefer right, flip to left when needed. No arrow (handled by CSS).
  return { value: text, class: 'moh-tooltip', position: tooltipPlacement.value }
})

const stewardTooltip = computed(() => {
  if (!props.showTooltip) return null
  if (!showSteward.value) return null
  return { value: 'Steward (Premium+)', class: 'moh-tooltip', position: 'right' as const }
})

const ariaLabel = computed(() => {
  const base = verificationText.value
  if (!base) return 'Verified'
  return isOrganization.value ? 'Organization account' : base
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


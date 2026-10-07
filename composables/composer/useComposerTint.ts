import type { ComputedRef, Ref } from 'vue'
import type { PostVisibility } from '~/types/api'
import {
  PRIMARY_GROUP_SKY,
  PRIMARY_ONLYME_PURPLE,
  PRIMARY_PREMIUM_ORANGE,
  PRIMARY_TEXT_DARK,
  PRIMARY_TEXT_LIGHT,
  PRIMARY_VERIFIED_BLUE,
  primaryPaletteToCssVars,
} from '~/utils/theme-tint'

export function useComposerTint(opts: {
  useGroupScopeChrome: ComputedRef<boolean>
  effectiveVisibility: ComputedRef<PostVisibility>
  scheduledAt: Ref<Date | null>
  checkinPrompt: ComputedRef<string | undefined>
  replyShowsGroupScope: ComputedRef<boolean>
}) {
  const composerHashtagColor = computed(() => {
    if (opts.useGroupScopeChrome.value) return 'var(--moh-group)'
    const v = opts.effectiveVisibility.value
    if (v === 'premiumOnly') return 'var(--moh-premium)'
    if (v === 'verifiedOnly') return 'var(--moh-verified)'
    if (v === 'onlyMe') return 'var(--moh-onlyme)'
    return 'var(--moh-hashtag-muted)'
  })

  const composerUploadBarColor = computed(() => {
    if (opts.useGroupScopeChrome.value) return 'var(--moh-group)'
    const v = opts.effectiveVisibility.value
    if (v === 'verifiedOnly') return 'var(--moh-verified)'
    if (v === 'premiumOnly') return 'var(--moh-premium)'
    if (v === 'onlyMe') return 'var(--moh-onlyme)'
    return 'var(--p-primary-color)'
  })

  const scheduleAccentColor = computed<string | null>(() => {
    if (!opts.scheduledAt.value) return null
    if (opts.useGroupScopeChrome.value) return 'var(--moh-group)'
    const v = opts.effectiveVisibility.value
    if (v === 'verifiedOnly') return 'var(--moh-verified)'
    if (v === 'premiumOnly') return 'var(--moh-premium)'
    if (v === 'onlyMe') return 'var(--moh-onlyme)'
    return null
  })

  const composerTintCss = computed(() => {
    const baseSel = 'html .moh-composer-tint'
    const darkSel = 'html.dark .moh-composer-tint'
    if (opts.useGroupScopeChrome.value) {
      return (
        primaryPaletteToCssVars(PRIMARY_GROUP_SKY, baseSel) +
        primaryPaletteToCssVars(PRIMARY_GROUP_SKY, darkSel)
      )
    }
    const v = opts.effectiveVisibility.value
    if (v === 'verifiedOnly') {
      return primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, baseSel) + primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, darkSel)
    }
    if (v === 'premiumOnly') {
      return primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, baseSel) + primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, darkSel)
    }
    if (v === 'onlyMe') {
      return primaryPaletteToCssVars(PRIMARY_ONLYME_PURPLE, baseSel) + primaryPaletteToCssVars(PRIMARY_ONLYME_PURPLE, darkSel)
    }
    return primaryPaletteToCssVars(PRIMARY_TEXT_LIGHT, baseSel) + primaryPaletteToCssVars(PRIMARY_TEXT_DARK, darkSel)
  })
  useHead({ style: [{ key: 'moh-composer-tint', textContent: () => composerTintCss.value }] })

  const isDarkMode = computed(() => Boolean(useColorMode().value === 'dark'))
  const composerTextareaVars = computed<Record<string, string>>(() => {
    if (opts.useGroupScopeChrome.value) {
      return { '--moh-compose-accent': 'var(--moh-group)', '--moh-compose-ring': 'var(--moh-group-ring)' }
    }
    const v = opts.effectiveVisibility.value
    if (v === 'verifiedOnly') return { '--moh-compose-accent': 'var(--moh-verified)', '--moh-compose-ring': 'var(--moh-verified-ring)' }
    if (v === 'premiumOnly') return { '--moh-compose-accent': 'var(--moh-premium)', '--moh-compose-ring': 'var(--moh-premium-ring)' }
    if (v === 'onlyMe') return { '--moh-compose-accent': 'var(--moh-onlyme)', '--moh-compose-ring': 'var(--moh-onlyme-ring)' }
    return isDarkMode.value
      ? { '--moh-compose-accent': 'rgba(255, 255, 255, 0.85)', '--moh-compose-ring': 'rgba(255, 255, 255, 0.25)' }
      : { '--moh-compose-accent': 'rgba(0, 0, 0, 0.85)', '--moh-compose-ring': 'rgba(0, 0, 0, 0.18)' }
  })

  const postButtonClass = computed(() => {
    if (opts.checkinPrompt.value) return 'moh-btn-tone !border-[var(--moh-checkin)] !bg-[var(--moh-checkin)] !text-white'
    if (opts.replyShowsGroupScope.value) {
      return 'moh-btn-tone !border-[color:var(--moh-group)] !bg-[color:var(--moh-group)] !text-white'
    }
    const v = opts.effectiveVisibility.value
    if (v === 'verifiedOnly') return 'moh-btn-verified moh-btn-tone'
    if (v === 'premiumOnly') return 'moh-btn-premium moh-btn-tone'
    if (v === 'onlyMe') return 'moh-btn-onlyme moh-btn-tone'
    return '!border-[color:var(--moh-button-primary-fill)] !bg-[var(--moh-button-primary-fill)] !text-[var(--moh-button-primary-label)]'
  })

  return {
    composerHashtagColor,
    composerUploadBarColor,
    scheduleAccentColor,
    composerTintCss,
    composerTextareaVars,
    postButtonClass,
  }
}

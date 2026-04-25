import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  // In the Nuxt Vitest environment, `import.meta.url` can be a virtual URL.
  // Use CWD (repo root in CI/local) to keep this stable.
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('hydration guardrails (structural)', () => {
  it('does not inject AdSense loader into initial HTML head', () => {
    const nuxtConfig = readFromRepo('nuxt.config.ts')
    expect(nuxtConfig).not.toMatch(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/)
  })

  it('keeps rail ad mount point behind a client-only boundary', () => {
    const layout = readFromRepo('layouts/app.vue')
    expect(layout).toMatch(/<ClientOnly>[\s\S]*<AppAdSlot\s+placement="rail"\s*\/>/)
  })

  it('keeps AppAdSlot free of ClientOnly/Suspense and guards provider DOM behind onMounted', () => {
    const adSlot = readFromRepo('components/app/AdSlot.vue')
    expect(adSlot).not.toMatch(/<ClientOnly>/)
    expect(adSlot).toMatch(/v-if="mounted\s*&&\s*shouldShowAd\s*&&\s*adsenseEnabled"/)
    expect(adSlot).toMatch(/onMounted\(\(\)\s*=>\s*{\s*[\s\S]*mounted\.value\s*=\s*true/)
  })

  it('does not use module-scope topic options caches as render inputs', () => {
    const useTopicOptions = readFromRepo('composables/useTopicOptions.ts')
    expect(useTopicOptions).not.toMatch(/TOPIC_OPTIONS_CACHE/)
    expect(useTopicOptions).toMatch(/useState<.*>\('moh\.topicOptions\.v1'/)
  })

  it('gates mention tier inference until after mount (prevents SSR/client first-render drift)', () => {
    const useMention = readFromRepo('composables/useMentionAutocomplete.ts')
    expect(useMention).toMatch(/const mounted = ref\(false\)/)
    expect(useMention).toMatch(/onMounted\(\(\)\s*=>\s*{\s*[\s\S]*mounted\.value\s*=\s*true/)
    expect(useMention).toMatch(/if\s*\(!mounted\.value\)\s*return/)
  })

  it('uses deterministic ids for avatar SVG masks', () => {
    const avatarCircle = readFromRepo('components/app/AvatarCircle.vue')
    expect(avatarCircle).toMatch(/idleClockMaskId = `idle-clock-mask-\$\{useId\(\)\}`/)
    expect(avatarCircle).not.toMatch(/idle-clock-mask-\$\{Math\.random\(/)
  })

  it('gates right-rail media-query structure with hydrated media query helper', () => {
    const layout = readFromRepo('layouts/app.vue')
    expect(layout).toMatch(/const isRightRailBreakpointUp = useHydratedMediaQuery\('\(min-width: 962px\)'\)/)
  })

  it('gates right-rail who-to-follow fetch until after hydration', () => {
    const layout = readFromRepo('layouts/app.vue')
    expect(layout).toMatch(/useWhoToFollow\(\{[\s\S]*enabled:\s*computed\(\(\)\s*=>\s*hydrated\.value\s*&&\s*!isRightRailForcedHidden\.value\)/)
  })

  it('gates mobile bottom-sheet mounting with hydrated media query helper', () => {
    const tabBar = readFromRepo('components/app/TabBar.vue')
    expect(tabBar).toMatch(/v-if="isMobileHydrated"/)
    expect(tabBar).toMatch(/const isMobileHydrated = useHydratedMediaQuery\('\(max-width: 767px\)'\)/)
  })

  it('avoids inline Date rendering in landing template', () => {
    const landing = readFromRepo('pages/index.vue')
    expect(landing).not.toMatch(/new Date\(\)\.getFullYear\(\)/)
    expect(landing).toMatch(/currentYear = new Date\(\)\.getUTCFullYear\(\)/)
  })

  it('uses stable non-index keys for notification media previews', () => {
    const row = readFromRepo('components/app/NotificationRow.vue')
    const group = readFromRepo('components/app/NotificationGroupRow.vue')
    expect(row).toMatch(/:key="notificationMediaPreviewKey\(m, idx\)"/)
    expect(group).toMatch(/:key="groupMediaPreviewKey\(m, idx\)"/)
  })

  it('gates the daily check-in hero on `heroResolved` so SSR never renders the wrong variant', () => {
    const home = readFromRepo('pages/home.vue')
    // Full and compact hero are both gated on heroResolved + the auth-derived hasCheckedInToday.
    // Without this gate we'd flash the full hero on first paint, then collapse it into the
    // compact one as soon as /checkins/today resolves on the client.
    expect(home).toMatch(/<AppFeedDailyCheckinHero\s+v-if="heroResolved && !hasCheckedInToday"/)
    expect(home).toMatch(/<AppFeedDailyCheckinHero\s+v-if="heroResolved && hasCheckedInToday"[\s\S]*?compact/)
    // heroResolved itself must require both `hydrated` AND a known checkin state (or unauth viewer).
    expect(home).toMatch(/const heroResolved = computed\(\(\) => {[\s\S]*?if \(!hydrated\.value\) return false[\s\S]*?if \(!isAuthed\.value\) return true[\s\S]*?return checkinState\.value !== null/)
  })
})


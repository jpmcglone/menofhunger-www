<template>
  <!-- Two scrollers:
       - Left rail (independent, only scrolls when pointer is over it)
       - Main scroller (center + right share scroll) -->
  <Transition
    appear
    enter-active-class="transition-opacity duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-250 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="showStatusBg" class="moh-status-bg" aria-hidden="true" />
  </Transition>

  <!-- Full-viewport background so safe areas get the app texture. -->
  <div class="fixed inset-0 z-0 moh-bg moh-texture" aria-hidden="true" />

  <div class="relative z-10">
    <!-- Global popovers, modals, emoji floats, lightbox. -->
    <AppLayoutGlobalOverlays :show-radio-chat="showRadioChat" />

    <!-- Socket + API connectivity banners. -->
    <AppLayoutConnectionBanners />

    <div
      ref="layoutViewportEl"
      :class="['overflow-hidden moh-bg moh-text', route.path === '/home' ? '' : 'moh-texture moh-vignette', showStatusBg ? 'moh-status-tone' : '']"
      :style="shellStyle"
    >
      <div class="mx-auto flex h-full w-full max-w-6xl xl:max-w-7xl">
        <!-- Left Nav (independent scroll) -->
        <AppLayoutLeftRail
          ref="leftRailRef"
          :compact="navCompactMode"
          :composer="composer"
          :scroll-middle-to-top="scrollMiddleToTop"
        />

        <!-- Columns 2 + 3: separate scroll zones (independent). -->
        <div class="flex min-w-0 flex-1 min-h-0">
          <!-- Middle / Feed (scroll zone #2) -->
          <main
            :class="[
              // `min-h-0` is critical so inner scroll containers can actually scroll (flexbox default min-height:auto can block it).
              'min-w-0 min-h-0 flex-1 overflow-x-hidden flex flex-col moh-surface-1',
              route.path === '/home' ? '' : 'moh-texture',
              // Right rail appears at a custom breakpoint between md and lg (~962px)
              !isRightRailForcedHidden ? 'min-[962px]:border-r moh-border' : '',
            ]"
          >
            <div
              id="moh-middle-scroller"
              ref="middleScrollerEl"
              :class="[
                'no-scrollbar min-w-0 flex-1 overflow-x-hidden flex flex-col',
                anyOverlayOpen || (isMessagesPage && hideTopBar) ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain',
              ]"
              :style="!hideTopBar ? { scrollPaddingTop: 'var(--moh-title-bar-height, 4rem)' } : undefined"
            >
              <div
                v-if="!hideTopBar"
                ref="titleBarEl" data-media-occluder
                class="sticky top-0 z-50 shrink-0 moh-frosted"
              >
                <AppLayoutDayBanner />
                <!-- Admin impersonation sits above the title: it changes who "you" are. -->
                <AppLayoutImpersonationBanner />
                <!-- Email verification banner should sit ABOVE the title bar (when title bar is shown). -->
                <AppLayoutEmailUnverifiedBanner />

                <AppLayoutTitleBarHeader :route-title="title" />
              </div>

              <!-- hideTopBar pages own their sticky header. The day line scrolls away
                   with the page so that header can pin to the top. Status banners stay
                   pinned; their height is --moh-title-bar-height so page stickies sit below them. -->
              <template v-if="hideTopBar">
                <AppLayoutDayBanner />
                <div ref="pinnedBannerEl" class="sticky top-0 z-50">
                  <AppLayoutImpersonationBanner />
                  <AppLayoutEmailUnverifiedBanner />
                </div>
              </template>

            <div
              ref="middleContentEl"
              :class="[
                // Always stretch to bottom so two-pane pages can fill height.
                'flex-1 min-h-0',
                // Layout containers should not add padding. Pages/components own gutters and spacing.
                isMessagesPage && hideTopBar ? 'flex h-full min-h-0 flex-col overflow-hidden' : '',
                groupTabsView ? 'flex flex-col' : '',
              ]"
            >
              <AppPersonAccountSwitchPrompt
                v-if="personOnlyBlockedFeature"
                :feature="personOnlyBlockedFeature"
              />
              <template v-else>
                <AppChannelsGroupNavigation v-if="groupTabsView" :group="groupTabsView.group" :selected="groupTabsView.selected" />
                <div :class="groupTabsView ? 'min-h-0 flex-1' : 'contents'"><slot /></div>
                <ClientOnly>
                  <AppGroupsGroupDialogs v-if="groupDialogGroup" :group="groupDialogGroup" />
                </ClientOnly>
              </template>
            </div>
            </div>

            <AppLayoutMobileBottomChrome
              v-model:pad-active="radioChromePadActive"
              :any-overlay-open="anyOverlayOpen"
              :is-keyboard-open="isKeyboardOpen"
              :radio-has-station="radioHasStation"
              :tab-items="tabItems"
            />

            <!-- Radio player row: bottom of the middle column on desktop only. -->
            <div
              v-if="radioHasStation"
              id="moh-radio-desktop"
              class="moh-radio-bar dark hidden md:flex items-center shrink-0 overflow-visible border-t border-zinc-800 bg-black text-white"
              :style="{ height: 'var(--moh-radio-bar-height, 4rem)' }"
            >
              <div class="w-full">
                <!-- AppRadioBar teleports here on md+ -->
              </div>
            </div>
          </main>

          <!-- Right rail (scroll zone #3). Visible on a custom breakpoint (~962px). -->
          <AppLayoutRightRail
            ref="rightRailRef"
            :any-overlay-open="anyOverlayOpen"
            :show-radio-chat="showRadioChat"
            :forced-hidden="isRightRailForcedHidden"
            :hide-search="hideRightRailSearch"
          />
        </div>
      </div>
    </div>

    <AppLayoutRightRailSearch
      ref="rightRailSearchRef"
      :forced-hidden="isRightRailForcedHidden"
      :hide-search="hideRightRailSearch"
      :show-radio-chat="showRadioChat"
    />

    <AppLayoutComposerFab
      :visible="canOpenComposer && isComposerEntrypointRoute && !hideFabForHomeComposer && !anyOverlayOpen && !isKeyboardOpen"
      :button-class="fabButtonClass"
      :bottom-style="fabBottomStyle"
      @open="openComposerForCurrentRoute()"
    />

    <!-- Composer modal + post-checkin share dialog. -->
    <AppLayoutComposerModalOverlay :composer="composer" />

    <!-- Single RadioBar instance: teleport to mobile chrome or desktop column bottom. -->
    <ClientOnly>
      <Teleport v-if="radioHasStation && radioTeleportTarget" :to="radioTeleportTarget">
        <AppRadioBar />
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import {
  MOH_FOCUS_HOME_COMPOSER_KEY,
} from '~/utils/injection-keys'
import { useKeyboardPinnedFixedStyle } from '~/composables/useKeyboardHeight'
import { useEnsureFocusedInputVisible } from '~/composables/useEnsureFocusedInputVisible'
import { isAdminPath, isSettingsPath } from '~/config/routes'
import { personOnlyFeatureForPath } from '~/utils/person-only-routes'
import { useAppLayoutComposer } from '~/composables/layout/useAppLayoutComposer'
import { useAppLayoutRadio } from '~/composables/layout/useAppLayoutRadio'
import { useAppLayoutRadioChat } from '~/composables/layout/useAppLayoutRadioChat'
import { useAppLayoutScrollers } from '~/composables/layout/useAppLayoutScrollers'
import { useAppLayoutSession } from '~/composables/layout/useAppLayoutSession'
import AppLayoutGlobalOverlays from '~/components/app/layout/GlobalOverlays.vue'
import AppLayoutConnectionBanners from '~/components/app/layout/ConnectionBanners.vue'
import AppLayoutDayBanner from '~/components/app/layout/DayBanner.vue'
import AppLayoutEmailUnverifiedBanner from '~/components/app/layout/EmailUnverifiedBanner.vue'
import AppLayoutComposerModalOverlay from '~/components/app/layout/ComposerModalOverlay.vue'
import AppLayoutLeftRail from '~/components/app/layout/LeftRail.vue'
import AppLayoutRightRail from '~/components/app/layout/RightRail.vue'

const route = useRoute()
const colorMode = useColorMode()

// Keep Safari iOS browser chrome (top/bottom bars) aligned with our in-app theme toggle.
// This is the main fix for the “white bar” in dark mode while scrolling.
const safariThemeColor = computed(() => (colorMode.value === 'dark' ? '#0F1113' : '#fbfaf7'))
useHead({
  meta: [{ key: 'moh-theme-color', name: 'theme-color', content: safariThemeColor }],
})
const { initAuth, isPageAccount } = useAuth()
const personOnlyBlockedFeature = computed(() =>
  isPageAccount.value ? personOnlyFeatureForPath(route.path) : null,
)
const { tabItems } = useAppNav()
const badgeHydration = useBadgeHydration()

// App icon badge (PWA): notifications + chat unread. Works on Android/Chrome; no-op on iOS.
useAppIconBadge()
useChannelSounds()
useGroupChannelBadgeSync()

const { hideTopBar, navCompactMode: _navCompactModeBase, isRightRailForcedHidden: _isRightRailForcedHiddenBase, isRightRailSearchHidden, title } = useLayoutRules(route)
const isMessagesPage = computed(() => route.path === '/chat')
const groupTabs = useGroupTabs()
const groupTabsView = computed(() => {
  const match = /^\/(g|groups)\/([^/]+)(?:\/(.*))?$/.exec(route.path)
  const shell = groupTabs.value
  if (!match || !shell?.group.channelsAvailable) return null
  const rest = match[3] ?? ''
  const selected = match[1] === 'groups' && rest.startsWith('channels') ? 'channels' as const
    : match[1] === 'g' && (rest === '' || rest === 'members') ? 'posts' as const : null
  if (!selected || shell.group.slug !== decodeURIComponent(match[2]!)) return null
  return { group: { ...shell.group, channelPersonalCount: shell.personalCount ?? shell.group.channelPersonalCount }, selected }
})
const groupDialogGroup = computed(() => {
  const match = /^\/(?:g|groups)\/([^/]+)/.exec(route.path)
  const shell = groupTabs.value
  if (!match || !shell || shell.group.slug !== decodeURIComponent(match[1]!)) return null
  return shell.group
})
/**
 * Shell + overlays share `useKeyboardPinnedFixedStyle` so fixed layers stay above the
 * software keyboard (Android overlays-content + iOS visual-viewport pan). See
 * `composables/useKeyboardHeight.ts`.
 */
const {
  style: shellStyle,
  isKeyboardOpen,
} = useKeyboardPinnedFixedStyle()
/** Mobile bottom chrome slides away whenever the software keyboard is open. */

// ── Composer surface (modal state, entry points, provides) ────────────────────

const middleContentEl = ref<HTMLElement | null>(null)
const middleScrollerEl = ref<HTMLElement | null>(null)

// Inline composers (permalink reply, article comments) live mid-scroller; when the
// shell shrinks for the keyboard, keep the focused input in the visible area.
useEnsureFocusedInputVisible(middleScrollerEl)

const composer = useAppLayoutComposer({ middleContentEl, middleScrollerEl })
const {
  canOpenComposer,
  isComposerEntrypointRoute,
  hideFabForHomeComposer,
  homeComposerInViewRef,
  anyOverlayOpen,
  fabButtonClass,
  openComposerForCurrentRoute,
} = composer

// FAB sits above tab bar, and above radio bar too when it’s visible (mobile only).
const fabBottomStyle = computed<Record<string, string>>(() => {
  // Match the horizontal inset (`right-4`) with a bottom inset too.
  const inset = '1rem'
  const base = `calc(var(--moh-tabbar-height, 4rem) + var(--moh-safe-bottom, 0px) + ${inset})`
  if (radioChromePadActive.value) {
    return {
      bottom: `calc(var(--moh-tabbar-height, 4rem) + var(--moh-radio-bar-height, 4rem) + var(--moh-safe-bottom, 0px) + ${inset})`,
    }
  }
  return { bottom: base }
})

// ── Spaces / radio chrome ─────────────────────────────────────────────────────
const { radioHasStation, radioTeleportTarget, radioChromePadActive } = useAppLayoutRadio()

// Compact the left nav on space-hungry routes, and whenever the viewer is in a space
// (live chat takes the right rail; icon-only nav frees the rest for the player/feed).
const isSettingsOrAdminPage = computed(() => isSettingsPath(route.path) || isAdminPath(route.path))
const navCompactMode = computed(() => _navCompactModeBase.value || radioHasStation.value || !!groupTabsView.value)

// Global keyboard shortcuts
const rightRailSearchRef = ref<{ focus: () => void } | null>(null)
const focusHomeComposer = inject(MOH_FOCUS_HOME_COMPOSER_KEY, null)
useKeyboardShortcutsHandler({
  openComposer: () => {
    // If the home page's inline composer is visible, focus it directly.
    // Otherwise fall back to the composer modal.
    if (homeComposerInViewRef.value && focusHomeComposer) {
      focusHomeComposer()
    } else {
      openComposerForCurrentRoute()
    }
  },
  focusSearch: () => {
    rightRailSearchRef.value?.focus()
  },
})

// On /chat, force the right rail visible when the user is in a live space so they
// can see the conversation list, DM chat, and live chat simultaneously.
// On /settings and /admin, also show the right rail when in a space so live chat remains visible.
const isRightRailForcedHidden = computed(() => {
  if (_isRightRailForcedHiddenBase.value && radioHasStation.value) {
    if (isMessagesPage.value || isSettingsOrAdminPage.value) return false
  }
  return _isRightRailForcedHiddenBase.value
})

const isRightRailBreakpointUp = useHydratedMediaQuery('(min-width: 962px)')
const isRightRailVisible = computed(() => Boolean(isRightRailBreakpointUp.value) && !isRightRailForcedHidden.value)
// Prefer live chat in the right rail whenever a space is selected (where rail is available).
const showRadioChat = computed(() => radioHasStation.value && isRightRailVisible.value)
const hideRightRailSearch = computed(() => isRightRailSearchHidden.value)
const { recommendationsDisplayed: railRecommendationsDisplayed } = useRailContext()
watchEffect(() => {
  railRecommendationsDisplayed.value = isRightRailVisible.value && !showRadioChat.value
})
useAppLayoutRadioChat({ radioHasStation, showRadioChat })

// ── Header ────────────────────────────────────────────────────────────────────

// Centralized auth hydration lives in `useAuth()`.
// Some app-layout routes (e.g. /home) intentionally allow logged-out access and skip auth middleware checks.
// Initialize here too so SSR and first client render agree on auth-dependent layout branches.
if (import.meta.server) {
  await initAuth()
  badgeHydration.seed()
} else {
  void initAuth().then(() => badgeHydration.refresh()).catch(() => undefined)
}
// nav items are provided by useAppNav() so mobile + desktop stay in sync

useAppLayoutSession()

// ── Scrollers + title bar height ──────────────────────────────────────────────
const { titleBarEl, pinnedBannerEl, layoutViewportEl, leftRailRef, rightRailRef, scrollMiddleToTop } = useAppLayoutScrollers({
  route,
  hideTopBar,
  middleScrollerEl,
  anyOverlayOpen,
})

// Status page uses a custom “ops” background only in dark mode.
const showStatusBg = computed(() => route.path === '/status' && colorMode.value === 'dark')

</script>

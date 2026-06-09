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
      :class="['overflow-hidden moh-bg moh-text moh-texture moh-vignette', showStatusBg ? 'moh-status-tone' : '']"
      style="height: var(--moh-viewport-h, 100vh);"
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
              'min-w-0 min-h-0 flex-1 overflow-x-hidden flex flex-col moh-surface-1 moh-texture',
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
                ref="titleBarEl"
                class="sticky top-0 z-50 shrink-0 moh-frosted"
              >
                <!-- Email verification banner should sit ABOVE the title bar (when title bar is shown). -->
                <AppLayoutEmailUnverifiedBanner />

                <div class="border-b moh-border">
                  <AppTitleBar>
                    <div class="flex items-center justify-between gap-3">
                      <div class="min-w-0 flex items-center gap-2">
                        <Icon v-if="headerIcon" :name="headerIcon" class="text-xl shrink-0 opacity-80" aria-hidden="true" />
                        <h1 class="min-w-0 truncate moh-h1">
                          {{ headerTitle }}
                        </h1>
                        <AppVerifiedBadge
                          v-if="hydrated && appHeader?.verifiedStatus"
                          :status="appHeader.verifiedStatus"
                          :premium="Boolean(appHeader?.premium)"
                          :premium-plus="Boolean(appHeader?.premiumPlus)"
                          :is-organization="Boolean((appHeader as any)?.isOrganization)"
                          :steward-badge-enabled="appHeader?.stewardBadgeEnabled ?? true"
                        />
                      </div>
                      <div v-if="hydrated && typeof appHeader?.postCount === 'number'" class="shrink-0 moh-meta">
                        <span class="font-semibold tabular-nums">{{ formatCompactNumber(appHeader.postCount) }}</span>
                        <span class="ml-1">posts</span>
                      </div>
                    </div>
                    <p v-if="headerDescription" class="moh-meta">
                      {{ headerDescription }}
                    </p>
                  </AppTitleBar>
                </div>
              </div>

              <!-- If a page hides the title bar, keep the banner at the top of the scroller. -->
              <AppLayoutEmailUnverifiedBanner
                v-if="hideTopBar"
                class="sticky top-0 z-50"
              />

            <div
              ref="middleContentEl"
              :class="[
                // Always stretch to bottom so two-pane pages can fill height.
                'flex-1 min-h-0',
                // Layout containers should not add padding. Pages/components own gutters and spacing.
                isMessagesPage && hideTopBar ? 'flex h-full min-h-0 flex-col overflow-hidden' : '',
              ]"
            >
              <slot />
            </div>
            </div>

            <!-- Mobile bottom chrome lives inside the center column (no fixed overlap). -->
            <!-- Radio sits above tab bar when playing. -->
            <!-- hideTabBarForKeyboard: hide on chat when the software keyboard is open so the -->
            <!-- tab bar doesn't rise with the keyboard (mirrors native iOS sheet behaviour). -->
            <div v-if="!anyOverlayOpen && !hideTabBarForKeyboard" class="md:hidden shrink-0">
              <Transition
                enter-active-class="transition-[opacity,transform] duration-200 ease-out"
                enter-from-class="opacity-0 translate-y-[30px]"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-[opacity,transform] duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 translate-y-[30px]"
                @before-enter="() => { radioChromePadActive = true }"
                @before-leave="() => { radioChromePadActive = true }"
                @after-leave="() => { radioChromePadActive = false }"
              >
                <div
                  v-show="radioHasStation"
                  class="moh-radio-bar dark relative z-0 flex items-center border-t border-zinc-800 bg-black text-white"
                  :style="{ minHeight: 'var(--moh-radio-bar-height, 4rem)' }"
                >
                  <div class="w-full">
                    <AppRadioBar />
                  </div>
                </div>
              </Transition>

              <div class="relative z-10">
                <AppTabBar :items="tabItems" />
              </div>
            </div>

            <!-- Radio player row: bottom of the middle column on desktop only. -->
            <div
              v-if="radioHasStation"
              class="moh-radio-bar dark hidden md:flex items-center shrink-0 border-t border-zinc-800 bg-black text-white"
              :style="{ height: 'var(--moh-radio-bar-height, 4rem)' }"
            >
              <div class="w-full">
                <AppRadioBar />
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

    <!-- Right-rail search (collapses on Explore). Floating over the entire layout (desktop only). -->
    <div
      v-if="!isRightRailForcedHidden"
      aria-label="Right rail search"
      :class="[
        // Fixed overlay aligned with the same max-width container as the columns.
        // Match the right rail breakpoint (right rail is hidden below ~962px).
        'hidden min-[962px]:block fixed left-0 right-0 top-0 z-40 pointer-events-none',
        'transition-opacity duration-200 ease-out',
        hideRightRailSearch ? 'opacity-0 pointer-events-none' : 'opacity-100'
      ]"
    >
      <div class="mx-auto w-full max-w-6xl xl:max-w-7xl flex justify-end">
        <div class="pointer-events-auto w-[var(--moh-right-rail-w)] border-b moh-border moh-bg moh-texture">
          <div class="moh-gutter-x h-16 flex items-center">
            <IconField iconPosition="left" class="w-full">
              <InputIcon>
                <Icon name="tabler:search" class="text-lg opacity-70" aria-hidden="true" />
              </InputIcon>
              <InputText
                ref="searchInputRef"
                v-model="rightRailSearchQuery"
                class="w-full h-11 !rounded-full moh-focus"
                placeholder="Search…"
                @keydown.enter="goToExploreSearch"
              />
            </IconField>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile FAB: above tab bar and radio (when radio is up). -->
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <button
        v-if="canOpenComposer && isComposerEntrypointRoute && !hideFabForHomeComposer && !anyOverlayOpen"
        type="button"
        aria-label="New post"
        :class="[
          'moh-pressable md:hidden fixed right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg hover:opacity-95 moh-focus-strong',
          fabButtonClass,
        ]"
        :style="fabBottomStyle"
        @click="openComposerForCurrentRoute()"
      >
        <Icon name="tabler:plus" class="text-3xl" aria-hidden="true" />
      </button>
    </Transition>

    <!-- Composer modal + post-checkin share dialog. -->
    <AppLayoutComposerModalOverlay :composer="composer" />
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import { primaryTintCssForUser } from '~/utils/theme-tint'
import {
  MOH_FOCUS_HOME_COMPOSER_KEY,
  MOH_MIDDLE_SCROLLER_KEY,
} from '~/utils/injection-keys'
import { useBookmarkCollections } from '~/composables/useBookmarkCollections'
import { useKeyboardHeight } from '~/composables/useKeyboardHeight'
import type {
  GetMessagesUnreadCountResponse,
  GetNotificationsUnreadCountResponse,
} from '~/types/api'
import { routeHeaderDefaultsFor, isAdminPath, isSettingsPath } from '~/config/routes'
import { useAppLayoutComposer } from '~/composables/layout/useAppLayoutComposer'
import AppLayoutGlobalOverlays from '~/components/app/layout/GlobalOverlays.vue'
import AppLayoutConnectionBanners from '~/components/app/layout/ConnectionBanners.vue'
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
const { initAuth, user } = useAuth()
const { isAuthed, tabItems } = useAppNav()
const notifBadge = useNotificationsBadge()
const {
  setNotificationUndeliveredCount,
  setNotificationUnreadCommentCount,
  setMessageUnreadCounts,
} = usePresence()

// App icon badge (PWA): notifications + chat unread. Works on Android/Chrome; no-op on iOS.
useAppIconBadge()

const { hideTopBar, navCompactMode: _navCompactModeBase, isRightRailForcedHidden: _isRightRailForcedHiddenBase, isRightRailSearchHidden, title } = useLayoutRules(route)
const isMessagesPage = computed(() => route.path === '/chat')
const isArticleEditorPage = computed(() => route.path === '/articles/new' || route.path.startsWith('/articles/edit/'))
const { keyboardHeight } = useKeyboardHeight()
// Hide the mobile tab bar when the software keyboard is open on screens that have a
// fixed composer bar (e.g. chat). This mirrors the native iOS sheet behaviour where
// the tab bar is outside the modal hierarchy and never rises with the keyboard.
const hideTabBarForKeyboard = computed(() => (isMessagesPage.value || isArticleEditorPage.value) && keyboardHeight.value > 0)

const { header: appHeader } = useAppHeader()
// Prevent SSR hydration mismatches: render route meta during hydration, then swap to appHeader after mount.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
  void loadLobbyCounts()
})
const {
  loaded: bookmarksLoaded,
  loading: bookmarksLoading,
  ensureLoaded: ensureBookmarkCollectionsLoaded,
} = useBookmarkCollections()

// ── Composer surface (modal state, entry points, provides) ────────────────────

const middleContentEl = ref<HTMLElement | null>(null)
const middleScrollerEl = ref<HTMLElement | null>(null)

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

const { apiFetchData } = useApiClient()
const criticalBadgeCountsLoaded = useState<boolean>('critical-badge-counts-loaded', () => false)

async function loadCriticalBadgeCounts(opts?: { force?: boolean }) {
  if (!isAuthed.value || !user.value?.id) {
    setNotificationUndeliveredCount(0)
    setNotificationUnreadCommentCount(0)
    setMessageUnreadCounts({ primary: 0, requests: 0 })
    criticalBadgeCountsLoaded.value = true
    return
  }
  if (criticalBadgeCountsLoaded.value && !opts?.force) return

  // Fast path: hydrate from /auth/me payload when available.
  const bootNotif = Number((user.value as any)?.notificationUndeliveredCount)
  const bootPrimary = Number((user.value as any)?.messageUnreadCounts?.primary)
  const bootRequests = Number((user.value as any)?.messageUnreadCounts?.requests)
  const hasBootCounts =
    Number.isFinite(bootNotif)
    && Number.isFinite(bootPrimary)
    && Number.isFinite(bootRequests)
  if (hasBootCounts) {
    setNotificationUndeliveredCount(Math.max(0, Math.floor(bootNotif || 0)))
    setMessageUnreadCounts({
      primary: Math.max(0, Math.floor(bootPrimary || 0)),
      requests: Math.max(0, Math.floor(bootRequests || 0)),
    })
    criticalBadgeCountsLoaded.value = true
    return
  }

  const [notifRes, messagesRes] = await Promise.allSettled([
    apiFetchData<GetNotificationsUnreadCountResponse['data']>('/notifications/unread-count'),
    apiFetchData<GetMessagesUnreadCountResponse['data']>('/messages/unread-count'),
  ])

  if (notifRes.status === 'fulfilled') {
    const undelivered = Math.max(0, Number(notifRes.value?.count ?? 0) || 0)
    setNotificationUndeliveredCount(undelivered)
    const waiting = Math.max(0, Number(notifRes.value?.unreadCommentCount ?? 0) || 0)
    setNotificationUnreadCommentCount(waiting)
  }
  if (messagesRes.status === 'fulfilled') {
    const primary = Math.max(0, Number(messagesRes.value?.primary ?? 0) || 0)
    const requests = Math.max(0, Number(messagesRes.value?.requests ?? 0) || 0)
    setMessageUnreadCounts({ primary, requests })
  }

  criticalBadgeCountsLoaded.value = true
}

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

const { selectedSpaceId, loadLobbyCounts } = useSpaceLobby()
const radioHasStation = computed(() => Boolean(selectedSpaceId.value))
useSpacePlayPauseShortcut(radioHasStation)

// Force the left nav into compact (icon-only) mode on chat/settings/admin while in a space,
// so the freed horizontal space goes to the center column and the live-chat right rail.
const isSettingsOrAdminPage = computed(() => isSettingsPath(route.path) || isAdminPath(route.path))
const navCompactMode = computed(() => {
  if (_navCompactModeBase.value) return true
  if (!selectedSpaceId.value) return false
  return isMessagesPage.value || isSettingsOrAdminPage.value
})

// Global keyboard shortcuts
const searchInputRef = ref<{ $el: HTMLElement } | HTMLElement | null>(null)
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
    const el = searchInputRef.value
    const input = el instanceof HTMLElement ? el : (el as { $el: HTMLElement } | null)?.$el
    input?.focus()
  },
})

// On /chat, force the right rail visible when the user is in a live space so they
// can see the conversation list, DM chat, and live chat simultaneously.
// On /settings and /admin, also show the right rail when in a space so live chat remains visible.
const isRightRailForcedHidden = computed(() => {
  if (_isRightRailForcedHiddenBase.value && selectedSpaceId.value) {
    if (isMessagesPage.value || isSettingsOrAdminPage.value) return false
  }
  return _isRightRailForcedHiddenBase.value
})

const isRightRailBreakpointUp = useHydratedMediaQuery('(min-width: 962px)')
const isRightRailVisible = computed(() => Boolean(isRightRailBreakpointUp.value) && !isRightRailForcedHidden.value)
// Prefer live chat in the right rail whenever a space is selected (where rail is available).
const showRadioChat = computed(() => radioHasStation.value && isRightRailVisible.value)
const hideRightRailSearch = computed(() => isRightRailSearchHidden.value)
// Keep space chat subscription alive while a space is selected (even when not on /spaces).
useSpaceLiveChat()

// Mobile bottom-sheet chat
const radioChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)
const radioChat = useSpaceLiveChat({ passive: true })
watch(
  () => radioHasStation.value,
  (has) => {
    if (!has) radioChatSheetOpen.value = false
  },
  { immediate: true },
)
watch(
  () => showRadioChat.value,
  (show) => {
    // If the right-rail live chat is visible again (e.g., resized back up),
    // ensure the overlay is dismissed and doesn't auto-show next time.
    if (show) radioChatSheetOpen.value = false
  },
  { immediate: true },
)

// ── Live-chat unread badge ────────────────────────────────────────────────────
// Count non-system, non-self messages that arrive while the chat panel is either
// not mounted (mobile modal closed) or not scrolled to the bottom.
// When the panel IS visible and at the bottom it handles its own clear; we
// only increment here for the "panel not showing" case to avoid double-counting.
const { chatPanelVisible, chatAtBottom, clearUnread: clearChatUnread, incrementUnread: incrementChatUnread } = useSpaceChatUnread()

let lastKnownChatMsgCount = 0
watch(
  () => radioChat.messages.value,
  (msgs, prevMsgs) => {
    if (!import.meta.client) return
    const len = msgs.length
    const prevLen = prevMsgs?.length ?? lastKnownChatMsgCount
    lastKnownChatMsgCount = len
    if (len <= prevLen) return
    const newMsgs = msgs.slice(prevLen)
    // Only count when the panel isn't already showing the messages at the bottom.
    if (chatPanelVisible.value && chatAtBottom.value) return
    const countable = newMsgs.filter(
      (m) => m.kind === 'user' && m.sender?.id !== user.value?.id,
    ).length
    if (countable > 0) incrementChatUnread(countable)
  },
)

// Reset the count whenever the selected space changes.
watch(
  () => radioChat.spaceId.value,
  (_next, prev) => {
    if (prev !== undefined) clearChatUnread()
  },
)
// ─────────────────────────────────────────────────────────────────────────────

// Keep bottom spacing stable while the radio animates out.
const radioChromePadActive = ref(false)
watch(
  () => radioHasStation.value,
  (has) => {
    if (has) radioChromePadActive.value = true
  },
  { immediate: true },
)

// ── Header ────────────────────────────────────────────────────────────────────

const headerTitle = computed(() => {
  // During SSR + initial hydration, prefer route meta title for stable markup.
  if (!hydrated.value) return title.value
  const t = (appHeader.value?.title ?? '').trim()
  return t || title.value
})

const headerIcon = computed(() => (hydrated.value ? (appHeader.value?.icon ?? routeHeaderDefaults.value.icon) : routeHeaderDefaults.value.icon))
const headerDescription = computed(() =>
  hydrated.value ? (appHeader.value?.description ?? routeHeaderDefaults.value.description) : routeHeaderDefaults.value.description
)

const routeHeaderDefaults = computed(() => {
  return routeHeaderDefaultsFor(route.path)
})

function formatCompactNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  } catch {
    return String(n)
  }
}

// Centralized auth hydration lives in `useAuth()`.
// Some app-layout routes (e.g. /home) intentionally allow logged-out access and skip auth middleware checks.
// Initialize here too so SSR and first client render agree on auth-dependent layout branches.
if (import.meta.server) {
  await initAuth()
  // Badge counts are high-priority; preload on SSR so they render in initial HTML.
  await loadCriticalBadgeCounts()
} else {
  void initAuth().then(() => loadCriticalBadgeCounts()).catch(() => undefined)
}
// nav items are provided by useAppNav() so mobile + desktop stay in sync

// When user is logged in, keep subscription state in sync.
watch(
  () => isAuthed.value,
  (authed) => {
    if (!authed || !import.meta.client) return
    const push = usePushNotifications()
    push.tryAutoPrompt()
    void push.ensureSubscribedWhenGranted()
  },
  { immediate: true },
)

watchEffect(() => {
  if (!import.meta.client) return
  if (!isAuthed.value) return
  void ensureBookmarkCollectionsLoaded()
})

function maybeRetryBookmarkCollections() {
  if (!import.meta.client) return
  if (!isAuthed.value) return
  // If we haven't loaded yet (or last attempt errored), retry.
  if (!bookmarksLoaded.value && !bookmarksLoading.value) {
    void ensureBookmarkCollectionsLoaded({ force: true })
  }
}

watch(
  () => isAuthed.value,
  (authed) => {
    if (!import.meta.client) return
    if (!authed) return
    // Force once on authed to avoid “missed” load on hard reload.
    void ensureBookmarkCollectionsLoaded({ force: true })
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('focus', maybeRetryBookmarkCollections)
  document.addEventListener('visibilitychange', maybeRetryBookmarkCollections)
})
onBeforeUnmount(() => {
  window.removeEventListener('focus', maybeRetryBookmarkCollections)
  document.removeEventListener('visibilitychange', maybeRetryBookmarkCollections)
})

if (import.meta.client) {
  watchEffect(() => {
    const prefix = notifBadge.show.value ? `(${notifBadge.displayCount.value}) ` : ''
    useHead({
      titleTemplate: (title) => `${prefix}${title || siteConfig.meta.title}`,
    })
  })
}

// Dynamic theme tint: default (orange) for logged out/unverified, verified = blue, premium = orange.
// We override PrimeVue semantic primary tokens via CSS variables so the entire UI tint follows status.
const primaryCssVars = computed(() => primaryTintCssForUser(user.value ?? null))
useHead({
  style: [{ key: 'moh-primary-tint', textContent: primaryCssVars }],
})

// ── Right-rail search ─────────────────────────────────────────────────────────

const rightRailSearchQuery = ref('')
function goToExploreSearch() {
  const q = (rightRailSearchQuery.value ?? '').trim()
  void navigateTo({ path: '/explore', query: q ? { q } : {} })
}
watch(
  [() => route.path, () => route.query.q],
  () => {
    if (route.path === '/explore' && route.query.q != null) {
      rightRailSearchQuery.value = String(route.query.q).trim()
    }
  },
  { immediate: true },
)

// ── Scrollers + title bar height ──────────────────────────────────────────────

const titleBarEl = ref<HTMLElement | null>(null)
const layoutViewportEl = ref<HTMLElement | null>(null)
const leftRailRef = ref<{ el: HTMLElement | null } | null>(null)
const rightRailRef = ref<{ el: HTMLElement | null } | null>(null)
const leftRailEl = computed(() => leftRailRef.value?.el ?? null)
const rightRailEl = computed(() => rightRailRef.value?.el ?? null)

provide(MOH_MIDDLE_SCROLLER_KEY, middleScrollerEl)

function updateTitleBarHeightVar() {
  if (!import.meta.client) return
  const main = middleScrollerEl.value
  const bar = titleBarEl.value
  if (!main || !bar) return
  main.style.setProperty('--moh-title-bar-height', `${bar.offsetHeight}px`)
}
watch([titleBarEl, hideTopBar], () => {
  if (!hideTopBar.value && titleBarEl.value) {
    nextTick(() => updateTitleBarHeightVar())
  } else if (hideTopBar.value) {
    // Reset the var so sticky tab bars on hideTopBar pages use top: 0.
    middleScrollerEl.value?.style.setProperty('--moh-title-bar-height', '0px')
  }
}, { immediate: true })

let titleBarRo: ResizeObserver | null = null
watch(
  titleBarEl,
  (el) => {
    if (!import.meta.client) return
    titleBarRo?.disconnect()
    titleBarRo = null
    if (!el) return
    updateTitleBarHeightVar()
    titleBarRo = new ResizeObserver(() => updateTitleBarHeightVar())
    titleBarRo.observe(el)
  },
  { immediate: true },
)
onMounted(() => {
  if (!import.meta.client) return
  updateTitleBarHeightVar()
})
onBeforeUnmount(() => {
  titleBarRo?.disconnect()
  titleBarRo = null
})

// ── Linked scroll: middle + right columns scroll together ─────────────────────
function onLayoutWheel(e: WheelEvent) {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  if (anyOverlayOpen.value) return

  const target = e.target as Node | null
  if (!target) return

  if (leftRailEl.value?.contains(target)) return
  if (rightRailEl.value?.contains(target)) return

  // If the event originates inside a nested scrollable container within the center
  // column (e.g. chat message list, settings panel, admin table), let native scroll
  // handle it rather than intercepting. Walk up from the target until we reach the
  // middle scroller; if any intermediate element is independently scrollable, bail out.
  const middle = middleScrollerEl.value
  if (middle && target instanceof Element) {
    let el: Element | null = target
    while (el && el !== middle) {
      const overflowY = window.getComputedStyle(el).overflowY
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return
      }
      el = el.parentElement
    }
  }

  e.preventDefault()

  let delta = e.deltaY
  if (e.deltaMode === 1) delta *= 20
  else if (e.deltaMode === 2) delta *= (middleScrollerEl.value?.clientHeight ?? window.innerHeight)

  middleScrollerEl.value?.scrollBy(0, delta)
  rightRailEl.value?.scrollBy(0, delta)
}

onMounted(() => {
  layoutViewportEl.value?.addEventListener('wheel', onLayoutWheel, { passive: false })
})

onBeforeUnmount(() => {
  layoutViewportEl.value?.removeEventListener('wheel', onLayoutWheel)
})

// Status page uses a custom “ops” background only in dark mode.
const showStatusBg = computed(() => route.path === '/status' && colorMode.value === 'dark')

function scrollMiddleToTop() {
  const middle = middleScrollerEl.value
  const right = rightRailEl.value
  if (middle) middle.scrollTo({ top: 0, behavior: 'smooth' })
  if (right) right.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style>
.moh-status-tone {
  /* Force an "ops console" palette regardless of color mode. */
  --moh-surface-0: #000;
  --moh-surface-1: rgba(0, 0, 0, 0.55);
  --moh-surface-2: rgba(0, 0, 0, 0.62);
  --moh-surface-3: rgba(0, 0, 0, 0.72);

  --moh-bg: var(--moh-surface-0);
  --moh-surface: var(--moh-surface-1);
  --moh-surface-hover: rgba(255, 255, 255, 0.06);

  --moh-border-subtle: rgba(255, 255, 255, 0.08);
  --moh-border: rgba(255, 255, 255, 0.12);
  --moh-border-strong: rgba(255, 255, 255, 0.18);

  --moh-text: #e7e9ea;
  --moh-text-muted: rgba(231, 233, 234, 0.68);
  --moh-text-soft: rgba(231, 233, 234, 0.54);

  --moh-frosted: rgba(0, 0, 0, 0.55);

  --moh-shadow-1: none;
  --moh-shadow-2: none;
}

.moh-status-tone.moh-bg {
  /* Let the `/status` background overlay show through. */
  background-color: transparent !important;
}

.moh-status-tone :where(.text-gray-900) {
  /* Many nav items use light-mode Tailwind text colors; force readable text on the status dark background. */
  color: rgba(231, 233, 234, 0.92) !important;
}

.moh-status-tone :where(.text-gray-700) {
  color: rgba(231, 233, 234, 0.78) !important;
}

.moh-status-tone :where(.text-gray-500) {
  color: rgba(231, 233, 234, 0.62) !important;
}

.moh-slow-bounce {
  animation: mohSlowBounce 2.2s ease-in-out infinite;
  will-change: transform;
}

@keyframes mohSlowBounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.moh-status-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;

  /* “TV ops” vibe: deep black, faint grid + scanline */
  background:
    radial-gradient(1000px 600px at 20% 15%, rgba(29, 155, 240, 0.18), transparent 55%),
    radial-gradient(900px 500px at 85% 20%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03), transparent 35%),
    repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.04) 0px,
      rgba(255, 255, 255, 0.04) 1px,
      transparent 1px,
      transparent 5px
    ),
    #000;
}
</style>

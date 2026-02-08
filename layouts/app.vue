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
    <ClientOnly>
      <AppToastStack />
      <AppUserPreviewPopover />
    </ClientOnly>
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isAuthed && (disconnectedDueToIdle || connectionBarJustConnected || (wasSocketConnectedOnce && !isSocketConnected))"
        :class="[
          'fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 border-b px-4 pb-2.5 pt-[calc(0.625rem+var(--moh-safe-top,0px))] text-center text-sm backdrop-blur-sm',
          connectionBarJustConnected
            ? 'border-green-500/60 bg-green-100/95 text-green-900 dark:border-green-500/50 dark:bg-green-900/30 dark:text-green-100'
            : isSocketConnecting
              ? 'border-amber-400/70 bg-amber-50/95 text-amber-900 dark:border-amber-500/50 dark:bg-amber-900/25 dark:text-amber-100'
              : 'border-red-500/60 bg-red-100/95 text-red-900 dark:border-red-500/50 dark:bg-red-900/30 dark:text-red-100'
        ]"
        role="status"
        aria-live="polite"
      >
        <template v-if="connectionBarJustConnected">
          <span>Reconnected.</span>
        </template>
        <template v-else-if="isSocketConnecting">
          <span>Reconnecting…</span>
        </template>
        <template v-else>
          <span>You've been disconnected.</span>
          <span class="ml-1.5">Scroll or tap anywhere to reconnect.</span>
          <Button
            label="Reconnect"
            size="small"
            severity="secondary"
            class="ml-2 !bg-white/80 dark:!bg-zinc-800/80"
            @click="onReconnectClick"
          />
        </template>
      </div>
    </Transition>
    <AppOnboardingGate />
    <AppAuthActionModal />
    <AppPremiumVideoModal />
    <AppReplyModal />
    <div
      :class="['overflow-hidden moh-bg moh-text moh-texture', showStatusBg ? 'moh-status-tone' : '']"
      :style="appViewportStyle"
    >
      <div class="mx-auto flex h-full w-full max-w-6xl xl:max-w-7xl">
        <!-- Left Nav (independent scroll) -->
        <aside
          :class="[
            'no-scrollbar hidden sm:block shrink-0 h-full border-r moh-border moh-texture',
            anyOverlayOpen ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain'
          ]"
        >
        <!-- IMPORTANT: no `h-full` + no `overflow-hidden` here, or the rail can't actually scroll -->
        <AppLeftRailContent :compact="navCompactMode">
          <div class="mb-3">
            <NuxtLink
              :to="'/home'"
              :class="[
                'flex items-center',
                isAuthed && (user?.premium || (user?.verifiedStatus && user.verifiedStatus !== 'none')) && !navCompactMode ? 'gap-1.5' : 'gap-2'
              ]"
              aria-label="Home"
              @click="onHomeClick"
            >
              <div class="flex h-12 w-12 shrink-0 items-center justify-center">
                <AppLogo
                  :alt="siteConfig.name"
                  :light-src="logoLightSmall"
                  :dark-src="logoDarkSmall"
                  :width="32"
                  :height="32"
                  imgClass="h-8 w-8 rounded"
                />
              </div>
              <span
                v-if="isAuthed && (user?.premiumPlus || user?.premium) && !navCompactMode"
                class="hidden xl:inline text-[10px] font-bold tracking-[0.2em] text-[var(--moh-premium)] uppercase"
              >
                {{ user?.premiumPlus ? 'PREMIUM+' : 'PREMIUM' }}
              </span>
              <span
                v-else-if="isAuthed && user?.verifiedStatus && user.verifiedStatus !== 'none' && !navCompactMode"
                class="hidden xl:inline text-[10px] font-bold tracking-[0.2em] text-[var(--moh-verified)] uppercase"
              >
                VERIFIED
              </span>
            </NuxtLink>
          </div>

          <nav class="space-y-1 flex-1">
            <NuxtLink
              v-for="item in leftNavItems"
              :key="item.label"
              :to="item.to"
              :class="[
                // NOTE: Don't use `moh-text` here; it overrides per-item color accents (e.g. Only me).
                'group flex h-12 items-center rounded-xl transition-colors',
                // Add breathing room between icon and label (label only shows in wide mode).
                !navCompactMode ? 'gap-2' : '',
                'w-full',
                route.path === item.to
                  ? (item.key === 'only-me' ? 'font-bold' : 'moh-surface font-bold')
                  : 'font-semibold',
                // Default nav tone
                item.key !== 'only-me' ? 'text-gray-900 dark:text-gray-100 moh-surface-hover' : '',
                item.key === 'only-me'
                  ? (route.path === item.to ? 'moh-nav-onlyme-active' : 'moh-nav-onlyme')
                  : ''
              ]"
              @click="(e) => onLeftNavClick(item.to, e)"
            >
              <span class="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <ClientOnly v-if="item.key === 'bookmarks'">
                  <Icon
                    :name="hasBookmarks || isActiveNav(item.to) ? 'tabler:bookmark-filled' : 'tabler:bookmark'"
                    size="28"
                    class="opacity-90"
                    :style="hasBookmarks ? { color: 'var(--p-primary-color)' } : undefined"
                    aria-hidden="true"
                  />
                  <template #fallback>
                    <Icon name="tabler:bookmark" size="28" class="opacity-90" aria-hidden="true" />
                  </template>
                </ClientOnly>
                <Icon
                  v-else
                  :name="isActiveNav(item.to) ? (item.iconActive || item.icon) : item.icon"
                  size="28"
                  :class="['opacity-90', item.iconClass]"
                  aria-hidden="true"
                />
                <AppNotificationBadge v-if="item.key === 'notifications'" />
                <AppMessagesBadge v-if="item.key === 'messages'" />
              </span>
              <span
                v-if="!navCompactMode"
                :class="[
                  'hidden xl:inline whitespace-nowrap overflow-hidden text-lg max-w-[220px]',
                  route.path === item.to ? 'font-bold' : 'font-semibold'
                ]"
              >
                {{ item.label }}
              </span>
            </NuxtLink>

            <div class="pt-2">
              <Transition
                enter-active-class="transition-opacity duration-150 ease-out"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-150 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <button
                  v-if="canOpenComposer && isComposerEntrypointRoute"
                  type="button"
                  aria-label="Post"
                  :class="[
                    'group flex h-12 items-center rounded-xl text-white hover:opacity-95 w-full',
                    fabButtonClass,
                  ]"
                  :style="fabButtonStyle"
                  @click="openComposerForCurrentRoute()"
                >
                  <span class="flex h-12 w-12 shrink-0 items-center justify-center">
                    <Icon name="tabler:plus" size="26" class="opacity-95" aria-hidden="true" />
                  </span>
                  <span v-if="!navCompactMode" class="hidden xl:inline text-base font-semibold">Post</span>
                </button>
              </Transition>
            </div>

          </nav>

          <AppUserCard v-if="isAuthed" :compact="navCompactMode" />
          <NuxtLink
            v-else
            to="/login"
            aria-label="Log in"
            :class="[
              // Match the Post button shape/style (rounded rect).
              'group flex h-12 items-center rounded-xl bg-black text-white hover:opacity-95 dark:bg-white dark:text-black',
              navCompactMode ? 'w-12 mx-auto justify-center' : 'w-full',
              'mt-2'
            ]"
          >
            <span class="flex h-12 w-12 shrink-0 items-center justify-center">
              <i class="pi pi-sign-in text-[22px] opacity-95" aria-hidden="true" />
            </span>
            <span v-if="!navCompactMode" class="hidden xl:inline text-base font-semibold">Log in</span>
          </NuxtLink>
        </AppLeftRailContent>
        </aside>

        <!-- Columns 2 + 3: separate scroll zones (independent). -->
        <div :class="['flex min-w-0 flex-1 min-h-0', shouldCapMiddleColumn ? 'lg:justify-center' : '']">
          <!-- Middle / Feed (scroll zone #2) -->
          <main
            :class="[
              // `min-h-0` is critical so inner scroll containers can actually scroll (flexbox default min-height:auto can block it).
              'min-w-0 min-h-0 flex-1 overflow-x-hidden flex flex-col',
              shouldCapMiddleColumn ? 'lg:max-w-[720px]' : '',
              !isRightRailForcedHidden ? 'lg:border-r moh-border' : '',
            ]"
          >
            <div
              id="moh-middle-scroller"
              ref="middleScrollerEl"
              :class="[
                'no-scrollbar min-w-0 flex-1 overflow-x-hidden flex flex-col',
                anyOverlayOpen || (isMessagesPage && hideTopBar) ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain'
              ]"
              :style="!hideTopBar ? { scrollPaddingTop: 'var(--moh-title-bar-height, 4rem)' } : undefined"
            >
              <div
                v-if="!hideTopBar"
                ref="titleBarEl"
                class="sticky top-0 z-10 shrink-0 border-b moh-border moh-frosted"
              >
                <AppTitleBar>
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0 flex items-center gap-2">
                      <i v-if="headerIcon" :class="['pi', headerIcon]" class="text-xl shrink-0 opacity-80" aria-hidden="true" />
                      <h1 class="min-w-0 truncate text-xl font-bold leading-none">
                        {{ headerTitle }}
                      </h1>
                      <AppVerifiedBadge
                        v-if="hydrated && appHeader?.verifiedStatus"
                        :status="appHeader.verifiedStatus"
                        :premium="Boolean(appHeader?.premium)"
                      />
                    </div>
                    <div v-if="hydrated && typeof appHeader?.postCount === 'number'" class="shrink-0 text-sm moh-text-muted">
                      <span class="font-semibold tabular-nums">{{ formatCompactNumber(appHeader.postCount) }}</span>
                      <span class="ml-1">posts</span>
                    </div>
                  </div>
                  <p v-if="headerDescription" class="text-sm moh-text-muted">
                    {{ headerDescription }}
                  </p>
                </AppTitleBar>
              </div>

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

            <!-- Radio player row: bottom of the middle column on desktop only. -->
            <div
              v-if="showRadioBar"
              class="hidden sm:block shrink-0 border-t border-gray-200 bg-white dark:border-zinc-800 dark:bg-black text-gray-900 dark:text-white"
            >
              <AppRadioBar />
            </div>
          </main>

          <!-- Right rail (scroll zone #3). Visible on lg+. -->
          <aside
            :class="[
              // Layout should not add padding; right-rail content owns its gutters.
              'relative no-scrollbar shrink-0 w-[clamp(20rem,22vw,23.75rem)] h-full moh-texture',
              // Single native scroller: the rail itself scrolls; search floats above the entire layout.
              // IMPORTANT: `min-h-0` is required so the rail can scroll in a flex row.
              'min-h-0',
              anyOverlayOpen ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain',
              isRightRailForcedHidden ? 'hidden' : 'hidden lg:block'
            ]"
          >
            <!-- Offset the scroller content so it doesn't sit under the floating search bar. -->
            <div
              :class="[
                'transition-all duration-200 ease-out',
                isRightRailSearchHidden ? 'pt-0' : 'pt-16'
              ]"
            >
              <AppRightRailContent>
                  <div
                    v-if="dailyQuote"
                    class="my-8 py-2 text-center text-sm leading-relaxed text-gray-700 dark:text-gray-200"
                  >
                    <figure>
                      <blockquote class="italic">
                        “{{ dailyQuote.text }}”
                      </blockquote>
                      <figcaption class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span class="font-semibold">
                          {{ dailyQuoteAttribution }}
                        </span>
                        <span v-if="dailyQuote.isParaphrase" class="ml-1">(paraphrase)</span>
                      </figcaption>
                    </figure>
                  </div>

                  <div class="space-y-4 transition-[transform] duration-200 ease-out">
                  <!-- Who to follow (real data) -->
                  <Card>
                    <template #title>Who to follow</template>
                    <template #content>
                      <div v-if="whoToFollowLoading && whoToFollowUsers.length === 0" class="flex justify-center py-4">
                        <AppLogoLoader />
                      </div>

                      <div v-else-if="whoToFollowUsers.length > 0">
                        <AppWhoToFollowCompactRow
                          v-for="u in whoToFollowUsers"
                          :key="u.id"
                          :user="u"
                        />
                        <NuxtLink
                          to="/who-to-follow"
                          class="inline-block pt-3 text-sm font-medium hover:underline underline-offset-2"
                          :class="tierCtaTextClass"
                        >
                          Show more
                        </NuxtLink>
                      </div>

                      <div v-else class="text-sm moh-text-muted">
                        <p v-if="whoToFollowError">{{ whoToFollowError }}</p>
                        <p v-else>No suggestions yet.</p>
                        <NuxtLink to="/explore" class="inline-block mt-2 font-medium hover:underline">
                          Explore people
                        </NuxtLink>
                      </div>
                    </template>
                  </Card>

                  <AppWebsters1828WordOfDayCard />

                  <AppSupportDonateCard />

                  <AppAdSlot placement="rail" />

                  <Card>
                    <template #title>Trends for you</template>
                    <template #content>
                      <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                        <div class="space-y-1">
                          <div class="text-xs text-gray-500 dark:text-gray-400">Trending</div>
                          <div class="font-semibold">Discipline</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">12.4K posts</div>
                        </div>
                        <div class="space-y-1">
                          <div class="text-xs text-gray-500 dark:text-gray-400">Trending in Fitness</div>
                          <div class="font-semibold">Cold plunge</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">3,219 posts</div>
                        </div>
                        <div class="space-y-1">
                          <div class="text-xs text-gray-500 dark:text-gray-400">Trending</div>
                          <div class="font-semibold">Brotherhood</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">8,002 posts</div>
                        </div>
                        <Button label="Show more" text severity="secondary" class="w-full justify-center" />
                      </div>
                    </template>
                  </Card>

                  <Card>
                    <template #title>Groups</template>
                    <template #content>
                      <div class="space-y-3 text-sm moh-text-muted">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="font-semibold">Daily Discipline</div>
                            <div class="text-xs moh-text-muted">14 members · 3 new posts</div>
                          </div>
                          <Tag value="New" severity="success" />
                        </div>
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="font-semibold">Business Builders</div>
                            <div class="text-xs moh-text-muted">62 members · 1 new post</div>
                          </div>
                          <Tag value="Active" severity="info" />
                        </div>
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="font-semibold">Strength & Conditioning</div>
                            <div class="text-xs moh-text-muted">28 members · 0 new posts</div>
                          </div>
                          <Tag value="Open" severity="secondary" />
                        </div>
                        <Button
                          label="Browse groups"
                          text
                          severity="secondary"
                          class="w-full justify-center"
                          @click="navigateTo('/groups')"
                        />
                      </div>
                    </template>
                  </Card>

                  <div class="px-2 pb-6 text-xs moh-text-muted space-x-2">
                    <NuxtLink to="/about" class="hover:underline">About</NuxtLink>
                    <span>·</span>
                    <NuxtLink to="/privacy" class="hover:underline">Privacy</NuxtLink>
                    <span>·</span>
                    <NuxtLink to="/terms" class="hover:underline">Terms</NuxtLink>
                    <span>·</span>
                    <NuxtLink to="/status" class="hover:underline">Status</NuxtLink>
                    <span>·</span>
                    <span>&copy; {{ new Date().getFullYear() }} {{ siteConfig.name }}</span>
                  </div>
                </div>
              </AppRightRailContent>
            </div>
          </aside>
        </div>
      </div>
    </div>

    <!-- Right-rail search (collapses on Explore). Floating over the entire layout (desktop only). -->
    <div
      v-if="!isRightRailForcedHidden"
      aria-label="Right rail search"
      :class="[
        // Fixed overlay aligned with the same max-width container as the columns.
        'hidden md:block fixed left-0 right-0 top-0 z-40 pointer-events-none',
        'transition-opacity duration-200 ease-out',
        isRightRailSearchHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      ]"
    >
      <div class="mx-auto w-full max-w-6xl xl:max-w-7xl flex justify-end">
        <div class="pointer-events-auto w-[clamp(20rem,22vw,23.75rem)] border-b moh-border moh-bg moh-texture">
          <div class="px-4 h-16 flex items-center">
            <IconField iconPosition="left" class="w-full">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="rightRailSearchQuery"
                class="w-full h-11 !rounded-full"
                placeholder="Search…"
                @keydown.enter="goToExploreSearch"
              />
            </IconField>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile: radio bar fixed flush above tab bar; fill height so bar is solid (no gap). -->
    <div
      v-if="showRadioBar"
      class="sm:hidden fixed inset-x-0 z-30 flex items-center border-t border-gray-200 bg-white dark:border-zinc-800 dark:bg-black text-gray-900 dark:text-white"
      :style="{ bottom: 'calc(var(--moh-tabbar-height, 4rem) + var(--moh-safe-bottom, 0px))', minHeight: 'var(--moh-radio-bar-height, 4rem)' }"
    >
      <div class="w-full">
        <AppRadioBar />
      </div>
    </div>

    <!-- Mobile FAB: above tab bar and radio (when radio is up). -->
    <button
      v-if="canOpenComposer && isComposerEntrypointRoute && !hideFabForHomeComposer && !anyOverlayOpen"
      type="button"
      aria-label="New post"
      :class="[
        'sm:hidden fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg hover:opacity-95 active:scale-95',
        fabButtonClass,
      ]"
      :style="fabBottomStyle"
      @click="openComposerForCurrentRoute()"
    >
      <i class="pi pi-plus text-3xl" aria-hidden="true" />
    </button>

    <AppTabBar v-if="!anyOverlayOpen" :items="tabItems" />

    <ClientOnly>
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="composerModalOpen"
          class="fixed inset-0 z-[1000]"
          aria-label="Post composer overlay"
          role="dialog"
          aria-modal="true"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/55"
            aria-hidden="true"
            @click="closeComposerModal"
          />

          <!-- Composer sheet -->
          <div
            class="absolute"
            :style="[composerSheetStyle, composerSheetPlacementStyle]"
          >
            <div
              :class="[
                'relative overflow-hidden rounded-2xl border bg-white p-3 moh-card-matte dark:bg-black',
                composerModalBorderClass,
              ]"
            >
              <div class="relative z-10">
                <AppPostComposer
                  auto-focus
                  :show-divider="false"
                  :initial-text="composerInitialText ?? undefined"
                  @posted="onComposerPosted"
                />
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </ClientOnly>

    <AppImageLightbox
      :visible="lightbox.visible.value"
      :backdrop-visible="lightbox.backdropVisible.value"
      :src="lightbox.src.value"
      :alt="lightbox.alt.value"
      :kind="lightbox.kind.value"
      :current-media-item="lightbox.currentMediaItem.value"
      :target="lightbox.target.value"
      :image-style="lightbox.imageStyle.value"
      :show-nav="lightbox.kind.value === 'media' && (lightbox.items.value?.length ?? 0) > 1"
      :can-prev="lightbox.canPrev.value"
      :can-next="lightbox.canNext.value"
      :counter-label="
        lightbox.kind.value === 'media' && (lightbox.items.value?.length ?? 0) > 1
          ? `${lightbox.index.value + 1} / ${lightbox.items.value.length}`
          : null
      "
      :on-prev="lightbox.prev"
      :on-next="lightbox.next"
      :on-close="lightbox.close"
      :on-transition-end="lightbox.onTransitionEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import logoLightSmall from '~/assets/images/logo-white-bg-small.png'
import logoDarkSmall from '~/assets/images/logo-black-bg-small.png'
import { primaryTintCssForUser } from '~/utils/theme-tint'
import dailyQuotes from '~/config/daily-quotes.json'
import { formatDailyQuoteAttribution, getDailyQuote, type DailyQuote } from '~/utils/daily-quote'
import { msUntilNextEasternMidnight } from '~/utils/eastern-time'
import {
  MOH_HOME_COMPOSER_IN_VIEW_KEY,
  MOH_MIDDLE_SCROLLER_KEY,
  MOH_OPEN_COMPOSER_KEY,
  type ComposerVisibility,
} from '~/utils/injection-keys'
import { useBookmarkCollections } from '~/composables/useBookmarkCollections'
import { useOnlyMePosts } from '~/composables/useOnlyMePosts'
import { useReplyModal } from '~/composables/useReplyModal'

const route = useRoute()
const colorMode = useColorMode()

// Keep Safari iOS browser chrome (top/bottom bars) aligned with our in-app theme toggle.
// This is the main fix for the “white bar” in dark mode while scrolling.
const safariThemeColor = computed(() => (colorMode.value === 'dark' ? '#0F1113' : '#ffffff'))
useHead({
  meta: [{ key: 'moh-theme-color', name: 'theme-color', content: safariThemeColor }],
})
const { initAuth, user } = useAuth()
const { isAuthed, profileTo, leftItems: leftNavItems, tabItems } = useAppNav()
const notifBadge = useNotificationsBadge()
const {
  disconnectedDueToIdle,
  wasSocketConnectedOnce,
  isSocketConnected,
  connectionBarJustConnected,
  isSocketConnecting,
  reconnect,
} = usePresence()

function onReconnectClick() {
  reconnect()
}

// When disconnected bar is visible, scroll or tap anywhere should reconnect.
function onScrollOrTapReconnect() {
  const showBanner = disconnectedDueToIdle.value || (wasSocketConnectedOnce.value && !isSocketConnected.value)
  if (showBanner && !isSocketConnecting.value) reconnect()
}

let connectionBarRemoveListeners: (() => void) | null = null
watch(
  () => isAuthed && (disconnectedDueToIdle.value || (wasSocketConnectedOnce.value && !isSocketConnected.value)),
  (shouldListen) => {
    if (import.meta.client && connectionBarRemoveListeners) {
      connectionBarRemoveListeners()
      connectionBarRemoveListeners = null
    }
    if (import.meta.client && shouldListen) {
      const opts = { capture: true }
      document.addEventListener('scroll', onScrollOrTapReconnect, opts)
      document.addEventListener('click', onScrollOrTapReconnect, opts)
      document.addEventListener('touchstart', onScrollOrTapReconnect, opts)
      document.addEventListener('keydown', onScrollOrTapReconnect, opts)
      connectionBarRemoveListeners = () => {
        document.removeEventListener('scroll', onScrollOrTapReconnect, opts)
        document.removeEventListener('click', onScrollOrTapReconnect, opts)
        document.removeEventListener('touchstart', onScrollOrTapReconnect, opts)
        document.removeEventListener('keydown', onScrollOrTapReconnect, opts)
        connectionBarRemoveListeners = null
      }
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (connectionBarRemoveListeners) connectionBarRemoveListeners()
})

const { hideTopBar, navCompactMode, isRightRailForcedHidden, isRightRailSearchHidden, title } = useLayoutRules(route)
const isMessagesPage = computed(() => route.path === '/chat')
const isOnlyMePage = computed(() => route.path === '/only-me')
const shouldCapMiddleColumn = computed(() => {
  if (isMessagesPage.value) return false
  if (route.path.startsWith('/admin')) return false
  if (route.path === '/radio') return false
  if (route.path === '/tiers' || route.path.startsWith('/tiers/')) return false
  if (route.path === '/settings' || route.path.startsWith('/settings/')) return false
  return true
})

// Post entrypoints (left-nav button + mobile FAB): only render on these routes.
const isComposerEntrypointRoute = computed(() => {
  const p = route.path
  if (p === '/home') return true
  if (p === '/explore') return true
  if (p === '/notifications') return true
  if (p === '/only-me') return true
  // Reserved route (future-proof): treat current user profile as /profile if it ever exists.
  if (p === '/profile') return true
  // Current user profile route today is /u/:username via useAppNav().
  if (profileTo.value && p === profileTo.value) return true
  // Any user profile page.
  if (/^\/u\/[^/]+$/.test(p)) return true
  return false
})
const { header: appHeader } = useAppHeader()
// Prevent SSR hydration mismatches: render route meta during hydration, then swap to appHeader after mount.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
const { totalCount: bookmarkTotalCount, ensureLoaded: ensureBookmarkCollectionsLoaded } = useBookmarkCollections()

const hasBookmarks = computed(() => Math.max(0, Math.floor(bookmarkTotalCount.value ?? 0)) > 0)

// Ref owned by layout; home page injects and updates it when its composer is in view (so we can hide the FAB).
const homeComposerInViewRef = ref(false)
provide(MOH_HOME_COMPOSER_IN_VIEW_KEY, homeComposerInViewRef)
const hideFabForHomeComposer = computed(
  () => route.path === '/home' && homeComposerInViewRef.value,
)

// Only show the nav Post button when onboarding is complete (user can actually post).
const canOpenComposer = computed(() => {
  const u = user.value
  if (!u?.id) return false
  if (!u.usernameIsSet) return false
  if (!u.birthdate) return false
  if (!u.menOnlyConfirmed) return false
  if (!Array.isArray(u.interests) || u.interests.length < 1) return false
  return true
})

const composerModalOpen = ref(false)
const composerInitialText = ref<string | null>(null)
const { open: replyModalOpenRef } = useReplyModal()
const replyModalOpen = computed(() => Boolean(replyModalOpenRef.value))
const anyOverlayOpen = computed(() => composerModalOpen.value || replyModalOpen.value)

useScrollLock(anyOverlayOpen)
const composerSheetStyle = ref<Record<string, string>>({ left: '0px', right: '0px', width: 'auto' })
// SSR-safe: assume mobile so server and first client paint match; update after mount to avoid hydration mismatch.
const isSmUp = ref(false)
onMounted(() => {
  if (import.meta.client && typeof window !== 'undefined') {
    isSmUp.value = window.matchMedia('(min-width: 640px)').matches
  }
})
const mobileBottomBarVisible = computed(() => !isSmUp.value && !anyOverlayOpen.value)

const appViewportStyle = computed<Record<string, string>>(() => {
  if (!mobileBottomBarVisible.value) return { height: 'var(--moh-viewport-h, 100vh)' }
  if (showRadioBar.value) {
    return {
      height:
        'calc(var(--moh-viewport-h, 100vh) - var(--moh-tabbar-height, 4rem) - var(--moh-radio-bar-height, 4rem) - var(--moh-safe-bottom, 0px))',
    }
  }
  return {
    height: 'calc(var(--moh-viewport-h, 100vh) - var(--moh-tabbar-height, 4rem) - var(--moh-safe-bottom, 0px))',
  }
})

const composerSheetPlacementStyle = computed<Record<string, string>>(() => {
  // Keep composer placement consistent across breakpoints:
  // always a top-of-screen modal aligned with the center column.
  return { top: '0.75rem', bottom: 'auto' }
})
const composerVisibility = useCookie<'public' | 'verifiedOnly' | 'premiumOnly' | 'onlyMe'>('moh.post.visibility.v1', {
  default: () => 'public',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

function defaultComposerInitialTextForRoute(): string | null {
  // On /u/:username, prefill @username unless it’s the current user.
  const m = route.path.match(/^\/u\/([^/]+)$/)
  if (!m?.[1]) return null
  const profileUsername = decodeURIComponent(m[1]).trim()
  if (!profileUsername) return null
  const myUsername = (user.value?.username ?? '').trim()
  if (myUsername && profileUsername.toLowerCase() === myUsername.toLowerCase()) return null
  return `@${profileUsername} `
}

function openComposerModal(initialText?: string | null) {
  composerInitialText.value = (initialText ?? defaultComposerInitialTextForRoute()) || null
  composerModalOpen.value = true
}
function openComposerWithVisibility(visibility?: ComposerVisibility, initialText?: string | null) {
  if (visibility) composerVisibility.value = visibility
  composerInitialText.value = (initialText ?? defaultComposerInitialTextForRoute()) || null
  composerModalOpen.value = true
}
function openComposerForCurrentRoute(initialText?: string | null) {
  if (isOnlyMePage.value) {
    openComposerWithVisibility('onlyMe', initialText)
    return
  }
  openComposerModal(initialText)
}
provide(MOH_OPEN_COMPOSER_KEY, openComposerWithVisibility)
function closeComposerModal() {
  composerModalOpen.value = false
  composerInitialText.value = null
}

const { prependPost: prependOnlyMePost } = useOnlyMePosts()
function onComposerPosted(payload: { id: string; visibility: string; post?: import('~/types/api').FeedPost }) {
  composerModalOpen.value = false
  composerInitialText.value = null
  if (payload.visibility === 'onlyMe' && payload.post) {
    prependOnlyMePost(payload.post)
    if (route.path !== '/only-me') {
      navigateTo('/only-me?posted=1')
    }
  }
}

const composerModalBorderClass = computed(() => {
  const v = composerVisibility.value
  if (v === 'verifiedOnly') return 'moh-thread-verified'
  if (v === 'premiumOnly') return 'moh-thread-premium'
  if (v === 'onlyMe') return 'moh-thread-onlyme'
  return 'border-gray-200 dark:border-zinc-800'
})

// Post button (FAB + left nav): color matches composer scope. Public = black/white (light) or white/black (dark).
const fabButtonClass = computed(() => {
  // On /only-me, always present the "Only me" purple button and default the composer to onlyMe.
  // (We don't permanently change the cookie just by visiting the page.)
  if (isOnlyMePage.value) return 'moh-btn-onlyme moh-btn-tone'
  const v = composerVisibility.value
  if (v === 'verifiedOnly') return 'moh-btn-verified moh-btn-tone'
  if (v === 'premiumOnly') return 'moh-btn-premium moh-btn-tone'
  if (v === 'onlyMe') return 'moh-btn-onlyme moh-btn-tone'
  return 'bg-black text-white dark:bg-white dark:text-black'
})
const fabButtonStyle = computed(() => ({}))
// FAB sits above tab bar, and above radio bar too when it’s visible (mobile only).
const fabBottomStyle = computed<Record<string, string>>(() => {
  // Match the horizontal inset (`right-4`) with a bottom inset too.
  const inset = '1rem'
  const base = `calc(var(--moh-tabbar-height, 4rem) + var(--moh-safe-bottom, 0px) + ${inset})`
  if (showRadioBar.value) {
    return {
      bottom: `calc(var(--moh-tabbar-height, 4rem) + var(--moh-radio-bar-height, 4rem) + var(--moh-safe-bottom, 0px) + ${inset})`,
    }
  }
  return { bottom: base }
})

const middleContentEl = ref<HTMLElement | null>(null)

const { currentStation: currentRadioStation } = useRadioPlayer()
const showRadioBar = computed(() => Boolean(currentRadioStation.value))

function updateComposerSheetStyle() {
  if (!import.meta.client) return
  const el = middleContentEl.value ?? middleScrollerEl.value
  if (!el) return
  const r = el.getBoundingClientRect()

  // Match the actual center-column content area so it lines up with posts/cards.
  composerSheetStyle.value = {
    left: `${Math.max(0, Math.floor(r.left))}px`,
    width: `${Math.max(0, Math.floor(r.width))}px`,
  }
}

watch(
  composerModalOpen,
  (open) => {
    if (!import.meta.client) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeComposerModal()
    }
    if (open) window.addEventListener('keydown', onKeyDown)

    if (open) {
      requestAnimationFrame(() => updateComposerSheetStyle())
      window.addEventListener('resize', updateComposerSheetStyle)
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updateComposerSheetStyle)
    }
  },
  { flush: 'post' },
)

onMounted(() => {
  if (!import.meta.client) return
})

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
  const p = route.path
  if (p === '/notifications') return { icon: 'pi-bell', description: 'Replies, follows, and updates from your network.' }
  if (p === '/chat') return { icon: 'pi-envelope', description: 'Chat conversations and chat requests.' }
  if (p.startsWith('/bookmarks')) return { icon: 'pi-bookmark', description: 'Saved posts and folders.' }
  if (p === '/explore') return { icon: 'pi-search', description: 'Search and discover.' }
  if (p === '/groups') return { icon: 'pi-users', description: 'Brotherhood circles and challenges. Coming soon.' }
  if (p === '/feedback') return { icon: 'pi-send', description: 'Help us improve.' }
  if (p === '/only-me') return { icon: undefined, description: 'Private posts that only you can see. These never appear in feeds.' }
  if (p === '/roadmap') return { icon: 'pi-map', description: 'What we’re building and when.' }
  if (p === '/tiers') return { icon: 'pi-tags', description: 'Unverified, Verified, and Premium — what you get with each tier.' }
  return { icon: undefined, description: undefined }
})

function formatCompactNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  } catch {
    return String(n)
  }
}

// Centralized auth hydration lives in `useAuth()`.
await initAuth()
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

const middleScrollerEl = ref<HTMLElement | null>(null)
const titleBarEl = ref<HTMLElement | null>(null)

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

const lightbox = useImageLightbox()

const showStatusBg = computed(() => route.path === '/status')

const dailyQuoteNow = ref(new Date())
const dailyQuote = computed(() => {
  const { quote } = getDailyQuote(dailyQuotes as unknown as DailyQuote[], dailyQuoteNow.value)
  return quote
})
const dailyQuoteAttribution = computed(() => (dailyQuote.value ? formatDailyQuoteAttribution(dailyQuote.value) : ''))

let dailyQuoteTimer: ReturnType<typeof setTimeout> | null = null
function scheduleDailyQuoteRollover() {
  if (!import.meta.client) return
  dailyQuoteTimer && clearTimeout(dailyQuoteTimer)
  const ms = msUntilNextEasternMidnight(new Date())
  // Nudge a bit after midnight so we reliably cross the boundary.
  dailyQuoteTimer = setTimeout(() => {
    dailyQuoteNow.value = new Date()
    scheduleDailyQuoteRollover()
  }, Math.max(1000, ms + 2000))
}
onMounted(() => scheduleDailyQuoteRollover())
onBeforeUnmount(() => {
  dailyQuoteTimer && clearTimeout(dailyQuoteTimer)
  dailyQuoteTimer = null
})

const {
  users: whoToFollowUsers,
  loading: whoToFollowLoading,
  error: whoToFollowError,
  refresh: refreshWhoToFollow,
} = useWhoToFollow({
  enabled: computed(() => isAuthed.value && !isRightRailForcedHidden.value),
  defaultLimit: 4,
})

const tierCtaTextClass = computed(() => {
  const u = user.value
  if (u?.premiumPlus || u?.premium) return 'text-[var(--moh-premium)]'
  if (u?.verifiedStatus && u.verifiedStatus !== 'none') return 'text-[var(--moh-verified)]'
  return 'text-gray-700 dark:text-gray-200'
})

function isActiveNav(to: string) {
  if (to === '/home') return route.path === '/home'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function scrollMiddleToTop() {
  const el = middleScrollerEl.value
  if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
}

function onHomeClick(e: MouseEvent) {
  if (route.path === '/home') {
    e.preventDefault()
    scrollMiddleToTop()
  }
}

function onLeftNavClick(to: string, e: MouseEvent) {
  if (!isActiveNav(to)) return
  e.preventDefault()
  e.stopPropagation()
  if (to === '/home') scrollMiddleToTop()
}
</script>

<style>
.moh-status-tone {
  /* Force an "ops console" palette regardless of color mode. */
  --moh-bg: #000;
  --moh-surface: rgba(0, 0, 0, 0.55);
  --moh-surface-hover: rgba(255, 255, 255, 0.06);
  --moh-border: rgba(255, 255, 255, 0.12);
  --moh-text: #e7e9ea;
  --moh-text-muted: rgba(231, 233, 234, 0.68);
  --moh-frosted: rgba(0, 0, 0, 0.55);
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


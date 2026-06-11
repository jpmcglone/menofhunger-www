<template>
  <aside
    id="moh-right-rail-scroller"
    ref="rightRailEl"
    :class="[
      // Layout should not add padding; right-rail content owns its gutters.
      'relative no-scrollbar shrink-0 w-[var(--moh-right-rail-w)] h-full moh-bg moh-texture',
      // Single native scroller: the rail itself scrolls; search floats above the entire layout.
      // IMPORTANT: `min-h-0` is required so the rail can scroll in a flex row.
      'min-h-0',
      anyOverlayOpen || showRadioChat ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain',
      forcedHidden ? 'hidden' : 'hidden min-[962px]:block'
    ]"
  >
    <!-- Offset the scroller content so it doesn't sit under the floating search bar. -->
    <div
      :class="[
        'transition-[padding-top] duration-200 ease-out',
        hideSearch ? 'pt-0' : 'pt-16',
        showRadioChat ? 'h-full' : '',
      ]"
    >
      <Transition
        mode="out-in"
        enter-active-class="transition-[opacity,transform] duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-[opacity,transform] duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div v-if="showRadioChat" key="radioChat" class="h-full min-h-0 flex flex-col">
          <AppRadioLiveChatPanel class="flex-1 min-h-0" />
        </div>

        <div v-else key="rightRailDefault">
          <AppRightRailContent>
          <!-- Daily quote: links to /daily/quote; dims when on /daily or /daily/quote -->
          <component
            :is="isOnDailyQuoteRoute ? 'div' : NuxtLink"
            :to="isOnDailyQuoteRoute ? undefined : '/daily/quote'"
            class="block transition-opacity duration-200"
            :class="isOnDailyQuoteRoute ? 'opacity-40' : 'hover:opacity-75'"
          >
          <div
            v-if="dailyQuote"
            class="my-8 py-2 text-center text-sm leading-relaxed text-gray-700 dark:text-gray-200"
          >
            <figure>
              <blockquote class="italic moh-serif">
                “{{ dailyQuote.text }}”
              </blockquote>
              <figcaption class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span class="font-semibold">
                  {{ dailyQuoteAttribution }}
                </span>
                <span v-if="dailyQuote.isParaphrase" class="ml-1">(paraphrase)</span>
              </figcaption>
            </figure>
            <div class="mt-8 h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent" />
          </div>
          <!-- Quote placeholder while daily content loads -->
          <div v-else class="my-8 py-2 text-center space-y-2.5 animate-pulse" aria-hidden="true">
            <div class="h-3.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-64" />
            <div class="h-3.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-56" />
            <div class="h-3.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-44" />
            <div class="mt-3 h-3 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-28" />
            <div class="mt-6 h-[1px] w-32 mx-auto bg-gray-200 dark:bg-zinc-800" />
          </div>
          </component>

          <div class="space-y-4 transition-[transform] duration-200 ease-out">
          <AppReferralRailCard />

          <!-- Order matters here: Who-to-follow renders before Trending so the
               most actionable rail card (real people you can follow right now)
               is the first thing the eye lands on after the daily quote. -->
          <div class="space-y-1">
            <div class="flex justify-end px-2">
              <NuxtLink
                to="/online"
                class="inline-flex items-center gap-1 text-sm hover:underline underline-offset-2"
                @mouseenter="onOnlineLinkEnter"
                @mousemove="onOnlineLinkMove"
                @mouseleave="onOnlineLinkLeave"
                @click="onOnlineLinkClick"
              >
                <template v-if="typeof onlineCount === 'number'">
                  <span class="font-semibold text-gray-900 dark:text-white tabular-nums">
                    <AppAnimatedCount :value="onlineCount" />
                  </span>
                  <span class="moh-text-muted">online</span>
                </template>
                <template v-else>
                  <span class="moh-text-muted">Online</span>
                </template>
              </NuxtLink>
            </div>

          <!-- Who to follow (real data) -->
            <Card class="moh-card moh-card-matte !rounded-2xl">
              <template #title>
                <span class="moh-h2">Who to follow</span>
              </template>
              <template #content>
                <div v-if="whoToFollowLoading && whoToFollowUsers.length === 0" class="space-y-3 animate-pulse py-1">
                  <div v-for="i in 3" :key="i" class="flex items-center gap-2.5">
                    <div class="h-9 w-9 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0" />
                    <div class="flex-1 space-y-1.5">
                      <div class="h-3 bg-gray-200 dark:bg-zinc-800 rounded-full w-2/3" />
                      <div class="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded-full w-1/2" />
                    </div>
                  </div>
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
                  <AppUserErrorMessage :error="whoToFollowError" fallback="Failed to load suggestions." />
                  <p v-if="!whoToFollowError">No suggestions yet.</p>
                  <NuxtLink to="/explore" class="inline-block mt-2 font-medium hover:underline">
                    Explore people
                  </NuxtLink>
                </div>
              </template>
            </Card>
          </div>

          <!-- Word of the Day: dims when on /daily or /daily/word -->
          <div
            class="transition-opacity duration-200"
            :class="isOnDailyWordRoute ? 'opacity-40 pointer-events-none' : ''"
          >
            <AppWebsters1828WordOfDayCard :detail-to="isOnDailyWordRoute ? undefined : '/daily/word'" />
          </div>

          <!-- Unified trending card replaces the previous three:
               AppTrendingArticlesCard / AppTrendingTagsCard / AppTrendingHashtagsCard.
               One label, three tabs (Articles / Topics / Hashtags). -->
          <AppRailTrendingCard />

          <!-- ClientOnly avoids hydration mismatch: widget shares leaderboard state with page,
               and SSR streaming can send layout before page fetch completes. -->
          <ClientOnly>
            <AppCheckinsLeaderboardWidget />
          </ClientOnly>

          <AppSupportDonateCard />

          <!-- Ads can mutate DOM; keep the mount point client-only. -->
          <ClientOnly>
            <AppAdSlot placement="rail" />
          </ClientOnly>

          <Card class="moh-card moh-card-matte !rounded-2xl">
            <template #title>
              <span class="moh-h2">Groups</span>
            </template>
            <template #content>
              <ClientOnly>
                <AppGroupsRailCard />
              </ClientOnly>
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
            <button type="button" class="hover:underline" @click="openShortcutsModal">Shortcuts</button>
            <span>·</span>
            <span>&copy; {{ currentYear }} {{ siteConfig.name }}</span>
          </div>
          </div>
            </AppRightRailContent>
          </div>
        </Transition>
      </div>
  </aside>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import { formatDailyQuoteAttribution } from '~/utils/daily-quote'
import { userColorTier, userTierTextClass } from '~/utils/user-tier'
import { ClientOnly, NuxtLink } from '#components'
import type { DailyContentToday, DailyQuote } from '~/types/api'

const props = defineProps<{
  /** A modal overlay is open — freeze the rail's own scrolling. */
  anyOverlayOpen: boolean
  /** Show the live-chat panel instead of the default rail content. */
  showRadioChat: boolean
  /** Route rules force-hide the rail entirely. */
  forcedHidden: boolean
  /** The floating search bar is hidden — remove the top offset. */
  hideSearch: boolean
}>()

const { user } = useAuth()
const { apiFetchData } = useApiClient()
const { openShortcutsModal } = useKeyboardShortcuts()
const currentYear = new Date().getUTCFullYear()

const route = useRoute()
const isOnDailyRoute = computed(() => route.path === '/daily' || route.path.startsWith('/daily/'))
const isOnDailyQuoteRoute = computed(() => route.path === '/daily' || route.path === '/daily/quote')
const isOnDailyWordRoute = computed(() => route.path === '/daily' || route.path === '/daily/word')

const rightRailEl = ref<HTMLElement | null>(null)
defineExpose({
  /** The rail's scroller element — the layout uses it for linked scrolling. */
  el: rightRailEl,
})

// Prevent SSR hydration mismatches: data fetches only enable after mount.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const { dayKey: dailyContentDayKey } = useEasternMidnightRollover()
const {
  data: dailyContent,
  refresh: refreshDailyContent,
} = useLazyAsyncData<DailyContentToday | null>(
  'daily-content:today',
  async () => {
    return await apiFetchData<DailyContentToday>('/meta/daily-content/today', {
      method: 'GET',
      mohCache: { ttlMs: 60 * 60 * 1000, staleWhileRevalidateMs: 60 * 60 * 1000 },
    })
  },
  {
    server: false,
    default: () => null,
  },
)

const dailyQuote = computed<DailyQuote | null>(() => dailyContent.value?.quote ?? null)
const dailyQuoteAttribution = computed(() => (dailyQuote.value ? formatDailyQuoteAttribution(dailyQuote.value as any) : ''))

watch(
  () => dailyContentDayKey.value,
  async (next, prev) => {
    if (!import.meta.client) return
    if (!prev) return
    if (next === prev) return
    await refreshDailyContent()
  },
)

const {
  users: whoToFollowUsers,
  loading: whoToFollowLoading,
  error: whoToFollowError,
} = useWhoToFollow({
  enabled: computed(() => hydrated.value && !props.forcedHidden),
  defaultLimit: 4,
})

const { count: onlineCount, onlineCountPopover } = useOnlineCount({
  enabled: computed(() => !props.forcedHidden),
})

function onOnlineLinkEnter(e: MouseEvent) {
  onlineCountPopover.onTriggerEnter(e)
}
function onOnlineLinkMove(e: MouseEvent) {
  onlineCountPopover.onTriggerMove(e)
}
function onOnlineLinkLeave() {
  onlineCountPopover.onTriggerLeave()
}
function onOnlineLinkClick() {
  onlineCountPopover.close()
}

const tierCtaTextClass = computed(() => {
  return userTierTextClass(userColorTier(user.value), { fallback: 'text-gray-700 dark:text-gray-200' })
})
</script>

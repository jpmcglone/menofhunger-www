<template>
  <!-- Profile pages use the app-standard gutter (px-4). Banner cancels it for full-bleed. -->
  <AppPageContent bottom="standard">
  <div class="w-full">
    <div v-if="profileBanned" class="px-4 mx-auto max-w-3xl py-10">
      <div class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        This account has been banned
      </div>
      <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        This profile is no longer available. If you think this is a mistake, contact an admin.
      </div>
    </div>

    <div v-else-if="notFound" class="px-4 mx-auto max-w-3xl py-10">
      <div class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        This account doesn't exist
      </div>
      <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Check the username and try again.
      </div>
    </div>

    <div v-else-if="apiError" class="px-4 mx-auto max-w-3xl py-10">
      <div class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        Something went wrong
      </div>
      <div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
        We couldn't load this profile. Please try again.
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <NuxtLink to="/status" class="text-sm font-medium moh-text underline underline-offset-2">
          Check status
        </NuxtLink>
        <button
          type="button"
          class="text-sm font-medium moh-text-muted hover:opacity-90 underline underline-offset-2"
          @click="reloadPage"
        >
          Try again
        </button>
      </div>
    </div>

    <div v-else>
      <!-- Client-only: header uses UI primitives (tooltips/menus/dialogs) that can SSR-hydrate inconsistently. -->
      <ClientOnly>
        <template #fallback>
          <div>
            <div class="aspect-[3.25/1] w-full bg-gray-200 dark:bg-zinc-900" />
            <div class="mx-auto max-w-3xl px-4 pb-5 pt-14">
              <div class="h-20" />
            </div>
          </div>
        </template>
        <AppProfileHeader
          :profile="profile"
          :profile-name="profileName"
          :profile-avatar-url="profileAvatarUrl"
          :profile-banner-url="profileBannerUrl"
          :hide-banner-thumb="hideBannerThumb"
          :hide-avatar-thumb="hideAvatarThumb"
          :hide-avatar-during-banner="hideAvatarDuringBanner"
          :relationship-tag-label="relationshipTagLabel"
          :is-self="isSelf"
          :follow-relationship="followRelationship"
          :nudge="followSummary?.nudge ?? null"
          :show-follow-counts="showFollowCounts"
          :follower-count="followSummary?.followerCount ?? 0"
          :following-count="followSummary?.followingCount ?? 0"
          @open-image="onOpenProfileImage"
          @edit="editOpen = true"
          @open-followers="goToFollowers"
          @open-following="goToFollowing"
          @followed="onFollowed"
          @unfollowed="onUnfollowed"
          @nudge-updated="onNudgeUpdated"
        />
      </ClientOnly>

      <div v-if="profile" class="mx-auto max-w-3xl px-4 mt-3">
        <div class="flex items-center gap-2">
          <!-- Streaks popover -->
          <div ref="streaksWrapperEl" class="relative inline-block">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border moh-border moh-surface moh-text hover:opacity-80 transition-opacity"
              @click="toggleStreaks"
            >
              <Icon name="tabler:flame" class="text-[14px] moh-text-muted" aria-hidden="true" />
              Streaks
            </button>
            <Transition
              enter-active-class="transition-[opacity,transform] duration-150 ease-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition-[opacity,transform] duration-100 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="streaksOpen"
                class="absolute left-0 top-full mt-2 z-50 w-52 rounded-xl border moh-border moh-bg shadow-lg p-3 origin-top-left"
              >
                <div class="space-y-2.5 text-sm">
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-1.5 font-medium moh-text-muted">
                      <Icon name="tabler:flame" class="text-[13px]" aria-hidden="true" />
                      Current
                    </div>
                    <div class="font-semibold tabular-nums moh-text">{{ streakCurrentDays }}d</div>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-1.5 font-medium moh-text-muted">
                      <Icon name="tabler:trophy" class="text-[13px]" aria-hidden="true" />
                      Longest
                    </div>
                    <div class="font-semibold tabular-nums moh-text">{{ streakLongestDays }}d</div>
                  </div>
                  <div v-if="isSelf" class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-1.5 font-medium moh-text-muted">
                      <Icon name="tabler:coin" class="text-[13px]" aria-hidden="true" />
                      Coins
                    </div>
                    <div class="font-semibold tabular-nums moh-text">{{ formatCount(authUser?.coins ?? 0) }}</div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Badges popover — only shown if at least one milestone is earned -->
          <div v-if="hasEarnedBadges" ref="badgesWrapperEl" class="relative inline-block">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border moh-border moh-surface moh-text hover:opacity-80 transition-opacity"
              @click="toggleBadges"
            >
              <Icon name="tabler:award" class="text-[14px] moh-text-muted" aria-hidden="true" />
              Badges
            </button>
            <Transition
              enter-active-class="transition-[opacity,transform] duration-150 ease-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition-[opacity,transform] duration-100 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="badgesOpen"
                class="absolute left-0 top-full mt-2 z-50 rounded-xl border moh-border moh-bg shadow-lg p-3 origin-top-left"
              >
                <AppStreakBadge :longest-streak-days="streakLongestDays" />
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Pinned post -->
      <div v-if="showPinnedPost" class="mt-3 mb-4">
        <ClientOnly>
          <template #fallback>
            <div class="min-h-0" aria-hidden="true" />
          </template>
          <template v-if="pinnedPostForDisplay">
            <div class="flex flex-col gap-0">
              <div class="flex flex-wrap items-center justify-between gap-2 px-4 pt-0 pb-1">
                <NuxtLink
                  v-if="pinnedReplyToUsername"
                  :to="`/p/${pinnedPostForDisplay.id}`"
                  class="text-sm text-gray-500 hover:underline dark:text-gray-400"
                >
                  Replying to @{{ pinnedReplyToUsername }}
                  <span class="ml-1 text-xs opacity-80">View thread</span>
                </NuxtLink>
                <span v-else class="flex-1" />
                <span
                  :class="['rounded border px-2 py-0.5 text-[11px] font-semibold', pinnedBadgeClasses(pinnedPostForDisplay.visibility)]"
                >
                  Pinned
                </span>
              </div>
              <div
                :class="['rounded-none overflow-hidden', postHighlightClasses(pinnedPostForDisplay.visibility)]"
              >
                <AppFeedPostRow :post="pinnedPostForDisplay" @deleted="onPinnedPostDeleted" @edited="onProfilePostEdited" />
              </div>
            </div>
          </template>
          <div v-else class="min-h-0" aria-hidden="true" />
        </ClientOnly>
      </div>

      <!-- Block indicator: shown when a block exists between viewer and profile user -->
      <div v-if="!isSelf && isBlockedWithProfile" class="mx-auto max-w-3xl px-4 mb-2">
        <div class="flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-sm text-zinc-300">
          <Icon name="tabler:ban" class="mt-0.5 shrink-0 text-zinc-400" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <template v-if="viewerHasBlockedProfile">
              <span class="font-semibold text-white">You've blocked {{ profileBlockHandle }}.</span>
              They can view your posts but can't engage with them. You can view their posts but can't engage with theirs.
            </template>
            <template v-else>
              <span class="font-semibold text-white">{{ profileBlockHandle }} has blocked you.</span>
              You can view their posts but can't engage with them.
            </template>
          </div>
          <button
            v-if="viewerHasBlockedProfile"
            type="button"
            class="shrink-0 text-xs font-semibold text-zinc-300 underline underline-offset-2 hover:text-white"
            :disabled="blockingProfile"
            @click="bannerUnblockConfirmVisible = true"
          >
            Unblock
          </button>
        </div>
      </div>

      <!-- Filter bar above tabs, right-aligned -->
      <div class="flex items-center justify-end px-3 py-1 border-b border-gray-200 dark:border-zinc-800">
        <AppFeedFiltersBar
          :sort="profileSort"
          :filter="profileFilter"
          :viewer-is-verified="profileViewerIsVerified"
          :viewer-is-premium="profileViewerIsPremium"
          :show-reset="profileIsFiltered"
          :show-visibility-filter="activeProfileTab !== 'media'"
          @update:sort="onUserPostsSortChange"
          @update:filter="onUserPostsFilterChange"
          @reset="onUserPostsReset"
        />
      </div>

      <!-- Animated tab bar -->
      <div ref="profileTabBarEl" class="relative flex gap-0 border-b border-gray-200 dark:border-zinc-800">
        <button
          v-for="tab in profileTabs"
          :key="tab.key"
          :ref="(el) => setProfileTabButtonRef(tab.key, el as HTMLElement | null)"
          type="button"
          class="relative cursor-pointer px-5 py-3 text-sm font-semibold transition-colors"
          :class="activeProfileTab === tab.key
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'"
          @click="setProfileTab(tab.key)"
        >
          {{ tab.label }}
        </button>
        <!-- Animated sliding underline -->
        <span
          class="absolute bottom-0 h-[2px] rounded-full"
          :class="profileUnderlineReady ? 'transition-[left,width] duration-250 ease-in-out' : ''"
          :style="{ left: `${profileUnderlineLeft}px`, width: `${profileUnderlineWidth}px`, backgroundColor: profileActiveTabColor }"
          aria-hidden="true"
        />
      </div>

      <div v-if="effectiveProfileCtaKind === 'verify'" class="mx-3 mt-3 sm:mx-4 sm:mt-4">
        <AppAccessGateCard kind="verify" />
      </div>
      <div v-else-if="effectiveProfileCtaKind === 'premium'" class="mx-3 mt-3 sm:mx-4 sm:mt-4">
        <AppAccessGateCard kind="premium" />
      </div>

      <!-- ─── Posts tab (top-level only) ───────────────────────────────── -->
      <div v-if="!effectiveProfileCtaKind && tabActivated.posts" v-show="activeProfileTab === 'posts'" class="min-h-[75vh]">
        <ClientOnly>
          <template #fallback><div class="flex justify-center pt-12 pb-8"><AppLogoLoader /></div></template>
          <AppSubtleSectionLoader :loading="postsOnlyInitialLoading" min-height-class="min-h-[220px]">
            <div>
              <div v-if="postsOnlyError" class="px-4 mt-3 text-sm text-red-700 dark:text-red-300">{{ postsOnlyError }}</div>
              <div v-else-if="postsOnlyHasLoadedOnce && postsOnlyItems.length === 0" class="px-4 mt-3 text-sm text-gray-500 dark:text-gray-400">No posts yet.</div>
              <div v-else class="relative mt-3">
                <template v-for="item in postsOnlyItems" :key="item.kind === 'ad' ? item.key : item.post.id">
                  <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                  <AppFeedPostRow
                    v-else
                    :post="item.post"
                    :collapsed-sibling-replies-count="postsOnlyCollapsedSiblingReplyCountFor(item.post)"
                    :reply-count-for-parent-id="postsOnlyReplyCountForParentId"
                    :replies-sort="profileSort"
                    @deleted="postsOnlyRemovePost"
                    @edited="(p) => postsOnlyReplacePost(p.post)"
                  />
                </template>
                <div v-if="postsOnlyNextCursor" class="relative flex justify-center items-center px-4 py-6 min-h-12">
                  <div ref="postsOnlyLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
                  <div class="transition-opacity duration-150" :class="postsOnlyLoadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'">
                    <AppLogoLoader compact />
                  </div>
                </div>
              </div>
            </div>
          </AppSubtleSectionLoader>
        </ClientOnly>
      </div>

      <!-- ─── Replies tab (all posts including replies) ─────────────────── -->
      <div v-if="!effectiveProfileCtaKind && tabActivated.replies" v-show="activeProfileTab === 'replies'" class="min-h-[75vh]">
        <ClientOnly>
          <template #fallback><div class="flex justify-center pt-12 pb-8"><AppLogoLoader /></div></template>
          <AppSubtleSectionLoader :loading="repliesInitialLoading" min-height-class="min-h-[220px]">
            <div>
              <div v-if="profileError" class="px-4 mt-3 text-sm text-red-700 dark:text-red-300">{{ profileError }}</div>
              <div v-else-if="profileHasLoadedOnce && itemsWithoutPinned.length === 0 && !pinnedPostForDisplay" class="px-4 mt-3 text-sm text-gray-500 dark:text-gray-400">No posts yet.</div>
              <div v-else class="relative mt-3">
                <template v-for="item in itemsWithoutPinned" :key="item.kind === 'ad' ? item.key : item.post.id">
                  <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                  <AppFeedPostRow
                    v-else
                    :post="item.post"
                    :collapsed-sibling-replies-count="profileCollapsedSiblingReplyCountFor(item.post)"
                    :reply-count-for-parent-id="profileReplyCountForParentId"
                    :replies-sort="profileSort"
                    @deleted="profileRemovePost"
                    @edited="onProfilePostEdited"
                  />
                </template>
                <div v-if="profileNextCursor" class="relative flex justify-center items-center px-4 py-6 min-h-12">
                  <div ref="profileLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
                  <div class="transition-opacity duration-150" :class="profileLoadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'">
                    <AppLogoLoader compact />
                  </div>
                </div>
              </div>
            </div>
          </AppSubtleSectionLoader>
        </ClientOnly>
      </div>

      <!-- ─── Articles tab ─────────────────────────────────────────────── -->
      <div v-if="!effectiveProfileCtaKind && articlesFeatureEnabled && tabActivated.articles" v-show="activeProfileTab === 'articles'" class="min-h-[75vh]">
        <AppSubtleSectionLoader :loading="articlesInitialLoading" min-height-class="min-h-[220px]">
          <div v-if="profileArticlesFeed.error.value" class="px-4 mt-3 text-sm text-red-700 dark:text-red-300">
            {{ profileArticlesFeed.error.value }}
          </div>
          <div v-else>
            <TransitionGroup name="profile-articles-list" tag="div">
              <AppArticleListCard
                v-for="article in profileArticlesFeed.articles.value"
                :key="article.id"
                :article="article"
              />
            </TransitionGroup>
            <button
              v-if="profileArticlesFeed.nextCursor.value"
              type="button"
              class="w-full border-t border-gray-200 dark:border-zinc-800 py-3 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              :disabled="profileArticlesFeed.loadingMore.value"
              @click="profileArticlesFeed.loadMore()"
            >
              {{ profileArticlesFeed.loadingMore.value ? 'Loading…' : 'Load more' }}
            </button>
            <p v-if="profileArticlesFeed.articles.value.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
              No articles yet.
            </p>
          </div>
        </AppSubtleSectionLoader>
      </div>

      <!-- ─── Media tab ─────────────────────────────────────────────────── -->
      <div v-if="!effectiveProfileCtaKind && tabActivated.media" v-show="activeProfileTab === 'media'" class="min-h-[75vh]">
        <AppSubtleSectionLoader :loading="mediaInitialLoading" min-height-class="min-h-[220px]">
          <div v-if="profileMediaFeed.error.value" class="px-4 mt-3 text-sm text-red-700 dark:text-red-300">
            {{ profileMediaFeed.error.value }}
          </div>
          <div v-else>
            <TransitionGroup
              name="media-grid"
              tag="div"
              class="grid gap-0.5 bg-gray-200 dark:bg-zinc-800"
              style="grid-template-columns: repeat(auto-fill, minmax(min(120px, 100%), 1fr))"
            >
              <NuxtLink
                v-for="item in profileMediaFeed.items.value"
                :key="item.id"
                :to="`/p/${item.postId}`"
                class="relative aspect-square overflow-hidden bg-gray-100 dark:bg-zinc-900 hover:opacity-90 transition-opacity"
              >
                <img
                  :src="item.kind === 'video' ? (item.thumbnailUrl ?? item.url ?? '') : (item.url ?? '')"
                  :alt="item.kind === 'video' ? 'Video' : 'Photo'"
                  class="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <!-- Video play overlay -->
                <div v-if="item.kind === 'video'" class="absolute inset-0 flex items-center justify-center">
                  <div class="rounded-full bg-black/50 p-2">
                    <Icon name="tabler:player-play-filled" class="text-white text-lg" aria-hidden="true" />
                  </div>
                </div>
              </NuxtLink>
            </TransitionGroup>
            <!-- Load more -->
            <div v-if="profileMediaFeed.nextCursor.value" class="relative flex justify-center items-center px-4 py-6 min-h-12">
              <div ref="mediaLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
              <div class="transition-opacity duration-150" :class="profileMediaFeed.loadingMore.value ? 'opacity-100' : 'opacity-0 pointer-events-none'">
                <AppLogoLoader compact />
              </div>
            </div>
            <p v-if="profileMediaFeed.hasLoadedOnce.value && profileMediaFeed.items.value.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
              No photos or videos yet.
            </p>
          </div>
        </AppSubtleSectionLoader>
      </div>

      <AppProfileFollowListDialog
        v-model="followersOpen"
        header="Followers"
        :users="followers"
        :loading="followersLoading"
        :error="followersError"
        empty-text="No followers yet."
        :next-cursor="followersNextCursor"
        :expected-total-count="showFollowCounts ? (followSummary?.followerCount ?? null) : null"
        @load-more="loadMoreFollowers"
      />

      <AppProfileFollowListDialog
        v-model="followingOpen"
        header="Following"
        :users="following"
        :loading="followingLoading"
        :error="followingError"
        empty-text="Not following anyone yet."
        :next-cursor="followingNextCursor"
        :expected-total-count="showFollowCounts ? (followSummary?.followingCount ?? null) : null"
        @load-more="loadMoreFollowing"
      />

      <AppProfileEditProfileDialog
        v-model="editOpen"
        :profile="profile"
        :is-self="isSelf"
        :profile-avatar-url="profileAvatarUrl"
        :profile-banner-url="profileBannerUrl"
        @patch-profile="patchPublicProfile"
      />

      <Dialog
        v-model:visible="bannerUnblockConfirmVisible"
        modal
        :header="`Unblock ${profileBlockHandle}?`"
        :style="{ width: '28rem', maxWidth: '92vw' }"
      >
        <div class="text-sm text-gray-700 dark:text-gray-300">
          They'll be able to see your posts and engage with them again.
        </div>
        <template #footer>
          <Button label="Cancel" text severity="secondary" @click="bannerUnblockConfirmVisible = false" />
          <Button
            :label="blockingProfile ? 'Unblocking…' : 'Unblock'"
            severity="secondary"
            :disabled="blockingProfile"
            @click="confirmBannerUnblock"
          />
        </template>
      </Dialog>
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { PublicProfile } from '~/composables/usePublicProfile'

import type { FollowRelationship } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { visibilityTagClasses, postHighlightClasses } from '~/utils/post-visibility'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { UserPostsFilter } from '~/composables/useUserPosts'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'

definePageMeta({
  layout: 'app',
  title: 'Profile',
  // Aliases let all tab URLs share the same route record — Vue Router keeps the
  // component mounted when switching between them instead of unmounting/remounting.
  alias: [
    '/u/:username/posts',
    '/u/:username/replies',
    '/u/:username/articles',
    '/u/:username/media',
    '/u/:username/followers',
    '/u/:username/following',
  ],
})

const route = useRoute()
const router = useRouter()
const usernameParam = computed(() => String(route.params.username || ''))
const normalizedUsername = computed(() => usernameParam.value.trim().toLowerCase())
const baseProfilePath = computed(() => `/u/${encodeURIComponent(usernameParam.value)}`)

// ── currentPathname: tracks the real browser URL ──────────────────────────────
// Keep this synced from router + browser history so tab/modal state follows URL.
const currentPathname = ref(import.meta.client ? location.pathname : route.path)

// Sync from Vue Router (handles: arriving from a different page, initial load)
watch(() => route.path, (path) => { currentPathname.value = path })

// Sync from browser back/forward.
if (import.meta.client) {
  const onPopState = () => { currentPathname.value = location.pathname }
  onMounted(() => window.addEventListener('popstate', onPopState))
  onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))
}

// Prefer router navigation so back/forward restores exact profile subroutes.
// `force: true` avoids alias dedupe (same route name + params).
//
// Filters are managed via history.replaceState (historyBacked mode), so
// location.search is the authoritative source — route.query may be stale.
async function pushProfilePath(path: string) {
  const qs: Record<string, string> = {}
  if (import.meta.client) {
    new URLSearchParams(location.search).forEach((value, key) => { qs[key] = value })
  } else {
    Object.entries(route.query).forEach(([k, v]) => {
      if (v != null) qs[k] = Array.isArray(v) ? String(v[v.length - 1] ?? '') : String(v)
    })
  }
  try {
    await router.push({ path, query: qs, force: true } as any)
    return
  } catch {
    // Fallback: keep URL and local tab state in sync even if router rejects.
  }
  currentPathname.value = path
  const search = new URLSearchParams(qs)
  const newUrl = search.toString() ? `${path}?${search}` : path
  history.pushState({ ...history.state }, '', newUrl)
}

const isFollowersRoute = computed(() => /\/followers\/?$/.test(currentPathname.value))
const isFollowingRoute = computed(() => /\/following\/?$/.test(currentPathname.value))

const { profile, data, notFound, profileBanned, apiError } = await usePublicProfile(normalizedUsername)
useProfileSeo({ profile, normalizedUsername, notFound, profileBanned })

const { header: appHeader } = useAppHeader()
const profileName = computed(() => profile.value?.name || profile.value?.username || 'User')
if (!notFound.value && profile.value) {
  appHeader.value = {
    title: profileName.value,
    verifiedStatus: profile.value.verifiedStatus ?? null,
    premium: profile.value.premium ?? null,
    premiumPlus: profile.value.premiumPlus ?? null,
    stewardBadgeEnabled: profile.value.stewardBadgeEnabled ?? null,
    postCount: null,
  }
}

const { user: authUser, me: refetchMe } = useAuth()

const countFmt = new Intl.NumberFormat('en-US')
function formatCount(n: unknown): string {
  const v = typeof n === 'number' ? n : Number(n)
  return countFmt.format(Math.max(0, Math.floor(Number.isFinite(v) ? v : 0)))
}

const streaksOpen = ref(false)
const badgesOpen = ref(false)
const streaksWrapperEl = ref<HTMLElement | null>(null)
const badgesWrapperEl = ref<HTMLElement | null>(null)

const streakCurrentDays = computed(() =>
  Math.max(0, Math.floor((isSelf.value ? authUser.value?.checkinStreakDays : (profile.value as any)?.checkinStreakDays) ?? 0))
)
const streakLongestDays = computed(() =>
  Math.max(0, Math.floor((isSelf.value ? authUser.value?.longestStreakDays : (profile.value as any)?.longestStreakDays) ?? 0))
)
// AppStreakBadge lowest milestone is 7 days
const hasEarnedBadges = computed(() => streakLongestDays.value >= 7)

function toggleStreaks() {
  badgesOpen.value = false
  streaksOpen.value = !streaksOpen.value
}
function toggleBadges() {
  streaksOpen.value = false
  badgesOpen.value = !badgesOpen.value
}

function onProfileStatPointerDown(e: PointerEvent) {
  const target = e.target
  if (!(target instanceof Node)) return
  const inStreaks = streaksWrapperEl.value?.contains(target) ?? false
  const inBadges = badgesWrapperEl.value?.contains(target) ?? false
  if (!inStreaks) streaksOpen.value = false
  if (!inBadges) badgesOpen.value = false
}
const usersStore = useUsersStore()
const { invalidateUserPreviewCache } = useUserPreview()
const { markReadBySubject } = useNotifications()
watch(
  () => [profile.value?.id, authUser.value?.id] as const,
  ([profileId, uid]) => {
    if (profileId && uid) markReadBySubject({ user_id: profileId })
  },
  { immediate: true },
)

const isSelf = computed(() => Boolean(authUser.value?.id && profile.value?.id && authUser.value.id === profile.value.id))

const effectivePinnedPostId = computed(() => {
  const profilePid = profile.value?.pinnedPostId ?? null
  if (isSelf.value && authUser.value?.pinnedPostId !== undefined) {
    return authUser.value.pinnedPostId ?? null
  }
  return profilePid
})

const showAds = computed(() => !authUser.value?.premium)

// ─── Shared filter/sort state for all profile tabs — synced to URL params ─────
const {
  filter: profileFilter,
  sort: profileSort,
  viewerIsVerified: profileViewerIsVerified,
  viewerIsPremium: profileViewerIsPremium,
  ctaKind: profileCtaKind,
  isFiltered: profileIsFiltered,
  resetFilters: resetProfileFilters,
} = useUrlFeedFilters({ historyBacked: true })

// ─── Tab state ────────────────────────────────────────────────────────────────
type ProfileTabKey = 'posts' | 'replies' | 'articles' | 'media'

function tabFromRoute(path: string): ProfileTabKey {
  if (/\/replies\/?$/.test(path)) return 'replies'
  if (/\/media\/?$/.test(path)) return 'media'
  if (/\/articles\/?$/.test(path)) return 'articles'
  return 'posts'
}

const activeProfileTab = computed<ProfileTabKey>(() => tabFromRoute(currentPathname.value))
const effectiveProfileCtaKind = computed<null | 'verify' | 'premium'>(() => (
  activeProfileTab.value === 'media' ? null : profileCtaKind.value
))

const tabActivated = reactive<Record<ProfileTabKey, boolean>>({
  posts: true,
  replies: tabFromRoute(route.path) === 'replies',
  articles: tabFromRoute(route.path) === 'articles',
  media: tabFromRoute(route.path) === 'media',
})

watch(activeProfileTab, (tab) => {
  if (!tabActivated[tab]) tabActivated[tab] = true
  nextTick(updateProfileUnderline)
}, { immediate: true })

const { articlesEnabled: articlesFeatureEnabled } = useAppFeatures()
const profileTabs = computed<Array<{ key: ProfileTabKey; label: string }>>(() => [
  { key: 'posts', label: 'Posts' },
  { key: 'replies', label: 'Replies' },
  ...(articlesFeatureEnabled.value ? [{ key: 'articles' as ProfileTabKey, label: 'Articles' }] : []),
  { key: 'media', label: 'Media' },
])

// ─── Animated tab underline ───────────────────────────────────────────────────
const profileTabBarEl = ref<HTMLElement | null>(null)
const profileTabButtonEls = new Map<ProfileTabKey, HTMLElement>()
const profileUnderlineLeft = ref(0)
const profileUnderlineWidth = ref(0)
const profileUnderlineReady = ref(false)

const profileActiveTabColor = computed(() => {
  const tier = userColorTier(profile.value)
  return userTierColorVar(tier) ?? 'var(--color-gray-900, #111827)'
})

function setProfileTabButtonRef(key: ProfileTabKey, el: HTMLElement | null) {
  if (el) profileTabButtonEls.set(key, el)
  else profileTabButtonEls.delete(key)
}

function updateProfileUnderline() {
  if (!import.meta.client) return
  const bar = profileTabBarEl.value
  const btn = profileTabButtonEls.get(activeProfileTab.value)
  if (!bar || !btn) return
  const barRect = bar.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  profileUnderlineLeft.value = Math.round(btnRect.left - barRect.left)
  profileUnderlineWidth.value = Math.round(btnRect.width)
}

function setProfileTab(key: ProfileTabKey) {
  if (activeProfileTab.value === key) return
  const path = key === 'posts' ? baseProfilePath.value : `${baseProfilePath.value}/${key}`
  pushProfilePath(path)
}

onMounted(() => nextTick(() => {
  updateProfileUnderline()
  requestAnimationFrame(() => { profileUnderlineReady.value = true })
}))

// ─── Posts-only feed (top-level, no replies) ──────────────────────────────────
const {
  posts: postsOnlyPosts,
  displayItems: postsOnlyItems,
  collapsedSiblingReplyCountFor: postsOnlyCollapsedSiblingReplyCountFor,
  replyCountForParentId: postsOnlyReplyCountForParentId,
  counts: postsOnlyCounts,
  loading: postsOnlyLoading,
  loadingMore: postsOnlyLoadingMore,
  error: postsOnlyError,
  hasLoadedOnce: postsOnlyHasLoadedOnce,
  nextCursor: postsOnlyNextCursor,
  loadMore: postsOnlyLoadMore,
  removePost: postsOnlyRemovePost,
  replacePost: postsOnlyReplacePost,
} = useUserPosts(normalizedUsername, {
  enabled: computed(() => !notFound.value),
  showAds,
  cookieKeyPrefix: 'moh.profile.posts.topLevel',
  topLevelOnly: true,
  externalFilter: profileFilter as Ref<UserPostsFilter>,
  externalSort: profileSort,
})

// ─── Replies feed (all posts including replies) ───────────────────────────────
const repliesEnabled = computed(() => !notFound.value && tabActivated.replies)
const {
  posts: profilePosts,
  displayPosts: profileDisplayPosts,
  displayItems: profileDisplayItems,
  collapsedSiblingReplyCountFor: profileCollapsedSiblingReplyCountFor,
  replyCountForParentId: profileReplyCountForParentId,
  counts: profileCounts,
  loading: profileLoading,
  loadingMore: profileLoadingMore,
  error: profileError,
  hasLoadedOnce: profileHasLoadedOnce,
  nextCursor: profileNextCursor,
  loadMore: profileLoadMore,
  removePost: profileRemovePost,
  replacePost: profileReplacePost,
} = useUserPosts(normalizedUsername, {
  enabled: repliesEnabled,
  showAds,
  cookieKeyPrefix: 'moh.profile.posts.withReplies',
  externalFilter: profileFilter as Ref<UserPostsFilter>,
  externalSort: profileSort,
})

// ─── Articles feed ────────────────────────────────────────────────────────────
const articlesEnabled = computed(() => !notFound.value && articlesFeatureEnabled.value && tabActivated.articles)
const profileArticlesFeed = useArticleFeed({
  authorUsername: normalizedUsername,
  sort: profileSort,
  visibility: profileFilter as Ref<ProfilePostsFilter>,
  enabled: articlesEnabled,
})

// ─── Media feed ───────────────────────────────────────────────────────────────
const mediaEnabled = computed(() => !notFound.value && tabActivated.media)
const mediaVisibilityFilter = computed<ProfilePostsFilter>(() => 'all')
const profileMediaFeed = useUserMedia(normalizedUsername, {
  enabled: mediaEnabled,
  visibility: mediaVisibilityFilter,
  sort: profileSort,
})
const postsOnlyInitialLoading = computed(
  () => postsOnlyLoading.value && !postsOnlyHasLoadedOnce.value && postsOnlyItems.value.length === 0,
)
const repliesInitialLoading = computed(
  () => profileLoading.value && !profileHasLoadedOnce.value && itemsWithoutPinned.value.length === 0 && !pinnedPostForDisplay.value,
)
const articlesInitialLoading = computed(
  () => profileArticlesFeed.loading.value && !profileArticlesFeed.hasLoadedOnce.value && profileArticlesFeed.articles.value.length === 0,
)
const mediaInitialLoading = computed(
  () => profileMediaFeed.loading.value && !profileMediaFeed.hasLoadedOnce.value && profileMediaFeed.items.value.length === 0,
)

function onProfilePostEdited(payload: { id: string; post: import('~/types/api').FeedPost }) {
  profileReplacePost(payload.post)
  postsOnlyReplacePost(payload.post)
}

const {
  pinnedPostForDisplay,
  pinnedReplyToUsername,
  pinnedPostData,
  refreshPinnedPost,
} = useProfilePinnedPost({
  normalizedUsername,
  effectivePinnedPostId,
  profilePosts,
  activeFilter: profileFilter as Ref<ProfilePostsFilter>,
})
const showPinnedPost = computed(() => activeProfileTab.value !== 'media' && !effectiveProfileCtaKind.value && Boolean(pinnedPostForDisplay.value))
const visiblePinnedPostId = computed(() => pinnedPostForDisplay.value?.id ?? null)

const itemsWithoutPinned = computed(() => {
  const list = profileDisplayItems.value ?? []
  const pid = visiblePinnedPostId.value
  if (!pid) return list
  return list.filter((item) => item.kind !== 'post' || item.post.id !== pid)
})

function pinnedBadgeClasses(visibility: import('~/types/api').PostVisibility): string {
  const tag = visibilityTagClasses(visibility)
  if (tag) return tag
  return 'border border-gray-400/50 bg-gray-800/70 text-white dark:border-gray-500/50 dark:bg-gray-200/20 dark:text-gray-100'
}

const { apiFetchData } = useApiClient()
async function onPinnedPostDeleted(id: string) {
  if (effectivePinnedPostId.value !== id) return
  try {
    await apiFetchData<{ pinnedPostId: null }>('/users/me/pinned-post', { method: 'DELETE' })
    await refetchMe()
  } catch {
    // ignore
  }
  refreshPinnedPost()
  profileRemovePost(id)
}

const { apiFetch } = useApiClient()
const {
  data: followSummaryData,
  refresh: refreshFollowSummary,
} = useAsyncData(`follow-summary:${normalizedUsername.value}`, async () => {
  if (notFound.value) return null
  return await apiFetchData<import('~/types/api').FollowSummaryResponse>(
    `/follows/summary/${encodeURIComponent(normalizedUsername.value)}`,
    { method: 'GET' }
  )
}, { server: false })

watch(
  () => authUser.value?.id ?? null,
  () => void refreshFollowSummary(),
  { flush: 'post' }
)

const followSummary = computed(() => followSummaryData.value ?? null)
const followRelationship = computed<FollowRelationship | null>(() => {
  const s = followSummary.value
  if (!s) return null
  return {
    viewerFollowsUser: s.viewerFollowsUser,
    userFollowsViewer: s.userFollowsViewer,
    viewerPostNotificationsEnabled: s.viewerPostNotificationsEnabled,
  }
})

const relationshipTagLabel = computed(() => {
  if (isSelf.value) return null
  const s = followSummary.value
  if (!s) return null
  if (s.userFollowsViewer && s.viewerFollowsUser) return 'You follow each other'
  if (s.userFollowsViewer) return 'Follows you'
  return null
})

const followState = useFollowState()
watch(
  [() => profile.value?.id, followRelationship],
  ([id, rel]) => {
    if (!id || !rel) return
    followState.set(id, rel)
  },
  { immediate: true }
)

const blockState = useBlockState()
const toast = useAppToast()

// Block status from the profile API response (viewer-specific).
const viewerHasBlockedProfile = computed(() =>
  Boolean(profile.value?.viewerHasBlockedUser) || blockState.isBlockedByMe(profile.value?.id ?? ''),
)
const profileHasBlockedViewer = computed(() => Boolean(profile.value?.userHasBlockedViewer))
const isBlockedWithProfile = computed(() => viewerHasBlockedProfile.value || profileHasBlockedViewer.value)
const profileBlockHandle = computed(() => {
  const u = profile.value?.username
  return u ? `@${u}` : 'this user'
})

const bannerUnblockConfirmVisible = ref(false)
const blockingProfile = ref(false)

async function confirmBannerUnblock() {
  if (blockingProfile.value || !profile.value?.id) return
  blockingProfile.value = true
  try {
    await blockState.unblockUser(profile.value.id)
    toast.push({ title: `${profileBlockHandle.value} unblocked`, message: 'You can now engage with their posts.', tone: 'success', durationMs: 3000 })
    bannerUnblockConfirmVisible.value = false
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to unblock.')
  } finally {
    blockingProfile.value = false
  }
}

const showFollowCounts = computed(() => {
  if (!profile.value?.id) return false
  if (!followSummary.value) return false
  return isSelf.value || followSummary.value.canView
})

// Realtime nudges: if you are already viewing this user's profile and they nudge you,
// update the local followSummary.nudge immediately so the header shows "Nudge back",
// then refresh from the API to keep outbound/inbound state consistent.
const { addNotificationsCallback, removeNotificationsCallback } = usePresence()
const notificationsCb = {
  onNew: (payload: any) => {
    const n = payload?.notification ?? null
    if (!n || n.kind !== 'nudge') return
    const actorUsername = (n.actor?.username ?? '').trim().toLowerCase()
    if (!actorUsername) return
    if (actorUsername !== normalizedUsername.value) return
    if (isSelf.value) return

    const s = followSummaryData.value
    if (s) {
      const prev = s.nudge ?? { outboundPending: false, inboundPending: false, inboundNotificationId: null, outboundExpiresAt: null }
      followSummaryData.value = {
        ...s,
        nudge: {
          ...prev,
          inboundPending: true,
          inboundNotificationId: n.id ?? prev.inboundNotificationId ?? null,
        },
      }
    }

    void refreshFollowSummary()
  },
} as const

if (import.meta.client) {
  onMounted(() => {
    addNotificationsCallback(notificationsCb as any)
    document.addEventListener('pointerdown', onProfileStatPointerDown, { capture: true })
  })
  onBeforeUnmount(() => {
    removeNotificationsCallback(notificationsCb as any)
    document.removeEventListener('pointerdown', onProfileStatPointerDown, true)
  })
}

function onFollowed() {
  const s = followSummary.value
  if (!s || s.followerCount === null) return
  followSummaryData.value = { ...s, viewerFollowsUser: true, followerCount: s.followerCount + 1 }
}

function onUnfollowed() {
  const s = followSummary.value
  if (!s || s.followerCount === null) return
  followSummaryData.value = { ...s, viewerFollowsUser: false, followerCount: Math.max(0, s.followerCount - 1) }
}

function onNudgeUpdated(next: import('~/types/api').NudgeState | null) {
  const s = followSummaryData.value
  if (s) {
    followSummaryData.value = { ...s, nudge: next }
  }
  void refreshFollowSummary()
}

const {
  followersOpen,
  followers,
  followersNextCursor,
  followersLoading,
  followersError,
  followingOpen,
  following,
  followingNextCursor,
  followingLoading,
  followingError,
  openFollowers,
  openFollowing,
  loadMoreFollowers,
  loadMoreFollowing,
} = useProfileFollowDialogs(normalizedUsername)

function goToFollowers() {
  pushProfilePath(`${baseProfilePath.value}/followers`)
}
function goToFollowing() {
  pushProfilePath(`${baseProfilePath.value}/following`)
}

// Route-driven modal state:
// - Visiting /u/:username/followers or /following opens the correct modal immediately.
// - Closing the modal navigates back to /u/:username.
watch(
  [isFollowersRoute, isFollowingRoute],
  ([followersRoute, followingRoute]) => {
    if (followersRoute) {
      followingOpen.value = false
      openFollowers()
      return
    }
    if (followingRoute) {
      followersOpen.value = false
      openFollowing()
      return
    }
    // Base route: ensure both are closed.
    followersOpen.value = false
    followingOpen.value = false
  },
  { immediate: true },
)

watch(
  followersOpen,
  (open) => {
    if (open) return
    if (isFollowersRoute.value) pushProfilePath(baseProfilePath.value)
  },
)
watch(
  followingOpen,
  (open) => {
    if (open) return
    if (isFollowingRoute.value) pushProfilePath(baseProfilePath.value)
  },
)

const middleScrollerEl = useMiddleScroller()
const profileLoadMoreSentinelEl = ref<HTMLElement | null>(null)
const postsOnlyLoadMoreSentinelEl = ref<HTMLElement | null>(null)
const mediaLoadMoreSentinelEl = ref<HTMLElement | null>(null)

useLoadMoreObserver(profileLoadMoreSentinelEl, middleScrollerEl, computed(() => Boolean(profileNextCursor.value)), profileLoadMore)
useLoadMoreObserver(postsOnlyLoadMoreSentinelEl, middleScrollerEl, computed(() => Boolean(postsOnlyNextCursor.value)), postsOnlyLoadMore)
useLoadMoreObserver(mediaLoadMoreSentinelEl, middleScrollerEl, computed(() => Boolean(profileMediaFeed.nextCursor.value)), profileMediaFeed.loadMore)

async function preserveMiddleScrollAfter<T>(fn: () => Promise<T>): Promise<T> {
  if (!import.meta.client) return await fn()
  const scroller = middleScrollerEl.value
  if (!scroller) return await fn()
  const prevTop = scroller.scrollTop
  const res = await fn()
  await nextTick()
  const el = middleScrollerEl.value
  if (!el?.parentNode) return res
  const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
  el.scrollTop = Math.min(prevTop, maxTop)
  return res
}

async function onUserPostsSortChange(next: 'new' | 'trending') {
  await preserveMiddleScrollAfter(async () => { profileSort.value = next })
}

async function onUserPostsFilterChange(next: ProfilePostsFilter) {
  // onlyMe is not a valid feed filter; treat it as 'all'
  const safeNext = next === 'onlyMe' ? 'all' : (next as 'all' | 'public' | 'verifiedOnly' | 'premiumOnly')
  await preserveMiddleScrollAfter(async () => { profileFilter.value = safeNext })
}

async function onUserPostsReset() {
  await preserveMiddleScrollAfter(async () => { resetProfileFilters() })
}

const profileAvatarUrl = computed(() => profile.value?.avatarUrl ?? null)
const profileBannerUrl = computed(() => profile.value?.bannerUrl ?? null)

const viewer = useImageLightbox()
const { openFromEvent } = viewer
const hideBannerThumb = computed(() => viewer.visible.value && viewer.kind.value === 'banner')
const hideAvatarThumb = computed(() => viewer.visible.value && viewer.kind.value === 'avatar')
const hideAvatarDuringBanner = computed(() => viewer.visible.value && viewer.kind.value === 'banner')

const editOpen = ref(false)

function onOpenProfileImage(payload: {
  event: MouseEvent
  url: string
  title: string
  kind: 'avatar' | 'banner'
  isOrganization?: boolean
  originRect?: { left: number; top: number; width: number; height: number }
}) {
  if (payload.kind === 'avatar') {
    void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
      avatarBorderRadius: payload.isOrganization ? '16%' : '9999px',
      originRect: payload.originRect,
    })
    return
  }
  void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
    originRect: payload.originRect,
  })
}

function patchPublicProfile(patch: Partial<Pick<
  PublicProfile,
  'name' | 'bio' | 'avatarUrl' | 'bannerUrl' | 'website' | 'locationDisplay' | 'locationCity' | 'locationCounty' | 'locationState' | 'locationCountry'
>>) {
  if (!data.value) return
  data.value = { ...(data.value as PublicProfile), ...patch }
  const profileId = profile.value?.id ?? authUser.value?.id ?? null
  if (profileId) {
    usersStore.upsert({
      id: profileId,
      username: profile.value?.username ?? authUser.value?.username ?? null,
      name: (patch.name ?? profile.value?.name ?? authUser.value?.name) ?? null,
      bio: (patch.bio ?? profile.value?.bio ?? authUser.value?.bio) ?? null,
      avatarUrl: (patch.avatarUrl ?? profile.value?.avatarUrl ?? authUser.value?.avatarUrl) ?? null,
      bannerUrl: (patch.bannerUrl ?? profile.value?.bannerUrl ?? authUser.value?.bannerUrl) ?? null,
      premium: profile.value?.premium ?? authUser.value?.premium,
      premiumPlus: profile.value?.premiumPlus ?? authUser.value?.premiumPlus,
      verifiedStatus: profile.value?.verifiedStatus ?? authUser.value?.verifiedStatus,
      pinnedPostId: profile.value?.pinnedPostId ?? authUser.value?.pinnedPostId ?? null,
    })
  }
  const currentUsername = normalizedUsername.value
  if (currentUsername) invalidateUserPreviewCache(currentUsername)
}

watch(
  [notFound, profileName, () => profile.value?.verifiedStatus, () => profile.value?.premium, () => postsOnlyCounts.value.all],
  ([nf, name, status, premium, count]) => {
    if (nf) {
      appHeader.value = { title: 'Account not found', verifiedStatus: null, premium: null, postCount: null }
      return
    }
    appHeader.value = {
      title: name,
      verifiedStatus: status ?? null,
      premium: premium ?? null,
      postCount: typeof count === 'number' ? count : null,
    }
  },
  { immediate: true }
)

function reloadPage() {
  if (import.meta.client) globalThis.location?.reload()
}

onBeforeUnmount(() => {
  if (appHeader.value?.title === profileName.value) appHeader.value = null
})
</script>

<style scoped>
.profile-articles-list-enter-active,
.profile-articles-list-leave-active {
  transition: opacity 0.2s ease;
}

.profile-articles-list-enter-from,
.profile-articles-list-leave-to {
  opacity: 0;
}

.profile-articles-list-move {
  transition: transform 0.25s ease;
}

.media-grid-enter-active,
.media-grid-leave-active {
  transition: opacity 0.2s ease;
}

.media-grid-enter-from,
.media-grid-leave-to {
  opacity: 0;
}

.media-grid-move {
  transition: transform 0.25s ease;
}
</style>

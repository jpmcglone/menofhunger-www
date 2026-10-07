<template>
  <section v-if="shouldRenderCheckinSection" class="space-y-3">
    <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
      Daily check-in
    </h2>
    <ClientOnly>
    <AppFeedDailyCheckinCard
      v-if="showExploreCheckinCard"
      :prompt="displayCheckinPromptText"
      :streak="displayCheckinStreak"
      :has-checked-in-today="hasCheckedInToday"
      :error="checkinError"
      @check-in="openCheckinComposer"
    />
    <div v-else-if="checkinLoading" class="flex justify-center py-6">
      <AppLogoLoader />
    </div>
    </ClientOnly>
  </section>

  <!-- Verify-to-check-in CTA for authed-but-unverified users. Check-ins are
       verified-only, so we drive verification instead of the live card.
       Client-only (ClientOnly) so SSR stays empty and avoids hydration mismatch. -->
  <ClientOnly>
    <section v-if="didAttempt && isAuthed && !isPageAccount && !canAccessCheckins" class="space-y-3">
      <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
        Daily check-in
      </h2>
      <AppFeedDailyCheckinHero :prompt="verifyCtaPrompt" verify-cta />
    </section>
  </ClientOnly>

  <!-- Online now -->
  <section v-if="onlineUsers.length > 0" class="space-y-3">
    <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
      Online now
    </h2>
    <AppHorizontalScroller scroller-class="no-scrollbar px-4">
      <div class="flex gap-3 pb-2">
        <AppUserMiniCard
          v-for="u in onlineUsers.slice(0, 16)"
          :key="u.id"
          :user="u"
          @followed="removeDiscoverUser(u.id)"
        />
      </div>
    </AppHorizontalScroller>
  </section>

  <!-- People on Men of Hunger (logged-out viewers) -->
  <section v-if="!isAuthed && topUsers.length > 0" class="space-y-3">
    <div class="px-4 flex items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
        People on Men of Hunger
      </h2>
      <NuxtLink
        to="/login"
        class="text-sm font-medium hover:underline underline-offset-2 text-[var(--p-primary-color)] moh-focus"
      >
        Join to follow
      </NuxtLink>
    </div>
    <AppHorizontalScroller scroller-class="no-scrollbar px-4">
      <div class="flex gap-3 pb-2">
        <AppUserMiniCard
          v-for="u in topUsers.slice(0, 12)"
          :key="u.id"
          :user="u"
        />
      </div>
    </AppHorizontalScroller>
  </section>

  <template v-if="isAuthed">
    <!-- Trending from recommended -->
    <section v-if="discoverInitialLoading || trendingPosts.length > 0" class="space-y-3">
      <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
        Trending from people you might like
      </h2>

      <div v-if="discoverInitialLoading && trendingPosts.length === 0" class="flex justify-center py-6">
        <AppLogoLoader />
      </div>

      <div v-else-if="trendingPosts.length > 0" class="space-y-0">
        <div class="space-y-0">
          <AppFeedPostRow
            v-for="p in trendingBefore"
            :key="p.id"
            :post="p"
            collapse-ancestors
          />
        </div>

        <div v-if="shouldInlineNewUsers && newestUsers.length > 0" class="px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              New users
            </h3>
          </div>
          <AppHorizontalScroller scroller-class="no-scrollbar mt-3">
            <div class="flex gap-3 pb-2">
              <AppUserMiniCard
                v-for="u in newestUsers"
                :key="u.id"
                :user="u"
                @followed="removeDiscoverUser(u.id)"
              />
            </div>
          </AppHorizontalScroller>
        </div>

        <div class="space-y-0">
          <AppFeedPostRow
            v-for="p in trendingAfter"
            :key="p.id"
            :post="p"
            collapse-ancestors
          />
        </div>
      </div>
    </section>

    <!-- New users (standalone when we can’t inline) -->
    <section v-if="!shouldInlineNewUsers && newestUsers.length > 0" class="space-y-3">
      <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
        New users
      </h2>
      <AppHorizontalScroller scroller-class="no-scrollbar px-4">
        <div class="flex gap-3 pb-2">
          <AppUserMiniCard
            v-for="u in newestUsers"
            :key="u.id"
            :user="u"
            @followed="removeDiscoverUser(u.id)"
          />
        </div>
      </AppHorizontalScroller>
    </section>

    <p v-if="!showDiscoverEmpty" class="px-4 text-sm moh-text-muted">
      Or type in the search bar to search.
    </p>
  </template>

  <!-- Logged out: groups also appear in “Community groups” above; this is the search hint only -->
  <template v-else-if="!showDiscoverEmpty">
    <div class="px-4">
      <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 p-4">
        <p class="text-sm moh-text-muted">
          Use the search bar to find people, groups, and posts. Log in to join groups.
        </p>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { useExplorePageContext } from '~/composables/pages/explore/useExplorePage'

const {
  shouldRenderCheckinSection,
  showExploreCheckinCard,
  displayCheckinPromptText,
  displayCheckinStreak,
  hasCheckedInToday,
  checkinError,
  openCheckinComposer,
  checkinLoading,
  didAttempt,
  isAuthed,
  isPageAccount,
  canAccessCheckins,
  verifyCtaPrompt,
  onlineUsers,
  removeDiscoverUser,
  topUsers,
  discoverInitialLoading,
  trendingPosts,
  trendingBefore,
  shouldInlineNewUsers,
  newestUsers,
  trendingAfter,
  showDiscoverEmpty,
} = useExplorePageContext()
</script>


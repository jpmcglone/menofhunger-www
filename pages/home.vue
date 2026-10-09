<template>
  <!-- hideTopBar page: no top padding here -->
  <AppPageContent bottom="standard">
    <ClientOnly>
      <Transition
        enter-active-class="transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
        enter-from-class="opacity-0 -translate-y-4"
        leave-active-class="transition-[opacity,transform] duration-150 ease-in motion-reduce:transition-none"
        leave-to-class="opacity-0 -translate-y-3"
      >
        <AppAnnouncementInlineCard
          v-if="inlineAnnouncement"
          :announcement="inlineAnnouncement"
          @dismiss="onAnnouncementDismiss"
          @cta="onAnnouncementCta"
        />
      </Transition>
    </ClientOnly>

    <!-- Daily check-in stays above the composer whether answered or not. Unanswered is a
         list row; answered collapses to one quiet line. Both are gated on `heroResolved`
         so we never flash the wrong variant before we know. SSR renders nothing; on mount
         the right one appears. See 45-hydration-safe-defaults.mdc. -->
    <AppFeedDailyCheckinHero
      v-if="heroResolved && !hasCheckedInToday"
      :state="checkinState"
      :show-closed="isAuthed && !isPageAccount"
      :load-error="checkinError"
      :on-retry="retryCheckin"
      :prompt="checkinHeroPrompt"
      :my-checkin-body="lastCheckinBody"
      :can-answer="canAnswerCheckin"
      :on-answer="openCheckinComposer"
      :on-login-to-answer="goToLoginForCheckin"
    />

    <!-- Quiet line once today's question is answered. Streak / weekly-mission progress
         is meta on the row (`14d · 7/7`), not a second banner. -->
    <AppFeedDailyCheckinHero
      v-if="heroResolved && hasCheckedInToday"
      :state="checkinState"
      :show-closed="isAuthed && !isPageAccount"
      :load-error="checkinError"
      :on-retry="retryCheckin"
      :prompt="checkinHeroPrompt"
      :my-checkin-body="lastCheckinBody"
      :can-answer="canAnswerCheckin"
      :on-answer="openCheckinComposer"
      :on-login-to-answer="goToLoginForCheckin"
      :weekly-mission-streak-days="displayCheckinStreak"
      compact
    />

    <!-- Verify-to-check-in CTA for authed-but-unverified users. The check-ins experience is
         verified-only, so rather than the live hero we drive verification. Client-only
         (ClientOnly) so SSR stays empty and there's no hydration mismatch. -->
    <ClientOnly>
      <AppFeedDailyCheckinHero
        v-if="didAttempt && isAuthed && !isPageAccount && !canAccessCheckins"
        :prompt="checkinHeroPrompt"
        show-closed
        verify-cta
      />
    </ClientOnly>

    <!-- Skeleton shown while the check-in state is still loading.
         ClientOnly keeps SSR output empty (same as the hero gates above).
         The min-h matches the full hero so the page doesn't jump on resolve. -->
    <ClientOnly>
      <div
        v-if="isAuthed && !isPageAccount && canAccessCheckins && !heroResolved"
        class="animate-pulse border-b moh-border"
        aria-hidden="true"
      >
        <div class="moh-gutter-x py-3 space-y-2">
          <div class="h-3 w-24 rounded-full bg-gray-200 dark:bg-zinc-700" />
          <div class="h-4 w-3/4 rounded-full bg-gray-200 dark:bg-zinc-700" />
        </div>
      </div>
    </ClientOnly>

    <!-- Composer sits under check-in and is always a regular post. Check-in only opens
         when the user hits Answer on the hero (or the checkin=1 deep-link). -->
    <div ref="homeComposerEl" class="min-h-0">
      <LazyAppPostComposer
        v-if="didAttempt && isAuthed && !showOnlyMeHomeComposerCard"
        key="home-regular"
        ref="homeComposerRef"
        inline-audience
        persist-key="home"
        :enable-avatar-status-editor="true"
        :register-unsaved-guard="false"
        @pending="onComposerPending"
      />
      <div v-else-if="didAttempt && isAuthed" class="px-3 pt-3 sm:px-4 sm:pt-4">
        <div class="rounded-2xl border moh-border moh-surface p-4 sm:p-5">
          <div class="flex items-start gap-3">
            <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg moh-btn-onlyme moh-btn-tone">
              <Icon name="tabler:eye-off" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold moh-text">Unverified mode: Only me drafts</div>
              <div class="mt-1 text-sm moh-text-muted">
                While unverified, your posts are private to you. Verify your account to post publicly.
              </div>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end">
            <Button
              label="Post to Only me"
              rounded
              class="moh-btn-onlyme moh-btn-tone"
              @click="openOnlyMeComposer"
            >
              <template #icon>
                <Icon name="tabler:plus" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <ClientOnly><AppConversationInsights v-if="isAuthed" :key="'weekly-conversations'" /></ClientOnly>

    <!-- Welcome card: shown to all new users who haven't dismissed it (localStorage) -->
    <ClientOnly>
      <AppFeedHomeWelcomeCard
        v-if="isAuthed && !isPageAccount"
        :key="authUser?.id"
        :show-checkin-cta="showCheckinPromptBar"
        :checkin-prompt="displayCheckinPromptText"
        :has-posted="(checkinState?.checkinStreakDays ?? 0) > 0 || checkinState?.hasCheckedInToday === true"
        @compose="openComposer?.()"
        @check-in="openCheckinComposer"
      />
    </ClientOnly>

    <ClientOnly>
      <div
        v-if="showGroupsOnboardingNudge"
        class="mx-3 my-3 sm:mx-4 sm:my-4 rounded-2xl border moh-border moh-surface p-4 sm:p-5"
      >
        <div class="flex items-start gap-3">
          <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border moh-border bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Icon name="tabler:users-group" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold moh-text">Join a community group</div>
            <p class="mt-1 text-sm moh-text-muted">
              Groups are smaller rooms for focused conversation — posts stay inside the group, not on the home feed.
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button as="NuxtLink" to="/groups" label="Browse groups" rounded size="small" />
              <Button
                label="Dismiss"
                text
                rounded
                size="small"
                severity="secondary"
                @click="dismissGroupsNudge"
              />
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>

    <!-- Feed: header + content -->
    <div>
      <AppFeedHomeFeedHeader
        v-if="isAuthed"
        :scope="feedScope"
        :sort="feedSort"
        :filter="feedFilter"
        :viewer-is-verified="viewerIsVerified"
        :viewer-is-premium="viewerIsPremium"
        @update:scope="handleFeedScopeChange"
        @reselect="handleFeedScopeReselect"
        @update:sort="handleFeedSortChange"
        @update:filter="handleFeedFilterChange"
      >
        <template #arrivals>
          <AppFeedNewPostsPill
            v-if="feedArrivals.pending.value.length && isReadingFeed"
            class="pointer-events-auto"
            :authors="feedArrivals.authors.value"
            :count="feedArrivals.pending.value.length"
            @reveal="revealFeedArrivals"
          />
        </template>
      </AppFeedHomeFeedHeader>

      <!-- Zero-height anchor: the pill floats over the first post, so its arrival never moves posts
           and there's no empty band under the tabs when nothing is waiting. -->
      <div v-if="isAuthed" ref="feedArrivalRowEl" class="relative z-20 h-0">
        <div class="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <AppFeedNewPostsPill
            v-if="feedArrivals.pending.value.length && !isReadingFeed"
            class="pointer-events-auto"
            :authors="feedArrivals.authors.value"
            :count="feedArrivals.pending.value.length"
            @reveal="revealFeedArrivals"
          />
        </div>
      </div>

      <div ref="homeFeedContentEl" class="h-0 overflow-hidden" aria-hidden="true" />

      <div v-if="feedCtaKind === 'verify'" class="mx-3 mt-3 sm:mx-4 sm:mt-4">
        <AppAccessGateCard kind="verify" />
      </div>

      <div v-else-if="feedCtaKind === 'premium'" class="mx-3 mt-3 sm:mx-4 sm:mt-4">
        <AppAccessGateCard kind="premium" />
      </div>

      <template v-else>
        <AppScreenState
          v-if="error && !posts.length" title="Couldn’t load your feed" icon="warning" error
          action-label="Try again" :busy="loading" @action="refresh">
          <AppUserErrorMessage :error="error" fallback="Failed to load feed." />
        </AppScreenState>
        <AppInlineAlert v-else-if="error" class="mx-3 mt-3 sm:mx-4 sm:mt-4" severity="danger">
          <AppUserErrorMessage :error="error" fallback="Failed to load feed." />
        </AppInlineAlert>

        <AppScreenState v-if="showMainLoader" status="loading" skeleton="post" />
        <AppSubtleSectionLoader v-else :loading="false" :refreshing="loading && !showMainLoader" min-height-class="min-h-[240px]">
            <AppScreenState
              v-if="initialFeedResolved && showFollowingEmptyState"
              empty-variant="following"
              :following-count="followingCount"
              :show-checkin-cta="showCheckinPromptBar"
              @post="homeComposerRef?.focus()"
              @check-in="openCheckinComposer"
            />
            <AppScreenState
              v-else-if="initialFeedResolved && (showAllEmptyState || showForYouEmptyState)"
              empty-variant="all"
            />

            <div ref="feedVirtualListContainerEl" class="relative">

              <!--
                Virtualized feed list — only ~OVERSCAN+visible rows are mounted at any time.
                Mirrors the chat list pattern (ChatMessageList.vue / @tanstack/vue-virtual).
                The outer div is height-stable (feedTotalSize px); each row is absolutely
                positioned at its measured offset so the scroller's scrollTop still works.
                TransitionGroup is dropped: off-screen rows have no DOM, so FLIP measurement
                is meaningless. New-post enter animation is handled via CSS on the row itself.
              -->
              <div
                :style="{
                  height: feedTotalSize + 'px',
                  width: '100%',
                  position: 'relative',
                }"
              >
                <div
                  v-for="virtualRow in feedVirtualItems"
                  :key="String(virtualRow.key)"
                  :ref="measureFeedRow"
                  :data-index="virtualRow.index"
                  :style="{
                    position: 'absolute',
                    top: '0px',
                    left: '0px',
                    width: '100%',
                    transform: `translateY(${virtualRow.start - feedListScrollMargin}px)`,
                  }"
                >
                  <template v-if="activeHomeFeedDisplayItems[virtualRow.index]">
                    <AppFeedFakeAdRow
                      v-if="activeHomeFeedDisplayItems[virtualRow.index]!.kind === 'ad'"
                    />
                    <AppFeedPostRow
                      v-else-if="activeHomeFeedDisplayItems[virtualRow.index]!.kind === 'post'"
                      :post="feedItemPost(activeHomeFeedDisplayItems[virtualRow.index])!"
                      collapse-ancestors
                      :seen-aware-collapse="forYou"
                      :activate-video-on-mount="feedItemPost(activeHomeFeedDisplayItems[virtualRow.index])?.id === newlyPostedVideoPostId"
                      :collapsed-sibling-replies-count="collapsedSiblingReplyCountFor(feedItemPost(activeHomeFeedDisplayItems[virtualRow.index])!)"
                      :show-collapsed-replies-footer="true"
                      :replies-sort="feedSort"
                      @deleted="removePost"
                      @edited="onFeedPostEdited"
                    />
                  </template>
                </div>
              </div>

              <AppScreenState
                v-if="initialFeedResolved && !error && activeHomeFeedDisplayItems.length === 0 && !showFollowingEmptyState && !showAllEmptyState && !showForYouEmptyState"
                title="No posts in this filter" icon="filter" description="Try another filter to see more conversations." />
            </div>

            <div v-if="nextCursor" class="relative">
              <div
                ref="loadMoreSentinelEl"
                class="absolute bottom-0 left-0 right-0 h-px"
                aria-hidden="true"
              />
              <AppLoadMoreFooter :state="loadingMore ? 'loading' : 'idle'" />
            </div>
        </AppSubtleSectionLoader>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { useHomePage } from '~/composables/pages/home/useHomePage'

definePageMeta({
  layout: 'app',
  title: 'Home',
  hideTopBar: true,
  keepalive: true,
})

const {
  homeComposerEl,
  homeComposerRef,
  loadMoreSentinelEl,
  openComposer,
  isAuthed,
  authUser,
  isPageAccount,
  canAccessCheckins,
  didAttempt,
  inlineAnnouncement,
  onAnnouncementDismiss,
  onAnnouncementCta,
  showGroupsOnboardingNudge,
  dismissGroupsNudge,
  checkinState,
  checkinError,
  retryCheckin,
  hasCheckedInToday,
  heroResolved,
  showCheckinPromptBar,
  displayCheckinPromptText,
  displayCheckinStreak,
  newlyPostedVideoPostId,
  feedScope,
  feedFilter,
  feedSort,
  forYou,
  posts,
  collapsedSiblingReplyCountFor,
  nextCursor,
  loading,
  loadingMore,
  error,
  refresh,
  removePost,
  followingCount,
  showFollowingEmptyState,
  showForYouEmptyState,
  showAllEmptyState,
  viewerIsVerified,
  viewerIsPremium,
  feedCtaKind,
  homeFeedContentEl,
  feedArrivalRowEl,
  isReadingFeed,
  handleFeedScopeChange,
  handleFeedScopeReselect,
  handleFeedSortChange,
  handleFeedFilterChange,
  activeHomeFeedDisplayItems,
  feedItemPost,
  feedVirtualListContainerEl,
  feedListScrollMargin,
  initialFeedResolved,
  feedVirtualItems,
  feedTotalSize,
  measureFeedRow,
  lastCheckinBody,
  canAnswerCheckin,
  checkinHeroPrompt,
  goToLoginForCheckin,
  openCheckinComposer,
  onFeedPostEdited,
  showOnlyMeHomeComposerCard,
  showMainLoader,
  openOnlyMeComposer,
  feedArrivals,
  revealFeedArrivals,
  onComposerPending,
} = useHomePage()
</script>

<style scoped>
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

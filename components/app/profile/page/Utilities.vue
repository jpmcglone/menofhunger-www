<template>
  <div v-if="profile" class="contents">
    <div class="flex flex-wrap items-center gap-2">
      <!-- Streaks popover — hidden on page profiles (they don't check in). -->
      <div v-if="showsProfileStreaks" ref="streaksWrapperEl" class="relative inline-block">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full min-h-11 px-5 py-2 text-sm font-semibold border moh-border moh-surface moh-text hover:opacity-80 transition-opacity"
          @click="toggleStreaks"
        >
          <AppIconGlyph name="streak" class="size-4 moh-text-muted" aria-hidden="true" />
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
              <NuxtLink
                v-if="isSelf"
                to="/coins"
                class="flex items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-1 -mx-1 py-0.5 transition-colors"
              >
                <div class="flex items-center gap-1.5 font-medium moh-text-muted">
                  <Icon name="tabler:coin" class="text-[13px] text-amber-500" aria-hidden="true" />
                  Coins
                </div>
                <div class="font-semibold tabular-nums moh-text">{{ formatFullCount(authUser?.coins ?? 0) }}</div>
              </NuxtLink>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Badges entry point — opens a modal grid of all badge tiers
           (earned + locked). Only surfaced when the user has at least one
           earned badge so empty profiles don't dangle a meaningless link. -->
      <button
        v-if="hasEarnedBadges"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full min-h-11 px-5 py-2 text-sm font-semibold border moh-border moh-surface moh-text hover:opacity-80 transition-opacity"
        @click="badgesOpen = true"
      >
        <AppIconGlyph name="premium" class="size-4 moh-text-muted" aria-hidden="true" />
        Badges
      </button>
    </div>
  </div>

    <AppFeedFiltersBar
      label="Feed filters"
      :sort="profileSort"
      :filter="profileFilter"
      :viewer-is-verified="profileViewerIsVerified"
      :viewer-is-premium="profileViewerIsPremium"
      :show-visibility-filter="activeProfileTab !== 'media'"
      @update:sort="onUserPostsSortChange"
      @update:filter="onUserPostsFilterChange"
    />
</template>

<script setup lang="ts">
import { formatFullCount } from '~/utils/text'
import { useProfilePageContext } from '~/composables/pages/profile/useProfilePage'

const {
  profile,
  showsProfileStreaks,
  toggleStreaks,
  streaksOpen,
  streakCurrentDays,
  streakLongestDays,
  isSelf,
  authUser,
  hasEarnedBadges,
  badgesOpen,
  profileSort,
  profileFilter,
  profileViewerIsVerified,
  profileViewerIsPremium,
  activeProfileTab,
  onUserPostsSortChange,
  onUserPostsFilterChange,
  streaksWrapperEl,
} = useProfilePageContext()
</script>


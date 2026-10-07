<template>
  <!-- Profile pages use the app-standard gutter (px-4). Banner cancels it for full-bleed. -->
  <AppPageContent bottom="standard">
  <AppJoinBanner />
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
            <div class="aspect-[3/1] w-full bg-gray-200 dark:bg-zinc-900" />
            <div class="px-4 pb-5 pt-20">
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
          :can-edit-profile="canEditProfile"
          :is-admin-override="isAdminOverride"
          :follow-relationship="followRelationship"
          :nudge="followSummary?.nudge ?? null"
          :show-follow-counts="showFollowCounts"
          :follower-count="followSummary?.followerCount ?? 0"
          :following-count="followSummary?.followingCount ?? 0"
          :followed-by="followSummary?.followedBy ?? null"
          @open-image="onOpenProfileImage"
          @edit="editOpen = true"
          @open-followers="goToFollowers"
          @open-following="goToFollowing"
          @open-affiliates="goToAffiliates"
          @followed="onFollowed"
          @unfollowed="onUnfollowed"
          @nudge-updated="onNudgeUpdated"
        >
          <template #utilities>
            <AppProfilePageUtilities />
          </template>
        </AppProfileHeader>
      </ClientOnly>

      <AppProfilePagePinnedPost />

      <!-- Animated tab bar -->
      <div ref="profileTabBarEl" class="sticky top-[var(--moh-title-bar-height,0px)] z-20 moh-surface flex gap-0 border-b border-gray-200 dark:border-zinc-800">
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
          :style="{
            left: `${profileUnderlineLeft}px`,
            width: `${profileUnderlineWidth}px`,
            backgroundColor: profileActiveTabColor,
            transition: profileUnderlineReady ? 'left 220ms ease-in-out, width 220ms ease-in-out' : 'none',
          }"
          aria-hidden="true"
        />
      </div>
      <div ref="profileFeedContentEl" class="h-0 overflow-hidden" aria-hidden="true" />

      <div v-if="effectiveProfileCtaKind === 'verify'" class="mx-3 mt-3 sm:mx-4 sm:mt-4">
        <AppAccessGateCard kind="verify" />
      </div>
      <div v-else-if="effectiveProfileCtaKind === 'premium'" class="mx-3 mt-3 sm:mx-4 sm:mt-4">
        <AppAccessGateCard kind="premium" />
      </div>

      <AppProfilePageFeedTabs />

      <AppProfilePageContentTabs />

      <AppProfilePageDialogs />

    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { useProfilePageRoute, useProfilePage } from '~/composables/pages/profile/useProfilePage'

definePageMeta({
  layout: 'app',
  title: 'Profile',
  // Aliases let all tab URLs share the same route record — Vue Router keeps the
  // component mounted when switching between them instead of unmounting/remounting.
  alias: [
    '/u/:username/posts',
    '/u/:username/replies',
    '/u/:username/articles',
    '/u/:username/board',
    '/u/:username/media',
    '/u/:username/followers',
    '/u/:username/following',
    '/u/:username/affiliates',
  ],
})

const routeState = useProfilePageRoute()
const publicProfile = await usePublicProfile(routeState.normalizedUsername)
const {
  profileBanned,
  apiError,
  profile,
  notFound,
  profileName,
  isSelf,
  canEditProfile,
  isAdminOverride,
  activeProfileTab,
  effectiveProfileCtaKind,
  profileTabs,
  profileTabBarEl,
  profileUnderlineLeft,
  profileUnderlineWidth,
  profileUnderlineReady,
  profileActiveTabColor,
  setProfileTabButtonRef,
  followSummary,
  followRelationship,
  relationshipTagLabel,
  showFollowCounts,
  onFollowed,
  onUnfollowed,
  onNudgeUpdated,
  goToFollowers,
  goToFollowing,
  goToAffiliates,
  profileFeedContentEl,
  setProfileTab,
  profileAvatarUrl,
  profileBannerUrl,
  hideBannerThumb,
  hideAvatarThumb,
  hideAvatarDuringBanner,
  editOpen,
  onOpenProfileImage,
  reloadPage,
} = useProfilePage(routeState, publicProfile)

</script>

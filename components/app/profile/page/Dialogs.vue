<template>
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

  <AppProfileFollowListDialog
    v-model="affiliatesOpen"
    header="Affiliates"
    :users="affiliates"
    :loading="affiliatesLoading"
    :error="affiliatesError"
    empty-text="No affiliates yet."
    :next-cursor="affiliatesNextCursor"
    :expected-total-count="profile?.affiliateCount ?? null"
    @load-more="loadMoreAffiliates"
  />

  <AppProfileEditProfileDialog
    v-model="editOpen"
    :profile="profile"
    :is-self="isSelf"
    :target-user-id="adminEditTargetUserId"
    :profile-avatar-url="profileAvatarUrl"
    :profile-banner-url="profileBannerUrl"
    @patch-profile="patchPublicProfile"
    @saved="followSuggestionsOpen = true"
  />

  <AppProfileSavedFollowDialog v-model="followSuggestionsOpen" />

  <AppBadgesDialog
    :open="badgesOpen"
    :longest-streak-days="streakLongestDays"
    @update:open="badgesOpen = $event"
  />
</template>

<script setup lang="ts">
import { useProfilePageContext } from '~/composables/pages/profile/useProfilePage'

const {
  followersOpen,
  followers,
  followersLoading,
  followersError,
  followersNextCursor,
  showFollowCounts,
  followSummary,
  loadMoreFollowers,
  followingOpen,
  following,
  followingLoading,
  followingError,
  followingNextCursor,
  loadMoreFollowing,
  affiliatesOpen,
  affiliates,
  affiliatesLoading,
  affiliatesError,
  affiliatesNextCursor,
  profile,
  loadMoreAffiliates,
  editOpen,
  isSelf,
  adminEditTargetUserId,
  profileAvatarUrl,
  profileBannerUrl,
  patchPublicProfile,
  followSuggestionsOpen,
  badgesOpen,
  streakLongestDays,
} = useProfilePageContext()
</script>


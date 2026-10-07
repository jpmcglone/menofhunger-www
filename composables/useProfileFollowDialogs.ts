import type { Ref } from 'vue'
import type { FollowListUser } from '~/types/api'
import { useCursorFeeds, type CursorFeed, type CursorFeedStreamOptions } from '~/composables/useCursorFeed'

type FollowStream = 'followers' | 'following' | 'affiliates'

export function useProfileFollowDialogs(normalizedUsername: Ref<string>) {
  const followState = useFollowState()

  function stream(path: (username: string) => string, errorMessage: string): CursorFeedStreamOptions<FollowListUser> {
    return {
      buildRequest: (cursor) => ({
        path: path(encodeURIComponent(normalizedUsername.value)),
        query: { limit: 30, ...(cursor ? { cursor } : {}) },
      }),
      onDataLoaded: (users) => followState.ingest(users),
      defaultErrorMessage: errorMessage,
      loadMoreErrorMessage: errorMessage,
    }
  }

  const feeds = useCursorFeeds<Record<FollowStream, FollowListUser>>({
    stateKey: 'profile-follow-dialogs',
    stateMode: 'local',
    streams: {
      followers: stream((u) => `/follows/${u}/followers`, 'Failed to load followers.'),
      following: stream((u) => `/follows/${u}/following`, 'Failed to load following.'),
      // Organizations only: members who represent the org ("Affiliates").
      affiliates: stream((u) => `/users/${u}/affiliates`, 'Failed to load affiliates.'),
    },
  })

  function dialog(feed: CursorFeed<FollowListUser>) {
    const open = ref(false)
    return {
      open,
      items: feed.items,
      nextCursor: feed.nextCursor,
      loading: computed(() => feed.loading.value || feed.loadingMore.value),
      error: feed.error,
      show() {
        open.value = true
        if (feed.items.value.length === 0) void feed.refresh()
      },
      loadMore() {
        void feed.loadMore()
      },
    }
  }

  const followers = dialog(feeds.followers)
  const following = dialog(feeds.following)
  const affiliates = dialog(feeds.affiliates)

  return {
    affiliatesOpen: affiliates.open,
    affiliates: affiliates.items,
    affiliatesNextCursor: affiliates.nextCursor,
    affiliatesLoading: affiliates.loading,
    affiliatesError: affiliates.error,
    openAffiliates: affiliates.show,
    loadMoreAffiliates: affiliates.loadMore,
    followersOpen: followers.open,
    followers: followers.items,
    followersNextCursor: followers.nextCursor,
    followersLoading: followers.loading,
    followersError: followers.error,
    followingOpen: following.open,
    following: following.items,
    followingNextCursor: following.nextCursor,
    followingLoading: following.loading,
    followingError: following.error,
    openFollowers: followers.show,
    openFollowing: following.show,
    loadMoreFollowers: followers.loadMore,
    loadMoreFollowing: following.loadMore,
  }
}

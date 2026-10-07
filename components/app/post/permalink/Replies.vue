<template>
  <div ref="commentsFeedTopEl" class="border-b moh-border">
    <div class="px-4 sm:px-6 py-1 flex flex-wrap items-center justify-between gap-3 border-b moh-border">
      <div class="text-sm font-semibold moh-text">
        Replies
        <span class="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
          <AppAnimatedCount :value="commentCountDisplay" />
        </span>
      </div>
      <AppFeedFiltersBar
        :sort="commentsSort"
        :filter="'all'"
        :viewer-is-verified="viewerIsVerified"
        :viewer-is-premium="viewerIsPremium"
        :sort-noun="{ singular: 'reply', plural: 'replies' }"
        :sort-count="commentCountDisplay"
        :show-visibility-filter="false"
        @update:sort="onCommentsSortChangeWithScroll"
      />
    </div>
    <AppSubtleSectionLoader :loading="commentsInitialLoading" :refreshing="commentsLoading && !commentsInitialLoading" min-height-class="min-h-[140px]">
      <AppInlineAlert v-if="commentsError" severity="warning">{{ commentsError }}</AppInlineAlert>
      <div v-if="!comments.length && !commentsError" class="px-4 sm:px-6 py-6 text-sm moh-text-muted">
        No replies yet.
      </div>
      <template v-else>
        <AppCommentThread
          v-for="c in comments.slice(0, conversationTeaseLimit)"
          :key="c.id"
          :comment="c"
          :replies-sort="commentsSort"
          @deleted="onCommentDeleted"
        />
        <!-- Full thread for people who can participate; guests/unverified see a tease then CTA. -->
        <template v-if="!showConversationGate">
          <AppCommentThread
            v-for="c in comments.slice(conversationTeaseLimit)"
            :key="c.id"
            :comment="c"
            :replies-sort="commentsSort"
            @deleted="onCommentDeleted"
          />
          <div v-if="commentsNextCursor" class="flex justify-center px-4 py-4">
            <Button
              label="Load more replies"
              severity="secondary"
              rounded
              :loading="commentsLoading"
              :disabled="commentsLoading"
              @click="loadMoreComments"
            />
          </div>
        </template>
      </template>
    </AppSubtleSectionLoader>

    <!-- One left-aligned experience: facepile + “N more” + join/verify. -->
    <ClientOnly>
      <AppConversationJoinTeaser
        v-if="showConversationGate"
        :authors="conversationTeaseAuthors"
        :more-count="conversationMoreCount"
        :title="conversationGateTitle"
        :subtitle="conversationGateSubtitle"
        :primary-label="conversationGatePrimaryLabel"
        :primary-to="conversationGatePrimaryTo"
        :secondary-label="conversationGateSecondaryLabel"
        :secondary-to="conversationGateSecondaryTo"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { usePostPageContext } from '~/composables/pages/post/usePostPage'

const {
  commentCountDisplay,
  commentsSort,
  viewerIsVerified,
  viewerIsPremium,
  onCommentsSortChangeWithScroll,
  commentsInitialLoading,
  commentsLoading,
  commentsError,
  comments,
  conversationTeaseLimit,
  onCommentDeleted,
  showConversationGate,
  commentsNextCursor,
  loadMoreComments,
  conversationTeaseAuthors,
  conversationMoreCount,
  conversationGateTitle,
  conversationGateSubtitle,
  conversationGatePrimaryLabel,
  conversationGatePrimaryTo,
  conversationGateSecondaryLabel,
  conversationGateSecondaryTo,
  commentsFeedTopEl,
} = usePostPageContext()
</script>


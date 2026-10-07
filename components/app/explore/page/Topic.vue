<template>
  <div class="px-4 flex items-center justify-between gap-3">
    <div class="min-w-0">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
        Topic: {{ activeTopic }}
      </div>
      <div class="text-xs moh-text-muted">
        Showing posts matching this topic.
      </div>
    </div>
    <div class="shrink-0 flex items-center gap-2">
      <Button
        v-if="isAuthed"
        :label="isActiveTopicFollowed ? 'Unfollow' : 'Follow'"
        :severity="isActiveTopicFollowed ? 'secondary' : 'primary'"
        text
        :loading="followBusy"
        :disabled="followBusy"
        @click="toggleFollowActiveTopic"
      />
      <Button
        label="Clear"
        text
        severity="secondary"
        @click="clearTopic"
      />
    </div>
  </div>

  <div v-if="topicError" class="px-4">
    <AppInlineAlert severity="warning">
      {{ topicError }}
    </AppInlineAlert>
  </div>

  <div v-else-if="topicLoadingInitial" class="flex justify-center py-12">
    <AppLogoLoader />
  </div>

  <div v-else-if="topicPosts.length > 0" class="space-y-0">
    <AppFeedPostRow
      v-for="p in topicPosts"
      :key="p.id"
      :post="p"
      collapse-ancestors
    />
    <div v-if="topicLoadingMore" class="flex justify-center py-6 px-4">
      <AppLogoLoader />
    </div>
    <div v-else-if="topicHasMore" class="flex justify-center py-4 px-4">
      <Button
        label="Load more"
        severity="secondary"
        :loading="topicLoadingMore"
        :disabled="topicLoadingMore"
        @click="loadMoreTopic"
      />
    </div>
  </div>

  <div v-else class="px-4">
    <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-4 py-6 text-center">
      <p class="text-sm moh-text-muted">
        No posts found for this topic.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useExplorePageContext } from '~/composables/pages/explore/useExplorePage'

const {
  activeTopic,
  isAuthed,
  isActiveTopicFollowed,
  followBusy,
  toggleFollowActiveTopic,
  clearTopic,
  topicError,
  topicLoadingInitial,
  topicPosts,
  topicLoadingMore,
  topicHasMore,
  loadMoreTopic,
} = useExplorePageContext()
</script>


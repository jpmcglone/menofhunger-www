<template>
  <AppPageContent bottom="standard">
  <div class="w-full">
    <div class="sticky top-[var(--moh-title-bar-height,0px)] z-20 border-b moh-border moh-frosted moh-texture overflow-hidden">
      <div class="relative z-10 flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <div class="min-w-0">
          <div class="text-base sm:text-lg font-semibold text-balance">Notifications</div>
        </div>
        <Button
          v-if="notifications.length > 0"
          label="Mark all as read"
          text
          severity="secondary"
          :disabled="loading || markingAllRead"
          @click="onMarkAllRead"
        />
      </div>
      <AppHorizontalScroller
        class="relative z-10"
        scroller-class="no-scrollbar px-3 pb-2.5 sm:px-4"
      >
        <div class="flex gap-1.5">
          <button
            v-for="chip in kindChips"
            :key="chip.kind ?? 'all'"
            class="relative shrink-0 inline-flex items-center min-h-11 px-3 py-1 rounded-full text-[13px] font-medium transition-colors"
            :class="activeKind === chip.kind
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:hover:bg-zinc-700'"
            :aria-pressed="activeKind === chip.kind"
            @click="onChipSelect(chip.kind)"
          >
            <span
              class="pointer-events-none absolute inset-0 rounded-full border transition-opacity duration-200 ease-out"
              :class="chipHasUnseenNotifications(chip.kind)
                ? 'opacity-100'
                : 'opacity-0 border-transparent'"
              :style="{ borderColor: notificationActivityColor }"
              aria-hidden="true"
            />
            <span class="relative z-[1]">{{ chip.label }}</span>
          </button>
        </div>
      </AppHorizontalScroller>
    </div>

    <AppSubtleSectionLoader :loading="showInitialLoader" :refreshing="loading && !showInitialLoader" min-height-class="min-h-[220px]">
      <AppScreenState
        v-if="fetchError && !notifications.length" title="Couldn’t load notifications" icon="warning" error
        action-label="Try again" :busy="loading" @action="retryFetch">
        <AppUserErrorMessage :error="fetchError" fallback="Could not load notifications." />
      </AppScreenState>
      <AppScreenState
        v-else-if="!notifications.length" title="No notifications yet" icon="notifications"
        :description="VOICE.feed.emptyBody" :action-label="VOICE.actions.explore" action-to="/explore">
        <template #actions>
          <NuxtLink to="/who-to-follow" class="inline-flex items-center text-sm font-medium moh-text-muted">{{ VOICE.actions.findPeople }}</NuxtLink>
        </template>
      </AppScreenState>
      <div v-else class="relative z-0">
        <TransitionGroup name="notifications-list" tag="div" class="moh-divide transition-opacity duration-150">
          <div
            v-for="(item, idx) in notifications"
            :key="itemKey(item)"
            class="relative hover:bg-gray-50 dark:hover:bg-zinc-900"
            :class="[
              itemHref(item) ? 'cursor-pointer' : '',
              stickyHighlightedItemKeys.has(itemKey(item))
                ? 'bg-gray-50/80 dark:bg-zinc-900/40'
                : '',
            ]"
            :role="itemHref(item) ? 'link' : undefined"
            :tabindex="itemHref(item) ? 0 : undefined"
            @click.capture="onNotificationInteractionCapture(item)"
            @auxclick.capture="onNotificationInteractionCapture(item)"
            @click="onNotificationClick(item, $event)"
            @auxclick="onNotificationAuxClick(item, $event)"
            @keydown.enter.self.prevent="onNotificationKeydown(item)"
            @keydown.space.self.prevent="onNotificationKeydown(item)"
          >
            <!-- Background anchor: aria-hidden so it's invisible to assistive tech and
                 tabindex="-1" so it's skipped by keyboard, but present in the DOM so
                 right-click → "Open in new tab" and cmd/ctrl+click work natively. -->
            <NuxtLink
              v-if="itemHref(item)"
              :to="itemHref(item)!"
              class="absolute inset-0 z-[1]"
              tabindex="-1"
              aria-hidden="true"
            />
            <div class="relative z-[2]">
              <!-- Flat repost: "X reposted" header + the original post content -->
              <template v-if="item.type === 'single' && notificationIsFlatRepost(item.notification)">
                <AppPostRepostHeader :post="item.notification.post!" />
                <AppPostRow
                  :post="item.notification.post!.repostedPost!"
                  :clickable="false"
                  :highlight="stickyHighlightedItemKeys.has(itemKey(item))"
                  no-border-bottom
                />
              </template>
              <AppPostRow
                v-else-if="item.type === 'single' && notificationShowsPostRow(item.notification)"
                :post="item.notification.post!"
                :clickable="false"
                :highlight="stickyHighlightedItemKeys.has(itemKey(item))"
                show-replying-to
                no-border-bottom
              />
              <AppNotificationRow
                v-else-if="item.type === 'single'"
                :notification="item.notification"
                :nudge-is-topmost="nudgeIsTopmostByIndex[idx] ?? false"
              />
              <AppNotificationFollowedPostsRollupRow
                v-else-if="item.type === 'followed_posts_rollup'"
                :rollup="item.rollup"
              />
              <AppNotificationGroupRow
                v-else
                :group="item.group"
                :nudge-is-topmost="nudgeIsTopmostByIndex[idx] ?? false"
              />
            </div>
          </div>
        </TransitionGroup>

        <AppLoadMoreFooter
          :state="loadingMore ? 'loading' : nextCursor && !loading ? 'idle' : 'end'"
          manual
          @load="loadMore"
        />
      </div>
    </AppSubtleSectionLoader>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { useNotificationsPage } from '~/composables/notifications/useNotificationsPage'

definePageMeta({
  layout: 'app',
  title: 'Notifications',
  hideTopBar: true,
})
usePageSeo({
  title: 'Notifications',
  description: 'Notifications for Men of Hunger — replies, follows, and updates from your network.',
  canonicalPath: '/notifications',
  noindex: true,
})

const {
  VOICE,
  notificationShowsPostRow,
  notificationIsFlatRepost,
  retryFetch,
  onChipSelect,
  chipHasUnseenNotifications,
  nudgeActorIdForItem,
  itemKey,
  onMarkAllRead,
  loadMore,
  isInteractiveTarget,
  markItemReadOptimistic,
  onNotificationInteractionCapture,
  onNotificationClick,
  onNotificationAuxClick,
  onNotificationKeydown,
  kindFromQuery,
  markDeliveredInBackground,
  syncNotificationsOnEntry,
  POST_ROW_KINDS,
  notifBadge,
  notificationsTabReturnGate,
  kindChips,
  router,
  route,
  loadingMore,
  markingAllRead,
  visitHighlights,
  stickyHighlightedItemKeys,
  showInitialLoader,
  nudgeIsTopmostByIndex,
  notificationActorIds,
  presenceAddedIds,
  crewCb,
  groupInviteCb,
  notificationReadToast,
  lastDeliveredMarkAt,
  notificationActivityColor,
  notifications,
  nextCursor,
  loading,
  hasFetched,
  fetchError,
  pendingRefresh,
  activeKind,
  unreadByKind,
  unreadByCategory,
  setKind,
  fetchList,
  markDelivered,
  markReadById,
  markAllRead,
  clearUnreadKind,
  decrementUnreadKind,
  itemHref,
  addInterest,
  removeInterest,
  addCrewCallback,
  removeCrewCallback,
  addGroupInviteCallback,
  removeGroupInviteCallback,
  notificationViewer,
  notificationUndeliveredCount,
} = useNotificationsPage()
</script>

<style scoped>
.notifications-list-enter-active,
.notifications-list-leave-active {
  transition: opacity 0.15s ease;
}

.notifications-list-enter-from,
.notifications-list-leave-to {
  opacity: 0;
}

.notifications-list-move {
  transition: transform 0.2s ease;
}
</style>

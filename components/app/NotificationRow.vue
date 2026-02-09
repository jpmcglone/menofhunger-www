<template>
  <div
    :class="[
      // Two-column layout:
      // - col 1: unread bar (animates width/margin/opacity)
      // - col 2: the rest of the content (with consistent padding)
      'relative flex transition-colors',
      shouldAnimate ? 'transition-all duration-150 ease-out' : '',
      subjectTierRowClass(notification),
    ]"
  >
    <!-- Column 1: unread indicator bar (animates in/out) -->
    <div
      :class="[
        // Keep height equal to the content column (no negative margins).
        'shrink-0 self-stretch origin-left',
        notification.readAt ? 'w-0 opacity-0 mr-0' : 'w-1 opacity-100 mr-4',
        shouldAnimate ? 'transition-[width,margin-right,opacity] duration-150 ease-out' : '',
        actorTierIconBgClass(notification),
      ]"
      aria-hidden="true"
    />

    <!-- Column 2: the rest of the row -->
    <div
      :class="[
        'flex min-w-0 flex-1 gap-4 ml-1',
        // Content padding lives on column 2 so column 1 can be flush to the row edges.
        // When the bar is hidden, keep a left padding so the row still feels consistent.
        notification.readAt ? 'px-4 py-4' : 'pr-4 py-4',
        shouldAnimate ? 'transition-[padding] duration-150 ease-out' : '',
      ]"
    >

      <!-- Left: avatar with notification type icon -->
      <div class="relative flex shrink-0 items-start">
        <div class="relative shrink-0" @click.stop>
          <NuxtLink
            v-if="notification.actor?.id"
            :to="notification.actor.username ? `/u/${notification.actor.username}` : `/u/id/${notification.actor.id}`"
            class="block"
            @click.stop
          >
            <AppUserAvatar
              :user="{
                id: notification.actor.id,
                username: notification.actor.username,
                name: notification.actor.name,
                avatarUrl: notification.actor.avatarUrl,
              }"
              size-class="h-10 w-10"
            />
          </NuxtLink>
          <div
            v-else
            class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800"
            aria-hidden="true"
          />
          <!-- Notification type icon: mention = viewer tier; otherwise actor tier -->
          <div
            class="absolute -bottom-3 -left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white dark:border-black shadow-sm"
            :class="notificationTypeIconBgClass(notification)"
            aria-hidden="true"
          >
            <!-- Boost icon (custom SVG) -->
            <svg
              v-if="notification.kind === 'boost'"
              viewBox="0 0 24 24"
              class="h-4 w-4 text-white"
            >
              <path
                fill="currentColor"
                d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
              />
            </svg>
            <Icon
              v-else
              :name="notificationIconName(notification)"
              class="text-xs text-white"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <!-- Center: main content -->
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <!-- Title + quoted message: up to 2 lines with truncation -->
            <div :class="['min-w-0 max-w-full line-clamp-2 text-sm', notification.readAt ? 'font-medium' : 'font-semibold']">
              <span :class="actorTierClass(notification)">{{ actorDisplay(notification) }}</span>
              <template v-if="notification.kind === 'comment'">
                <span class="ml-1">replied to your</span>
                <span class="ml-1" :class="subjectPostVisibilityTextClass(notification)">post</span>
              </template>
            <template v-else-if="notification.kind === 'boost'">
              <span class="ml-1">boosted your</span>
              <span class="ml-1" :class="subjectPostVisibilityTextClass(notification)">post</span>
            </template>
            <template v-else-if="notification.kind === 'followed_post'">
              <span class="ml-1">shared a</span>
              <span class="ml-1 font-semibold" :class="subjectPostVisibilityTextClass(notification)">post</span>
            </template>
              <template v-else>
                <span class="ml-1">{{ titleSuffix(notification) }}</span>
              </template>
              <template v-if="(notification.kind === 'comment' || notification.kind === 'mention') && notification.body">
                <span class="ml-1 italic text-gray-600 dark:text-gray-300">"{{ notification.body }}"</span>
              </template>
            </div>
            <!-- Fallback for other kinds with body -->
            <div
              v-if="notification.body && notification.kind !== 'comment' && notification.kind !== 'mention'"
              class="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-300"
            >
              {{ notification.body }}
            </div>
            <div v-if="!notification.body && !notification.subjectPostPreview?.media?.length" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ notificationContext(notification) }}
            </div>
            <!-- Next line: media only (no blockquote) -->
            <div
              v-if="notification.subjectPostPreview?.media?.length"
              class="mt-2 flex shrink-0 -space-x-2"
            >
              <template
                v-for="(m, idx) in notification.subjectPostPreview.media.slice(0, 4)"
                :key="idx"
              >
                <img
                  v-if="(m.kind === 'video' ? m.thumbnailUrl : m.url)"
                  :src="m.kind === 'video' ? (m.thumbnailUrl || m.url) : m.url"
                  :alt="''"
                  class="h-8 w-8 shrink-0 rounded border border-gray-200 object-cover dark:border-zinc-700"
                  loading="lazy"
                >
              </template>
            </div>
          </div>
          <div class="shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ formatWhen(notification.createdAt) }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { Notification } from '~/types/api'

const {
  actorDisplay,
  actorTierClass,
  notificationTypeIconBgClass,
  actorTierIconBgClass,
  subjectPostVisibilityTextClass,
  subjectTierRowClass,
  titleSuffix,
  notificationContext,
  notificationIconName,
  formatWhen,
} = useNotifications()

const shouldAnimate = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    shouldAnimate.value = true
  })
})

defineProps<{
  notification: Notification
}>()
</script>

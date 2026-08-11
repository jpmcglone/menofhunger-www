<template>
  <div
    :class="[
      // Two-column layout:
      // - col 1: unread bar (animates width/margin/opacity)
      // - col 2: the rest of the content (with consistent padding)
      // `transition-colors` handles the only property that actually changes on
      // this row (background/border tier tint). Don't use `transition-all` — it
      // also picks up `padding`/`color` and triggers extra paints per render.
      'relative flex',
      shouldAnimate ? 'transition-colors duration-150 ease-out' : 'transition-colors',
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
        'flex min-w-0 flex-1 gap-3 sm:gap-4 ml-1',
        // Content padding lives on column 2 so column 1 can be flush to the row edges.
        // When the bar is hidden, keep a left padding so the row still feels consistent.
        notification.readAt ? 'px-3 py-3 sm:px-4 sm:py-4' : 'pr-3 py-3 sm:pr-4 sm:py-4',
        shouldAnimate ? 'transition-[padding] duration-150 ease-out' : '',
      ]"
    >
      <!-- Left rail: notification icon + actor avatar stay centered as one unit. -->
      <div
        :class="[
          'flex shrink-0 items-start gap-2',
          (notification.kind === 'marv_not_in_group' || notification.kind === 'poll_results_ready' || notification.kind === 'status_update' || notification.kind === 'word_of_the_day' || notification.kind === 'quote_of_the_day' || notification.kind === 'account_verified' || notification.kind === 'checkin_reminder' || notification.kind === 'on_this_day' || notification.kind === 'premium_started' || notification.kind === 'premium_ended')
            ? 'w-[2.75rem]'
            : 'w-[5.25rem]',
        ]"
      >
        <!-- System notifications and status_update carry their context elsewhere; no type icon here. -->
        <div
          v-if="notification.kind !== 'marv_not_in_group' && notification.kind !== 'poll_results_ready' && notification.kind !== 'status_update' && notification.kind !== 'word_of_the_day' && notification.kind !== 'quote_of_the_day' && notification.kind !== 'account_verified' && notification.kind !== 'checkin_reminder' && notification.kind !== 'on_this_day' && notification.kind !== 'premium_started' && notification.kind !== 'premium_ended'"
          class="flex h-9 w-8 shrink-0 items-center justify-center sm:h-10"
          aria-hidden="true"
        >
          <svg
            v-if="notification.kind === 'boost'"
            viewBox="0 0 24 24"
            :class="['h-5 w-5', notificationTypeIconTextClass(notification)]"
          >
            <path
              fill="currentColor"
              d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
            />
          </svg>
          <Icon
            v-else
            :name="notificationIconName(notification)"
            :class="['text-[22px]', notificationTypeIconTextClass(notification)]"
            aria-hidden="true"
          />
        </div>

        <!-- Actor avatar -->
        <div class="relative flex shrink-0 items-start" @click.stop>
          <!-- Marv system notification: group avatar with Marv sparkle badge -->
          <div
            v-if="notification.kind === 'marv_not_in_group'"
            class="relative shrink-0"
            aria-hidden="true"
          >
            <!-- Group avatar (or gradient placeholder if no avatar) -->
            <img
              v-if="notification.subjectGroupAvatarUrl"
              :src="notification.subjectGroupAvatarUrl"
              class="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10 moh-img-outline"
              alt=""
            />
            <div
              v-else
              class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 sm:h-10 sm:w-10"
            >
              <Icon name="tabler:sparkles" class="text-white text-base" />
            </div>
            <!-- Marv sparkle badge: only when showing a real group avatar -->
            <div
              v-if="notification.subjectGroupAvatarUrl"
              class="absolute -bottom-1 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 ring-2 ring-[var(--moh-bg)]"
            >
              <Icon name="tabler:sparkles" class="text-white text-[9px]" />
            </div>
          </div>
          <!-- Poll results system notification: avatar shows the chart, colored by visibility -->
          <div
            v-else-if="notification.kind === 'poll_results_ready'"
            :class="['flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10', notificationTypeIconBgClass(notification)]"
            aria-hidden="true"
          >
            <Icon name="tabler:chart-bar" class="text-white text-base" aria-hidden="true" />
          </div>
          <!-- Daily content system notifications -->
          <div
            v-else-if="notification.kind === 'word_of_the_day'"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 sm:h-10 sm:w-10"
            aria-hidden="true"
          >
            <Icon name="tabler:book" class="text-white text-base" aria-hidden="true" />
          </div>
          <div
            v-else-if="notification.kind === 'quote_of_the_day'"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 sm:h-10 sm:w-10"
            aria-hidden="true"
          >
            <Icon name="tabler:quote" class="text-white text-base" aria-hidden="true" />
          </div>
          <div
            v-else-if="notification.kind === 'account_verified'"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--moh-verified,#2563eb)] sm:h-10 sm:w-10"
            aria-hidden="true"
          >
            <Icon name="tabler:rosette-discount-check" class="text-white text-base" aria-hidden="true" />
          </div>
          <div
            v-else-if="notification.kind === 'checkin_reminder'"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 sm:h-10 sm:w-10"
            aria-hidden="true"
          >
            <Icon name="tabler:calendar-event" class="text-white text-base" aria-hidden="true" />
          </div>
          <div
            v-else-if="notification.kind === 'on_this_day'"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 sm:h-10 sm:w-10"
            aria-hidden="true"
          >
            <Icon name="tabler:calendar-stats" class="text-white text-base" aria-hidden="true" />
          </div>
          <div
            v-else-if="notification.kind === 'premium_started'"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--moh-premium,#f59e0b)] sm:h-10 sm:w-10"
            aria-hidden="true"
          >
            <Icon name="tabler:crown" class="text-white text-base" aria-hidden="true" />
          </div>
          <div
            v-else-if="notification.kind === 'premium_ended'"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-400 dark:bg-zinc-600 sm:h-10 sm:w-10"
            aria-hidden="true"
          >
            <Icon name="tabler:crown-off" class="text-white text-base" aria-hidden="true" />
          </div>
          <NuxtLink
            v-else-if="notification.actor?.id && notification.actor?.username"
            :to="`/u/${notification.actor.username}`"
            class="block"
            @click.stop
          >
            <AppUserAvatar
              :show-status="false"
              :user="{
                id: notification.actor.id,
                username: notification.actor.username,
                name: notification.actor.name,
                avatarUrl: notification.actor.avatarUrl,
              }"
              size-class="h-9 w-9 sm:h-10 sm:w-10"
            />
          </NuxtLink>
          <AppUserAvatar
            v-else-if="notification.actor?.id"
            :user="{
              id: notification.actor.id,
              username: notification.actor.username,
              name: notification.actor.name,
              avatarUrl: notification.actor.avatarUrl,
            }"
            size-class="h-9 w-9 sm:h-10 sm:w-10"
            :show-status="false"
          />
          <div
            v-else
            class="h-9 w-9 rounded-full bg-gray-200 dark:bg-zinc-800 sm:h-10 sm:w-10"
            aria-hidden="true"
          />
        </div>
      </div>

      <!-- Center: main content -->
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <!-- Title + quoted message: up to 2 lines with truncation -->
            <div :class="['min-w-0 max-w-full line-clamp-2 text-[13px] sm:text-sm', notification.readAt ? 'font-medium' : 'font-semibold']">
              <span
                v-if="notification.kind !== 'marv_not_in_group' && notification.kind !== 'poll_results_ready' && notification.kind !== 'word_of_the_day' && notification.kind !== 'quote_of_the_day' && notification.kind !== 'account_verified' && notification.kind !== 'checkin_reminder' && notification.kind !== 'on_this_day'"
                :class="actorTierClass(notification)"
                @mouseenter="onActorEnter"
                @mousemove="onActorMove"
                @mouseleave="onActorLeave"
              >{{ actorDisplay(notification) }}</span>
              <template v-if="notification.kind === 'comment'">
                <template v-if="notification.subjectArticleId">
                  <span class="ml-1">replied to your</span>
                  <span class="ml-1 font-semibold text-orange-600 dark:text-orange-400">article</span>
                </template>
                <template v-else>
                  <span class="ml-1">replied to your</span>
                  <span class="ml-1" :class="subjectPostVisibilityTextClass(notification)">post</span>
                </template>
              </template>
            <template v-else-if="notification.kind === 'boost'">
              <span class="ml-1">boosted your</span>
              <span
                class="ml-1"
                :class="notification.subjectArticleId ? 'font-semibold text-orange-600 dark:text-orange-400' : subjectPostVisibilityTextClass(notification)"
              >{{ boostSubjectNoun(notification) }}</span>
            </template>
            <template v-else-if="notification.kind === 'followed_post'">
              <span class="ml-1">posted</span>
            </template>
            <template v-else-if="notification.kind === 'followed_article'">
              <span class="ml-1">published a new</span>
              <span class="ml-1 font-semibold text-orange-600 dark:text-orange-400">article</span>
            </template>
              <template v-else-if="notification.kind === 'group_join_request'">
                <span class="ml-1">requests to join</span>
                <span v-if="notification.subjectGroupName" class="ml-1 font-semibold">{{ notification.subjectGroupName }}</span>
                <span v-else class="ml-1">your group</span>
              </template>
              <template v-else-if="notification.kind === 'crew_invite_received'">
                <span class="ml-1">invited you to</span>
                <span
                  v-if="notification.subjectCrewName"
                  class="ml-1 font-semibold"
                >{{ notification.subjectCrewName }}</span>
                <span v-else class="ml-1">their crew</span>
              </template>
              <template v-else-if="notification.kind === 'community_group_invite_received'">
                <span class="ml-1">invited you to</span>
                <span
                  v-if="notification.subjectGroupName"
                  class="ml-1 font-semibold"
                >{{ notification.subjectGroupName }}</span>
                <span v-else class="ml-1">their group</span>
              </template>
              <template v-else-if="notification.kind === 'community_group_member_joined'">
                <span class="ml-1">joined</span>
                <span
                  v-if="notification.subjectGroupName"
                  class="ml-1 font-semibold"
                >{{ notification.subjectGroupName }}</span>
                <span v-else class="ml-1">your group</span>
              </template>
              <template v-else-if="notification.kind === 'community_group_join_approved' || notification.kind === 'community_group_join_rejected' || notification.kind === 'community_group_member_removed' || notification.kind === 'community_group_disbanded'">
                <span class="ml-1">{{ titleSuffix(notification) }}</span>
              </template>
              <template v-else-if="notification.kind === 'marv_not_in_group'">
                <span>Marv is not in</span>
                <span
                  v-if="notification.subjectGroupName"
                  class="ml-1 font-semibold"
                >{{ notification.subjectGroupName }}</span>
                <span v-else class="ml-1">this group</span>
              </template>
              <template v-else-if="notification.kind === 'poll_results_ready'">
                <span>{{ titleSuffix(notification) }}</span>
              </template>
              <template v-else-if="notification.kind === 'word_of_the_day' || notification.kind === 'quote_of_the_day' || notification.kind === 'account_verified' || notification.kind === 'checkin_reminder' || notification.kind === 'on_this_day' || notification.kind === 'premium_started' || notification.kind === 'premium_ended'">
                <span>{{ titleSuffix(notification) }}</span>
              </template>
              <template v-else>
                <span class="ml-1">{{ titleSuffix(notification) }}</span>
              </template>
              <ClientOnly>
                <template #fallback>
                  <span aria-hidden="true">&nbsp;</span>
                </template>
                <span
                  v-tooltip.bottom="tinyTooltip(formatWhenFull(notification.createdAt))"
                  class="ml-1 whitespace-nowrap font-normal text-gray-500 dark:text-gray-400 tabular-nums"
                >
                  · {{ formatWhen(notification.createdAt) }}
                </span>
              </ClientOnly>
            </div>
            <div
              v-if="(notification.kind === 'comment' || notification.kind === 'mention') && notification.body"
              class="mt-0.5 line-clamp-2 text-[13px] sm:text-sm text-gray-600 dark:text-gray-300"
            >
              {{ notification.body }}
            </div>
            <!-- Status update: status text in a white bubble matching the profile header pill -->
            <AppStatusBubble
              v-if="notification.kind === 'status_update' && notification.body"
              :text="notification.body"
              class="mt-1.5"
            />
            <!-- Boost of a status post: same status bubble, not a plain "Boost" label -->
            <AppStatusBubble
              v-else-if="isBoostOfStatus(notification) && statusBoostText(notification)"
              :text="statusBoostText(notification)!"
              class="mt-1.5"
            />
            <!-- Fallback for other kinds with body (renders **bold** segments) -->
            <div
              v-if="notification.body && notification.kind !== 'comment' && notification.kind !== 'mention' && notification.kind !== 'followed_article' && notification.kind !== 'poll_results_ready' && notification.kind !== 'status_update' && !isBoostOfStatus(notification)"
              class="mt-0.5 line-clamp-2 text-[13px] sm:text-sm text-gray-600 dark:text-gray-300"
            >
              <template v-for="(seg, i) in parseBoldSegments(notification.body)" :key="i">
                <!-- For Marv notifications, make the bold segment a hoverable group link -->
                <NuxtLink
                  v-if="seg.bold && notification.kind === 'marv_not_in_group' && notification.subjectGroupSlug"
                  :to="`/g/${encodeURIComponent(notification.subjectGroupSlug)}`"
                  class="font-semibold text-gray-800 dark:text-gray-100 hover:underline underline-offset-2"
                  @click.stop
                  @mouseenter="onGroupEnter"
                  @mousemove="onGroupMove"
                  @mouseleave="onGroupLeave"
                >{{ seg.text }}</NuxtLink>
                <strong v-else-if="seg.bold" class="font-semibold text-gray-800 dark:text-gray-100">{{ seg.text }}</strong>
                <span v-else>{{ seg.text }}</span>
              </template>
            </div>
            <!-- Poll name chip -->
            <div
              v-if="notification.kind === 'poll_results_ready' && notification.body"
              class="mt-1.5 line-clamp-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[12px] sm:text-[13px] leading-snug text-gray-600 dark:border-zinc-700/70 dark:bg-zinc-800/60 dark:text-gray-300"
            >
              {{ notification.body }}
            </div>
            <div
              v-if="notification.kind === 'repost' && notification.subjectPostPreview?.bodySnippet"
              class="mt-1.5 line-clamp-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[12px] sm:text-[13px] leading-snug text-gray-600 dark:border-zinc-700/70 dark:bg-zinc-800/60 dark:text-gray-300"
            >
              {{ notification.subjectPostPreview.bodySnippet }}
            </div>
            <div v-if="!notification.body && !notification.subjectPostPreview?.bodySnippet && !notification.subjectPostPreview?.media?.length && !isBoostOfStatus(notification)" class="mt-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
              {{ notificationContext(notification) }}
            </div>
            <!-- Next line: media only (no blockquote) -->
            <div
              v-if="notification.subjectPostPreview?.media?.length"
              class="mt-2 flex shrink-0 -space-x-2"
            >
              <template
                v-for="(m, idx) in notification.subjectPostPreview.media.slice(0, 4)"
                :key="notificationMediaPreviewKey(m, idx)"
              >
                <img
                  v-if="(m.kind === 'video' ? m.thumbnailUrl : m.url)"
                  :src="m.kind === 'video' ? (m.thumbnailUrl || m.url) : m.url"
                  :alt="''"
                  class="h-8 w-8 shrink-0 rounded object-cover bg-black moh-img-outline"
                  loading="lazy"
                >
              </template>
            </div>

            <!-- Article preview card (followed_article) -->
            <div
              v-if="notification.kind === 'followed_article' && notification.subjectArticlePreview"
              class="mt-2.5 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-zinc-700/70 dark:bg-zinc-800/60"
            >
              <!-- Thumbnail -->
              <div
                v-if="notification.subjectArticlePreview.thumbnailUrl"
                class="shrink-0 overflow-hidden rounded-lg"
              >
                <img
                  :src="notification.subjectArticlePreview.thumbnailUrl"
                  :alt="notification.subjectArticlePreview.title ?? ''"
                  class="h-14 w-20 object-cover"
                  loading="lazy"
                >
              </div>
              <!-- Text -->
              <div class="min-w-0 flex-1">
                <p
                  v-if="notification.subjectArticlePreview.title"
                  class="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900 dark:text-gray-100"
                >
                  {{ notification.subjectArticlePreview.title }}
                </p>
                <p
                  v-if="notification.subjectArticlePreview.excerpt"
                  class="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-500 dark:text-zinc-400"
                >
                  {{ notification.subjectArticlePreview.excerpt }}
                </p>
                <div class="mt-1 flex items-center gap-1.5">
                  <span
                    v-if="notification.subjectArticlePreview.visibility && notification.subjectArticlePreview.visibility !== 'public'"
                    :class="[
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      notification.subjectArticlePreview.visibility === 'premiumOnly'
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                    ]"
                  >
                    {{ notification.subjectArticlePreview.visibility === 'premiumOnly' ? 'Premium' : 'Verified' }}
                  </span>
                  <span class="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Read article →</span>
                </div>
              </div>
            </div>
          </div>
          <div class="shrink-0 flex items-start gap-3">
            <!-- Smart actions (right side, before time) -->
            <div
              v-if="notification.kind === 'nudge'"
              class="max-w-[14rem] flex flex-wrap items-center justify-end gap-2"
              @click.stop.prevent
            >
              <span
                v-if="nudgeActionState === 'gotit'"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                <Icon name="tabler:check" class="text-[11px]" aria-hidden="true" />
                Got it
              </span>
              <span
                v-else-if="notification.ignoredAt || nudgeActionState === 'ignored'"
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400"
              >
                Dismissed
              </span>
              <span
                v-else-if="notification.nudgedBackAt || nudgeActionState === 'nudged'"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <Icon name="tabler:hand-click" class="text-[11px]" aria-hidden="true" />
                Nudged back
              </span>
              <template v-else-if="nudgeIsTopmost && (canShowNudgeBack || !notification.readAt)">
                <div class="inline-flex overflow-hidden rounded-xl border moh-border" @click.stop.prevent>
                  <Button
                    v-if="canShowNudgeBack"
                    size="small"
                    label="Nudge back"
                    severity="secondary"
                    class="!rounded-none !border-0 !text-xs"
                    :disabled="nudgeInflight || ignoreInflight"
                    @click.stop.prevent="onNudgeBack"
                  />
                  <Button
                    size="small"
                    type="button"
                    severity="secondary"
                    class="!rounded-none !border-0 !text-xs"
                    :class="canShowNudgeBack ? '!px-2' : ''"
                    aria-label="More nudge actions"
                    aria-haspopup="true"
                    :disabled="nudgeInflight || ignoreInflight"
                    @click.stop.prevent="toggleNudgeMenu"
                  >
                    <template #icon>
                      <Icon name="tabler:chevron-down" aria-hidden="true" />
                    </template>
                    <span v-if="!canShowNudgeBack" class="ml-1">Actions</span>
                  </Button>
                </div>
                <Menu v-if="nudgeMenuMounted" ref="nudgeMenuRef" :model="nudgeMenuItems" popup>
                  <template #item="{ item, props }">
                    <a v-bind="props.action" class="flex items-center gap-2">
                      <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
                      <span
                        v-tooltip.bottom="
                          item.value === 'ignore'
                            ? tinyTooltip(ignoreNudgeTooltip)
                            : item.value === 'gotit'
                              ? tinyTooltip(gotItNudgeTooltip)
                              : undefined
                        "
                        v-bind="props.label"
                        class="flex-1"
                      >
                        {{ item.label }}
                      </span>
                    </a>
                  </template>
                </Menu>
              </template>
            </div>
            <div
              v-else-if="notification.kind === 'follow' && notification.actor?.id && notification.actor?.username"
              class="max-w-[14rem] flex flex-wrap items-center justify-end gap-2"
              @click.stop.prevent
            >
              <Button
                v-if="canFollowBack"
                size="small"
                label="Follow back"
                severity="secondary"
                rounded
                :disabled="followInflight"
                @click.stop.prevent="onFollowBack"
              />
              <span
                v-else-if="isFollowingActor"
                class="inline-flex items-center rounded-full px-2 py-1 text-xs bg-gray-100 text-gray-500 dark:bg-zinc-800/70 dark:text-gray-400"
              >
                Following
              </span>
            </div>
            <!-- Crew invite: Accept / Decline directly from the notification.
                 The terminal state ("Joined" / "Rejected" / "No longer
                 available") is driven by `subjectCrewInviteStatus` so it persists
                 across reloads. Older notifications without a linked invite id
                 still work — we resolve via the inbox on first click. -->
            <div
              v-else-if="notification.kind === 'crew_invite_received'"
              class="max-w-[16rem] flex flex-wrap items-center justify-end gap-2"
              @click.stop.prevent
            >
              <span
                v-if="crewInviteDisplayState === 'accepted'"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                <Icon name="tabler:check" class="text-[11px]" aria-hidden="true" />
                Joined
              </span>
              <span
                v-else-if="crewInviteDisplayState === 'declined'"
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400"
              >
                Declined
              </span>
              <span
                v-else-if="crewInviteDisplayState === 'cancelled' || crewInviteDisplayState === 'expired'"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400"
              >
                <Icon name="tabler:clock" class="text-[11px]" aria-hidden="true" />
                Expired
              </span>
              <template v-else>
                <Button
                  size="small"
                  label="Accept"
                  rounded
                  :disabled="crewInviteInflight"
                  :loading="crewInviteInflight && crewInviteAction === 'accept'"
                  @click.stop.prevent="onAcceptCrewInvite"
                />
                <Button
                  size="small"
                  label="Decline"
                  severity="secondary"
                  rounded
                  :disabled="crewInviteInflight"
                  :loading="crewInviteInflight && crewInviteAction === 'decline'"
                  @click.stop.prevent="onDeclineCrewInvite"
                />
              </template>
            </div>
            <!-- Community group invite: same Accept/Decline pattern as crews;
                 terminal copy is driven by `subjectCommunityGroupInviteStatus`
                 so it persists across reloads. -->
            <div
              v-else-if="notification.kind === 'community_group_invite_received'"
              class="max-w-[16rem] flex flex-wrap items-center justify-end gap-2"
              @click.stop.prevent
            >
              <span
                v-if="groupInviteDisplayState === 'accepted'"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                <Icon name="tabler:check" class="text-[11px]" aria-hidden="true" />
                Joined
              </span>
              <span
                v-else-if="groupInviteDisplayState === 'declined'"
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400"
              >
                Declined
              </span>
              <span
                v-else-if="groupInviteDisplayState === 'cancelled' || groupInviteDisplayState === 'expired'"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400"
              >
                <Icon name="tabler:clock" class="text-[11px]" aria-hidden="true" />
                Expired
              </span>
              <template v-else>
                <Button
                  size="small"
                  label="Accept"
                  rounded
                  :disabled="groupInviteInflight"
                  :loading="groupInviteInflight && groupInviteAction === 'accept'"
                  @click.stop.prevent="onAcceptGroupInvite"
                />
                <Button
                  size="small"
                  label="Decline"
                  severity="secondary"
                  rounded
                  :disabled="groupInviteInflight"
                  :loading="groupInviteInflight && groupInviteAction === 'decline'"
                  @click.stop.prevent="onDeclineGroupInvite"
                />
              </template>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommunityGroupShell, FollowSummaryResponse, Notification } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { stableListKey } from '~/utils/stable-list-key'
import type { MenuItem } from 'primevue/menuitem'

const {
  actorDisplay,
  actorTierClass,
  notificationTypeIconTextClass,
  notificationTypeIconBgClass,
  actorTierIconBgClass,
  subjectPostVisibilityTextClass,
  subjectTierRowClass,
  titleSuffix,
  notificationContext,
  isBoostOfStatus,
  statusBoostText,
  boostSubjectNoun,
  notificationIconName,
  formatWhen,
  formatWhenFull,
} = useNotifications()

const shouldAnimate = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    shouldAnimate.value = true
  })
})

const props = defineProps<{ notification: Notification; nudgeIsTopmost?: boolean }>()

/** Splits a string like "foo **bar** baz" into bold/plain segments for inline rendering. */
function parseBoldSegments(text: string): Array<{ text: string; bold: boolean }> {
  const segments: Array<{ text: string; bold: boolean }> = []
  const parts = text.split(/\*\*/)
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) segments.push({ text: parts[i]!, bold: i % 2 === 1 })
  }
  return segments
}
const localReadAt = ref<string | null>(null)
const notification = computed<Notification>(() => {
  if (!localReadAt.value) return props.notification
  return { ...props.notification, readAt: localReadAt.value }
})

const { onEnter: onActorEnter, onMove: onActorMove, onLeave: onActorLeave } = useUserPreviewTrigger({
  username: computed(() => props.notification.actor?.username ?? ''),
})

// Minimal shell for the marv_not_in_group group-name hover preview.
const marvGroupShell = computed<CommunityGroupShell | null>(() => {
  const n = notification.value
  if (n.kind !== 'marv_not_in_group') return null
  if (!n.subjectGroupId || !n.subjectGroupSlug || !n.subjectGroupName) return null
  return {
    id: n.subjectGroupId,
    slug: n.subjectGroupSlug,
    name: n.subjectGroupName,
    description: '',
    rules: null,
    coverImageUrl: null,
    avatarImageUrl: n.subjectGroupAvatarUrl ?? null,
    joinPolicy: 'open',
    memberCount: 0,
    isFeatured: false,
    featuredOrder: 0,
    createdAt: '',
    viewerMembership: null,
    viewerPendingApproval: false,
  }
})
const { onEnter: onGroupEnter, onMove: onGroupMove, onLeave: onGroupLeave } = useGroupPreviewTrigger({
  shell: marvGroupShell,
})
const nudgeIsTopmost = computed(() => props.nudgeIsTopmost !== false)

function notificationMediaPreviewKey(
  media: { kind?: string | null; url?: string | null; thumbnailUrl?: string | null },
  idx: number,
): string {
  return stableListKey('media', media.kind ?? 'unknown', media.thumbnailUrl ?? media.url ?? 'none', idx)
}

const { nudgeUser, ignoreNudge, ackNudge, markNudgeNudgedBackById } = useNudge()
const { apiFetchData } = useApiClient()
const { push: pushToast } = useAppToast()
const followState = useFollowState()

const nudgeActionState = ref<'idle' | 'nudged' | 'ignored' | 'gotit'>('idle')
const gotItNudgeTooltip = 'Accepts the nudge. They can nudge you again without you nudging back.'
const ignoreNudgeTooltip = 'Dismisses it, but they still can’t nudge you again for 24 hours (unless you nudge them back).'

const canShowNudgeBack = ref(false)
const nudgeInflight = ref(false)
const ignoreInflight = ref(false)

type MenuItemWithIcon = MenuItem & { iconName?: string; value?: 'gotit' | 'ignore' }
const nudgeMenuMounted = ref(false)
const nudgeMenuRef = ref<{ toggle: (event: Event) => void } | null>(null)
const nudgeMenuItems = computed<MenuItemWithIcon[]>(() => [
  { label: 'Got it', iconName: 'tabler:check', value: 'gotit', command: () => void onGotIt() },
  { label: 'Ignore', iconName: 'tabler:ban', value: 'ignore', command: () => void onIgnore() },
])

async function toggleNudgeMenu(event: Event) {
  nudgeMenuMounted.value = true
  await nextTick()
  nudgeMenuRef.value?.toggle(event)
}

onMounted(async () => {
  if (notification.value.kind !== 'nudge') return
  const username = notification.value.actor?.username ?? null
  if (!username) return
  try {
    const rel = await apiFetchData<FollowSummaryResponse>(
      `/follows/summary/${encodeURIComponent(username)}`,
      { method: 'GET' },
    )
    const mutual = Boolean(rel?.viewerFollowsUser && rel?.userFollowsViewer)
    const canNudgeNow = mutual && !rel?.nudge?.outboundPending
    canShowNudgeBack.value = Boolean(canNudgeNow)
  } catch {
    // If status fails, fall back to showing only Ignore.
    canShowNudgeBack.value = false
  }
})

const followInflight = ref(false)
const followRel = ref<{ viewerFollowsUser: boolean; userFollowsViewer: boolean } | null>(null)

const isFollowingActor = computed(() => Boolean(followRel.value?.viewerFollowsUser))
const canFollowBack = computed(() => Boolean(followRel.value && followRel.value.userFollowsViewer && !followRel.value.viewerFollowsUser))

onMounted(async () => {
  if (notification.value.kind !== 'follow') return
  const username = notification.value.actor?.username ?? null
  if (!username) return
  try {
    const rel = await apiFetchData<{ viewerFollowsUser: boolean; userFollowsViewer: boolean }>(
      `/follows/status/${encodeURIComponent(username)}`,
      { method: 'GET' },
    )
    followRel.value = { viewerFollowsUser: Boolean(rel?.viewerFollowsUser), userFollowsViewer: Boolean(rel?.userFollowsViewer) }
  } catch {
    followRel.value = null
  }
})

async function onIgnore() {
  const id = notification.value.id
  const username = notification.value.actor?.username ?? null
  ignoreInflight.value = true
  try {
    await ignoreNudge(id, { username })
    // Update local row state so the highlight clears immediately.
    localReadAt.value = new Date().toISOString()
    nudgeActionState.value = 'ignored'
    pushToast({ title: 'Ignored', tone: 'success' })
  } finally {
    ignoreInflight.value = false
  }
}

async function onGotIt() {
  const id = notification.value.id
  const username = notification.value.actor?.username ?? null
  ignoreInflight.value = true
  try {
    await ackNudge(id, { username })
    localReadAt.value = new Date().toISOString()
    nudgeActionState.value = 'gotit'
    pushToast({ title: 'Got it', tone: 'success' })
  } finally {
    ignoreInflight.value = false
  }
}

async function onNudgeBack() {
  const username = notification.value.actor?.username ?? null
  if (!username) return
  nudgeInflight.value = true
  try {
    // Persist "you nudged back" on this notification, then send our nudge.
    await markNudgeNudgedBackById(notification.value.id, { username }).catch(() => {})
    await nudgeUser(username)
    localReadAt.value = new Date().toISOString()
    nudgeActionState.value = 'nudged'
    pushToast({ title: 'Nudged back', tone: 'success' })
  } catch {
    // ignore (backend enforces if not allowed / blocked)
  } finally {
    nudgeInflight.value = false
  }
}

// Crew invite (accept / decline directly from the row).
const crewApi = useCrew()
const viewerCrew = useViewerCrew()
const crewInviteInflight = ref(false)
const crewInviteAction = ref<'accept' | 'decline' | null>(null)
// Local override: optimistic state set by clicking Accept/Decline in this tab.
// Survives until the page is reloaded — at which point the server-provided
// `subjectCrewInviteStatus` takes over.
const crewInviteLocalState = ref<'accepted' | 'declined' | null>(null)
// Resolved on demand for legacy notifications that predate `subjectCrewInviteId`.
const resolvedCrewInviteId = ref<string | null>(null)

const crewInviteDisplayState = computed<
  'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
>(() => {
  if (crewInviteLocalState.value) return crewInviteLocalState.value
  const serverStatus = notification.value.subjectCrewInviteStatus
  if (serverStatus && serverStatus !== 'pending') return serverStatus
  return 'pending'
})

async function getCrewInviteId(): Promise<string | null> {
  const direct = notification.value.subjectCrewInviteId
  if (direct) return direct
  if (resolvedCrewInviteId.value) return resolvedCrewInviteId.value
  const inviterId = notification.value.actor?.id ?? null
  if (!inviterId) return null
  try {
    const inbox = await crewApi.listInbox()
    // Most recent pending invite from this inviter wins; the API returns inbox
    // sorted by createdAt desc so a simple .find() does the right thing.
    const match = inbox.find((inv) => inv.status === 'pending' && inv.invitedBy.id === inviterId)
    if (match) {
      resolvedCrewInviteId.value = match.id
      return match.id
    }
  } catch {
    // fall through and let the caller surface a sensible toast
  }
  return null
}

async function onAcceptCrewInvite() {
  if (crewInviteInflight.value) return
  crewInviteInflight.value = true
  crewInviteAction.value = 'accept'
  try {
    const inviteId = await getCrewInviteId()
    if (!inviteId) {
      crewInviteLocalState.value = 'declined'
      return
    }
    await crewApi.acceptInvite(inviteId)
    crewInviteLocalState.value = 'accepted'
    localReadAt.value = new Date().toISOString()
    // Mark the underlying notification as read so the unread badge clears
    // (otherwise the bell would still bounce until next visit).
    void apiFetchData(`/notifications/${encodeURIComponent(notification.value.id)}/mark-read`, {
      method: 'POST',
    }).catch(() => {})
    pushToast({ title: 'Joined crew', tone: 'success' })
    // Refresh nav membership so the rail/tab label flips to "Your Crew" before
    // we navigate. Founding accepts make the inviter the owner; accepting an
    // invite into an existing crew makes the viewer a member — `/crew/me` has
    // the canonical role, so we just refetch.
    void viewerCrew.refresh()
    // Take them to their crew so they can post on the wall right away.
    void navigateTo('/crew')
  } catch (e: unknown) {
    const msg = (e as { data?: { meta?: { errors?: Array<{ message?: string }> } } })?.data?.meta?.errors?.[0]?.message
      ?? 'Could not accept invite.'
    pushToast({ title: msg, tone: 'error' })
  } finally {
    crewInviteInflight.value = false
    crewInviteAction.value = null
  }
}

async function onDeclineCrewInvite() {
  if (crewInviteInflight.value) return
  crewInviteInflight.value = true
  crewInviteAction.value = 'decline'
  try {
    const inviteId = await getCrewInviteId()
    if (!inviteId) {
      crewInviteLocalState.value = 'declined'
      return
    }
    await crewApi.declineInvite(inviteId)
    crewInviteLocalState.value = 'declined'
    localReadAt.value = new Date().toISOString()
    void apiFetchData(`/notifications/${encodeURIComponent(notification.value.id)}/mark-read`, {
      method: 'POST',
    }).catch(() => {})
    pushToast({ title: 'Invite declined', tone: 'success' })
  } catch (e: unknown) {
    const msg = (e as { data?: { meta?: { errors?: Array<{ message?: string }> } } })?.data?.meta?.errors?.[0]?.message
      ?? 'Could not decline invite.'
    pushToast({ title: msg, tone: 'error' })
  } finally {
    crewInviteInflight.value = false
    crewInviteAction.value = null
  }
}

// Community group invite (accept / decline directly from the row).
const groupInvitesApi = useGroupInvites()
const groupInviteInflight = ref(false)
const groupInviteAction = ref<'accept' | 'decline' | null>(null)
const groupInviteLocalState = ref<'accepted' | 'declined' | null>(null)

const groupInviteDisplayState = computed<
  'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
>(() => {
  if (groupInviteLocalState.value) return groupInviteLocalState.value
  const serverStatus = notification.value.subjectCommunityGroupInviteStatus ?? null
  if (serverStatus && serverStatus !== 'pending') return serverStatus
  return 'pending'
})

async function onAcceptGroupInvite() {
  if (groupInviteInflight.value) return
  const inviteId = notification.value.subjectCommunityGroupInviteId
  if (!inviteId) {
    groupInviteLocalState.value = 'declined'
    return
  }
  groupInviteInflight.value = true
  groupInviteAction.value = 'accept'
  try {
    const res = await groupInvitesApi.acceptInvite(inviteId)
    groupInviteLocalState.value = 'accepted'
    localReadAt.value = new Date().toISOString()
    void apiFetchData(`/notifications/${encodeURIComponent(notification.value.id)}/mark-read`, {
      method: 'POST',
    }).catch(() => {})
    pushToast({ title: 'Joined group', tone: 'success' })
    if (res?.groupSlug) {
      void navigateTo(`/g/${encodeURIComponent(res.groupSlug)}`)
    }
  } catch (e: unknown) {
    const msg = (e as { data?: { meta?: { errors?: Array<{ message?: string }> } } })?.data?.meta?.errors?.[0]?.message
      ?? 'Could not accept invite.'
    pushToast({ title: msg, tone: 'error' })
  } finally {
    groupInviteInflight.value = false
    groupInviteAction.value = null
  }
}

async function onDeclineGroupInvite() {
  if (groupInviteInflight.value) return
  const inviteId = notification.value.subjectCommunityGroupInviteId
  if (!inviteId) {
    groupInviteLocalState.value = 'declined'
    return
  }
  groupInviteInflight.value = true
  groupInviteAction.value = 'decline'
  try {
    await groupInvitesApi.declineInvite(inviteId)
    groupInviteLocalState.value = 'declined'
    localReadAt.value = new Date().toISOString()
    void apiFetchData(`/notifications/${encodeURIComponent(notification.value.id)}/mark-read`, {
      method: 'POST',
    }).catch(() => {})
    pushToast({ title: 'Invite declined', tone: 'success' })
  } catch (e: unknown) {
    const msg = (e as { data?: { meta?: { errors?: Array<{ message?: string }> } } })?.data?.meta?.errors?.[0]?.message
      ?? 'Could not decline invite.'
    pushToast({ title: msg, tone: 'error' })
  } finally {
    groupInviteInflight.value = false
    groupInviteAction.value = null
  }
}

async function onFollowBack() {
  const actorId = notification.value.actor?.id ?? null
  const username = notification.value.actor?.username ?? null
  if (!actorId || !username) return

  followInflight.value = true
  try {
    await followState.follow({ userId: actorId, username })
    followRel.value = { viewerFollowsUser: true, userFollowsViewer: true }
    localReadAt.value = new Date().toISOString()
    pushToast({ title: 'Followed', tone: 'success' })
  } finally {
    followInflight.value = false
  }
}
</script>

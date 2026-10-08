<template>
  <div class="relative transition-colors" :class="subjectTierRowClass(notification)">
    <div v-if="!notification.readAt" class="absolute inset-y-0 left-0 w-0.5" :class="activityBadgeTone" aria-hidden="true" />
    <div class="flex min-w-0 gap-3 px-4 py-4" :class="{ 'items-center': notification.kind === 'follow' }">
      <AppNotificationActors v-if="notification.kind === 'follow'" :actors="notification.actor ? [notification.actor] : []" :size="40" class="shrink-0" />
      <AppNotificationEventIcon v-else :kind="notification.kind" :actors="notification.actor ? [notification.actor] : []" />

      <!-- Center: main content -->
      <div class="min-w-0 flex-1">
        <AppNotificationActors v-if="notification.kind !== 'follow' && notificationShowsActor(notification.kind) && notification.actor" :actors="[notification.actor]" class="mb-2" />
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div class="min-w-0 flex-1">
            <!-- Title + quoted message: up to 2 lines with truncation -->
            <div class="min-w-0 max-w-full text-[15px] leading-snug moh-text">
              <span
                v-if="notification.boardThreadId"
                class="mr-1.5 inline-flex items-center gap-1 rounded-full border moh-border px-2 py-px align-[1px] text-[11px] font-semibold moh-text-muted"
              ><Icon name="tabler:layout-list" class="text-[10px]" aria-hidden="true" />Board</span>
              <span
                v-if="notificationShowsActor(notification.kind) && notification.actor"
                class="font-semibold"
                @mouseenter="onActorEnter"
                @mousemove="onActorMove"
                @mouseleave="onActorLeave"
              >{{ actorDisplay(notification) }}</span>
              <template v-if="notification.kind === 'comment'">
                <template v-if="notification.boardThreadId">
                  <span class="ml-1">{{ notification.title || 'commented on your Board post' }}</span>
                </template>
                <template v-else-if="notification.subjectArticleId">
                  <span class="ml-1">replied to your</span>
                  <span class="ml-1 font-semibold text-orange-600 dark:text-orange-400">article</span>
                </template>
                <template v-else>
                  <span class="ml-1">replied to your</span>
                  <span class="ml-1" :class="subjectPostVisibilityTextClass(notification)">post</span>
                </template>
              </template>
            <template v-else-if="notification.kind === 'boost' && notification.boardThreadId">
              <span class="ml-1">boosted your</span>
              <span class="ml-1" :class="subjectPostVisibilityTextClass(notification)">{{ notification.boardCommentId ? 'Board comment' : 'Board post' }}</span>
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
              <template v-else-if="notification.kind === 'word_of_the_day' || notification.kind === 'quote_of_the_day' || notification.kind === 'account_verified' || notification.kind === 'checkin_reminder' || notification.kind === 'on_this_day' || notification.kind === 'premium_started' || notification.kind === 'premium_ended' || notification.kind === 'space_reminder_day' || notification.kind === 'space_reminder_soon' || notification.kind === 'space_live' || notification.kind === 'space_schedule_cancelled' || notification.kind === 'space_schedule_rescheduled' || notification.kind === 'followed_space'">
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
              v-if="notification.body && notification.kind !== 'comment' && notification.kind !== 'mention' && notification.kind !== 'followed_article' && notification.kind !== 'boost' && notification.kind !== 'repost' && notification.kind !== 'poll_results_ready' && notification.kind !== 'status_update' && !isBoostOfStatus(notification)"
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
            <AppScriptureVerseCard v-if="scriptureReference" :reference="scriptureReference" class="mt-2" data-testid="notification-scripture" />
            <!-- Poll name chip -->
            <div
              v-if="notification.kind === 'poll_results_ready' && notification.body"
              class="mt-1.5 line-clamp-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[12px] sm:text-[13px] leading-snug text-gray-600 dark:border-zinc-700/70 dark:bg-zinc-800/60 dark:text-gray-300"
            >
              {{ notification.body }}
            </div>
            <div
              v-if="(notification.kind === 'repost' || notification.kind === 'boost') && !isBoostOfStatus(notification) && (notification.subjectPostPreview?.bodySnippet || notification.body)"
              class="mt-1 line-clamp-2 text-[15px] leading-snug moh-text-muted"
            >
              {{ notification.subjectPostPreview?.bodySnippet || notification.body }}
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
import { notificationScriptureReference, notificationShowsActor } from '~/utils/notification-presentation'
import type { Notification } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useNotificationRow } from '~/composables/notifications/useNotificationRow'

const props = defineProps<{ notification: Notification; nudgeIsTopmost?: boolean }>()

const {
  activityBadgeTone,
  actorDisplay,
  subjectPostVisibilityTextClass,
  subjectTierRowClass,
  titleSuffix,
  isBoostOfStatus,
  statusBoostText,
  boostSubjectNoun,
  formatWhen,
  formatWhenFull,
  parseBoldSegments,
  notification,
  onActorEnter,
  onActorMove,
  onActorLeave,
  onGroupEnter,
  onGroupMove,
  onGroupLeave,
  nudgeIsTopmost,
  notificationMediaPreviewKey,
  nudgeActionState,
  gotItNudgeTooltip,
  ignoreNudgeTooltip,
  canShowNudgeBack,
  nudgeInflight,
  ignoreInflight,
  nudgeMenuMounted,
  nudgeMenuRef,
  nudgeMenuItems,
  toggleNudgeMenu,
  followInflight,
  isFollowingActor,
  canFollowBack,
  onNudgeBack,
  crewInviteInflight,
  crewInviteAction,
  crewInviteDisplayState,
  onAcceptCrewInvite,
  onDeclineCrewInvite,
  groupInviteInflight,
  groupInviteAction,
  groupInviteDisplayState,
  onAcceptGroupInvite,
  onDeclineGroupInvite,
  onFollowBack,
} = useNotificationRow(props)
const scriptureReference = computed(() => notificationScriptureReference(props.notification))

</script>

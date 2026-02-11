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
            v-if="notification.actor?.id && notification.actor?.username"
            :to="`/u/${notification.actor.username}`"
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
          <AppUserAvatar
            v-else-if="notification.actor?.id"
            :user="{
              id: notification.actor.id,
              username: notification.actor.username,
              name: notification.actor.name,
              avatarUrl: notification.actor.avatarUrl,
            }"
            size-class="h-10 w-10"
          />
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
                  class="h-8 w-8 shrink-0 rounded border border-gray-200 object-cover dark:border-zinc-700 bg-black"
                  loading="lazy"
                >
              </template>
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
                class="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
                Got it
              </span>
              <span
                v-else-if="notification.ignoredAt || nudgeActionState === 'ignored'"
                class="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
                Ignored
              </span>
              <span
                v-else-if="notification.nudgedBackAt || nudgeActionState === 'nudged'"
                class="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
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
                        v-bind="props.label"
                        class="flex-1"
                        v-tooltip.bottom="
                          item.value === 'ignore'
                            ? tinyTooltip(ignoreNudgeTooltip)
                            : item.value === 'gotit'
                              ? tinyTooltip(gotItNudgeTooltip)
                              : undefined
                        "
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

            <div class="shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              <ClientOnly>
                <template #fallback>
                  <span aria-hidden="true">&nbsp;</span>
                </template>
                {{ formatWhen(notification.createdAt) }}
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { FollowSummaryResponse, Notification } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { MenuItem } from 'primevue/menuitem'

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

const props = defineProps<{ notification: Notification; nudgeIsTopmost?: boolean }>()
const localReadAt = ref<string | null>(null)
const notification = computed<Notification>(() => {
  if (!localReadAt.value) return props.notification
  return { ...props.notification, readAt: localReadAt.value }
})
const nudgeIsTopmost = computed(() => props.nudgeIsTopmost !== false)

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

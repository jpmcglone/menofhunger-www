<template>
  <div class="relative overflow-hidden rounded-2xl moh-popover moh-card-matte">
    <!-- Nudge overlay (top-right) -->
    <div v-if="showNudge" class="absolute top-3 right-3 z-20">
      <div
        v-if="nudgeState?.inboundPending"
        class="inline-flex overflow-hidden rounded-xl border moh-border"
        @click.stop.prevent
      >
        <Button
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
          class="!rounded-none !border-0 !px-2 !text-xs"
          aria-label="More nudge actions"
          aria-haspopup="true"
          :disabled="nudgeInflight || ignoreInflight"
          @click.stop.prevent="toggleNudgeMenu"
        >
          <template #icon>
            <Icon name="tabler:chevron-down" aria-hidden="true" />
          </template>
        </Button>
        <Menu ref="nudgeMenuRef" :model="nudgeMenuItems" popup>
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
      </div>
      <Button
        v-else
        size="small"
        :label="nudgePrimaryLabel"
        severity="secondary"
        rounded
        class="!text-xs"
        :disabled="nudgePrimaryDisabled"
        @click.stop.prevent="onNudgePrimary"
      />
    </div>

    <div class="relative">
      <div class="relative aspect-[3/1] w-full moh-surface">
        <img
          v-if="user.bannerUrl"
          :src="user.bannerUrl"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        >
      </div>

      <div class="absolute left-4 bottom-0 translate-y-1/2">
        <div :class="['ring-4 ring-[color:var(--moh-surface-3)]', avatarRoundClass]">
          <NuxtLink
            v-if="profilePath"
            :to="profilePath"
            :aria-label="`View @${user.username} profile`"
            :class="['block moh-focus', avatarRoundClass]"
            @click="onNavigate"
          >
            <AppUserAvatar
              :user="user"
              size-class="h-16 w-16"
              bg-class="moh-surface"
              :enable-preview="false"
              :presence-scale="0.22"
              :presence-inset-ratio="0.4"
            />
          </NuxtLink>
          <AppUserAvatar
            v-else
            :user="user"
            size-class="h-16 w-16"
            bg-class="moh-surface"
            :enable-preview="false"
            :presence-scale="0.22"
            :presence-inset-ratio="0.4"
          />
        </div>
      </div>
    </div>

    <div class="px-4 pb-4 pt-12">
      <!-- Online / last-online pill: right below the banner -->
      <div v-if="user.id && (showOnlineNow || showLastOnline)" class="flex justify-end -mt-10 mb-3">
        <div
          v-tooltip.bottom="showLastOnline ? tinyTooltip(lastOnlineTooltip) : undefined"
          class="rounded-full px-2 py-0.5 text-[11px] shadow-sm backdrop-blur-sm"
          :class="
            showOnlineNow
              ? 'bg-green-600/90 text-white dark:bg-green-500/20 dark:text-green-200'
              : 'bg-white/70 text-gray-600 dark:bg-black/60 dark:text-gray-400 tabular-nums'
          "
        >
          <template v-if="showOnlineNow">
            Online now
          </template>
          <template v-else>
            Last online {{ lastOnlineShort }}
          </template>
        </div>
      </div>

      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <NuxtLink
              v-if="profilePath"
              :to="profilePath"
              class="min-w-0 truncate hover:underline underline-offset-2 font-bold moh-text moh-focus"
              :aria-label="`View @${user.username} profile`"
              @click="onNavigate"
            >
              {{ displayName }}
            </NuxtLink>
            <div v-else class="min-w-0 font-bold moh-text truncate">
              {{ displayName }}
            </div>
            <AppVerifiedBadge
              :status="user.verifiedStatus"
              :premium="user.premium"
              :premium-plus="user.premiumPlus"
              :is-organization="user.isOrganization"
              :steward-badge-enabled="user.stewardBadgeEnabled ?? true"
            />
          </div>

          <NuxtLink
            v-if="profilePath"
            :to="profilePath"
            class="mt-0.5 block moh-meta truncate hover:underline underline-offset-2 moh-focus"
            :aria-label="`View @${user.username} profile`"
            @click="onNavigate"
          >
            @{{ user.username }}
          </NuxtLink>
          <div v-else class="mt-0.5 moh-meta truncate">
            @{{ user.username }}
          </div>
        </div>

        <div class="shrink-0 pt-0.5 flex flex-col items-end">
          <AppFollowButton
            v-if="user.id"
            size="small"
            :user-id="user.id"
            :username="user.username"
            :initial-relationship="user.relationship"
            @confirm-opened="pop.lock()"
            @confirm-closed="pop.unlock()"
          />
        </div>
      </div>

      <div
        v-if="user.bio"
        class="mt-3 moh-body whitespace-pre-wrap break-words max-h-[4.5rem] overflow-hidden"
      >
        {{ user.bio }}
      </div>

      <div
        v-if="typeof user.followingCount === 'number' && typeof user.followerCount === 'number'"
        class="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300"
      >
        <NuxtLink
          v-if="followingPath"
          :to="followingPath"
          class="tabular-nums hover:underline"
          aria-label="View following"
          @click="onNavigate"
        >
          <span class="font-semibold text-gray-900 dark:text-gray-50">{{ user.followingCount }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Following</span>
        </NuxtLink>
        <div v-else class="tabular-nums">
          <span class="font-semibold text-gray-900 dark:text-gray-50">{{ user.followingCount }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Following</span>
        </div>

        <NuxtLink
          v-if="followersPath"
          :to="followersPath"
          class="tabular-nums hover:underline"
          aria-label="View followers"
          @click="onNavigate"
        >
          <span class="font-semibold text-gray-900 dark:text-gray-50">{{ user.followerCount }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Followers</span>
        </NuxtLink>
        <div v-else class="tabular-nums">
          <span class="font-semibold text-gray-900 dark:text-gray-50">{{ user.followerCount }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Followers</span>
        </div>
      </div>

      <div v-if="canSendMessageFromPreview" class="mt-4">
        <Button
          label="Send message"
          :class="['w-full', messageButtonClass]"
          @click.stop.prevent="onSendMessage"
        >
          <template #icon>
            <Icon name="tabler:message-circle-2" aria-hidden="true" />
          </template>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LookupMessageConversationResponse, UserPreview } from '~/types/api'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { formatDateTime, formatListTime } from '~/utils/time-format'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { MenuItem } from 'primevue/menuitem'
import { avatarRoundClass as getAvatarRoundClass } from '~/utils/avatar-rounding'
import { userColorTier } from '~/utils/user-tier'

const props = defineProps<{
  user: UserPreview
}>()

const { user } = useUserOverlay(computed(() => props.user))

const avatarRoundClass = computed(() => getAvatarRoundClass(Boolean(user.value?.isOrganization)))

const { user: authUser } = useAuth()
const isAuthed = computed(() => Boolean(authUser.value?.id))
const isSelf = computed(() => Boolean(authUser.value?.id && user.value.id && authUser.value.id === user.value.id))
const viewerCanStartChats = computed(() => Boolean(authUser.value?.premium || authUser.value?.premiumPlus))
const previewUserFollowsViewer = computed(() => Boolean(user.value.relationship?.userFollowsViewer))
const viewerIsVerified = computed(() => (authUser.value?.verifiedStatus ?? 'none') !== 'none')
const previewUserIsVerified = computed(() => userColorTier(user.value) !== 'normal')

const { apiFetchData } = useApiClient()
const dmLookupCache = useState<Record<string, string | null>>('moh-dm-lookup-cache', () => ({}))
const dmLookupConversationId = ref<string | null>(null)
const dmLookupInflight = ref(false)

const shouldCheckExistingChat = computed(() => {
  if (!isAuthed.value) return false
  if (!viewerIsVerified.value) return false
  if (!previewUserIsVerified.value) return false
  if (isSelf.value) return false
  if (!user.value.id) return false
  // If viewer isn't premium, we need this to know whether to show the button at all.
  if (!viewerCanStartChats.value) return true
  // If viewer is premium AND the user doesn't follow them, this decides filled vs outline.
  if (!previewUserFollowsViewer.value) return true
  return false
})

watch(
  () => [shouldCheckExistingChat.value, user.value.id] as const,
  async ([shouldCheck, userId]) => {
    dmLookupConversationId.value = null
    if (!shouldCheck || !userId) return

    const cached = dmLookupCache.value[userId]
    if (cached !== undefined) {
      dmLookupConversationId.value = cached
      return
    }

    dmLookupInflight.value = true
    try {
      const res = await apiFetchData<LookupMessageConversationResponse['data']>('/messages/lookup', {
        method: 'POST',
        body: { user_ids: [userId] },
      })
      const convoId = res?.conversationId ?? null
      dmLookupCache.value = { ...dmLookupCache.value, [userId]: convoId }
      dmLookupConversationId.value = convoId
    } catch {
      // Best-effort: treat as unknown/no chat.
      dmLookupConversationId.value = null
    } finally {
      dmLookupInflight.value = false
    }
  },
  { immediate: true },
)

const hasExistingChat = computed(() => Boolean(dmLookupConversationId.value))

const canSendMessageFromPreview = computed(() => {
  if (!isAuthed.value) return false
  if (!viewerIsVerified.value) return false
  if (!previewUserIsVerified.value) return false
  if (isSelf.value) return false
  if (!user.value.id || !user.value.username) return false
  // Premium can always start new chats; non-premium needs an existing conversation.
  if (viewerCanStartChats.value) return true
  return hasExistingChat.value
})

const isMutualFollow = computed(() => {
  const rel = user.value.relationship
  return Boolean(rel?.viewerFollowsUser && rel?.userFollowsViewer)
})

const showNudge = computed(() => {
  if (!isAuthed.value) return false
  if (isSelf.value) return false
  if (!user.value.id || !user.value.username) return false
  return isMutualFollow.value
})

const nudgeState = ref(user.value.nudge ?? null)
watch(
  () => user.value.nudge ?? null,
  (next) => {
    nudgeState.value = next ?? null
  },
  { immediate: true },
)

const nudgeInflight = ref(false)
const ignoreInflight = ref(false)
const { nudgeUser, ackNudge, ignoreNudge, markNudgeNudgedBackById } = useNudge()
const { push: pushToast } = useAppToast()

const nudgePrimaryLabel = computed(() => {
  const s = nudgeState.value
  if (s?.inboundPending) return 'Nudge back'
  if (s?.outboundPending) return 'Nudged'
  return 'Nudge'
})

const nudgePrimaryDisabled = computed(() => {
  const s = nudgeState.value
  if (nudgeInflight.value) return true
  if (s?.outboundPending && !s?.inboundPending) return true
  return false
})

type MenuItemWithIcon = MenuItem & { iconName?: string; value?: 'gotit' | 'ignore' }
const gotItNudgeTooltip = 'Accepts the nudge. They can nudge you again without you nudging back.'
const ignoreNudgeTooltip = 'Dismisses it, but they still can’t nudge you again for 24 hours (unless you nudge them back).'
const nudgeMenuRef = ref<{ toggle: (event: Event) => void } | null>(null)
const nudgeMenuItems = computed<MenuItemWithIcon[]>(() => [
  {
    label: 'Got it',
    iconName: 'tabler:check',
    value: 'gotit',
    command: () => void onNudgeGotIt(),
  },
  {
    label: 'Ignore',
    iconName: 'tabler:ban',
    value: 'ignore',
    command: () => void onNudgeIgnore(),
  },
])

function toggleNudgeMenu(event: Event) {
  nudgeMenuRef.value?.toggle(event)
}

async function onNudgeGotIt() {
  const id = nudgeState.value?.inboundNotificationId ?? null
  if (!id) return
  ignoreInflight.value = true
  try {
    await ackNudge(id, { username: user.value.username ?? null })
    nudgeState.value = {
      outboundPending: Boolean(nudgeState.value?.outboundPending),
      inboundPending: false,
      inboundNotificationId: null,
      outboundExpiresAt: nudgeState.value?.outboundExpiresAt ?? null,
    }
    pushToast({ title: 'Got it', tone: 'success' })
  } finally {
    ignoreInflight.value = false
  }
}

async function onNudgeIgnore() {
  const id = nudgeState.value?.inboundNotificationId ?? null
  if (!id) return
  ignoreInflight.value = true
  try {
    await ignoreNudge(id, { username: user.value.username ?? null })
    nudgeState.value = {
      outboundPending: Boolean(nudgeState.value?.outboundPending),
      inboundPending: false,
      inboundNotificationId: null,
      outboundExpiresAt: nudgeState.value?.outboundExpiresAt ?? null,
    }
    pushToast({ title: 'Ignored', tone: 'success' })
  } finally {
    ignoreInflight.value = false
  }
}

async function onNudgeBack() {
  const username = user.value.username ?? null
  const inboundId = nudgeState.value?.inboundNotificationId ?? null
  if (!username || !inboundId) return

  nudgeInflight.value = true
  try {
    await markNudgeNudgedBackById(inboundId, { username }).catch(() => {})
    const res = await nudgeUser(username)
    nudgeState.value = {
      outboundPending: true,
      inboundPending: false,
      inboundNotificationId: null,
      outboundExpiresAt: res.nextAllowedAt ?? null,
    }
    pushToast({ title: 'Nudged back', tone: 'success' })
  } finally {
    nudgeInflight.value = false
  }
}

async function onNudgePrimary() {
  const username = user.value.username ?? null
  if (!username) return

  nudgeInflight.value = true
  try {
    const res = await nudgeUser(username)
    nudgeState.value = {
      outboundPending: true,
      inboundPending: false,
      inboundNotificationId: null,
      outboundExpiresAt: res.nextAllowedAt ?? null,
    }
  } finally {
    nudgeInflight.value = false
  }
}

const { addInterest, removeInterest, getPresenceStatus, isPresenceKnown } = usePresence()
const lastUserId = ref<string | null>(null)
watch(
  () => user.value.id ?? null,
  (nextId) => {
    if (!import.meta.client) return
    const prev = lastUserId.value
    if (prev && prev !== nextId) removeInterest([prev])
    lastUserId.value = nextId ?? null
    if (nextId) addInterest([nextId])
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  const id = lastUserId.value
  if (id) removeInterest([id])
})

const presenceStatus = computed(() => {
  const id = user.value.id
  if (!id) return 'offline'
  return getPresenceStatus(id)
})
const showOnlineNow = computed(() => presenceStatus.value !== 'offline')

const viewerCanSeeLastOnline = computed(() => {
  const status = authUser.value?.verifiedStatus ?? 'none'
  return Boolean(authUser.value?.siteAdmin) || (typeof status === 'string' && status !== 'none')
})

const showLastOnline = computed(() => {
  if (!viewerCanSeeLastOnline.value) return false
  if (presenceStatus.value !== 'offline') return false
  if (!user.value.id || !isPresenceKnown(user.value.id)) return false
  return Boolean(user.value.lastOnlineAt)
})
const lastOnlineShort = computed(() => {
  const iso = user.value.lastOnlineAt ?? null
  const t = formatListTime(iso)
  if (t === 'now') return '<1m ago'
  if (/^\d+[mhd]$/.test(t)) return `${t} ago`
  return t
})
const lastOnlineTooltip = computed(() => {
  const iso = user.value.lastOnlineAt ?? null
  if (!iso) return null
  return formatDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' })
})

const profilePath = computed(() => {
  const u = (user.value.username ?? '').trim()
  return u ? `/u/${encodeURIComponent(u)}` : null
})
const followersPath = computed(() => (profilePath.value ? `${profilePath.value}/followers` : null))
const followingPath = computed(() => (profilePath.value ? `${profilePath.value}/following` : null))

const displayName = computed(() => {
  const nm = (user.value.name ?? '').trim()
  if (nm) return nm
  const un = (user.value.username ?? '').trim()
  return un ? `@${un}` : 'User'
})

const pop = useUserPreviewPopover()
function onNavigate() {
  pop.close()
}

const VERIFIED_BLUE = '#2b7bb9'
const PREMIUM_ORANGE = '#c77d1a'

const messageTier = computed(() => userColorTier(user.value))
const messageFilledButtonClass = computed(() => {
  const tier = messageTier.value
  // Orgs are silver: use same treatment as org chat bubbles.
  if (tier === 'organization') return '!border-[#313643] !bg-[#313643] !text-white hover:opacity-95'
  // Use fixed colors so org viewer theme can't override target tier.
  if (tier === 'premium') return `!border-[${PREMIUM_ORANGE}] !bg-[${PREMIUM_ORANGE}] !text-white hover:opacity-95`
  if (tier === 'verified') return `!border-[${VERIFIED_BLUE}] !bg-[${VERIFIED_BLUE}] !text-white hover:opacity-95`
  return '!border-gray-900 !bg-gray-900 !text-white hover:opacity-95 dark:!border-white dark:!bg-white dark:!text-gray-900'
})

const messageOutlineButtonClass = computed(() => {
  const tier = messageTier.value
  if (tier === 'organization') {
    return '!bg-transparent !border-[#313643] !text-[#313643] hover:!bg-[rgba(49,54,67,0.08)] dark:hover:!bg-[rgba(49,54,67,0.18)]'
  }
  if (tier === 'premium') {
    return `!bg-transparent !border-[${PREMIUM_ORANGE}] !text-[${PREMIUM_ORANGE}] hover:!bg-[rgba(199,125,26,0.08)] dark:hover:!bg-[rgba(199,125,26,0.16)]`
  }
  if (tier === 'verified') {
    return `!bg-transparent !border-[${VERIFIED_BLUE}] !text-[${VERIFIED_BLUE}] hover:!bg-[rgba(43,123,185,0.08)] dark:hover:!bg-[rgba(43,123,185,0.16)]`
  }
  return '!bg-transparent !border-gray-900 !text-gray-900 hover:!bg-gray-900/5 dark:!border-gray-200 dark:!text-gray-200 dark:hover:!bg-white/10'
})

const messageButtonClass = computed(() => {
  // Filled when:
  // - they follow you OR
  // - you already have a chat together
  // Outline only when:
  // - they don't follow you AND
  // - you don't already have a chat
  if (hasExistingChat.value) return messageFilledButtonClass.value
  return previewUserFollowsViewer.value ? messageFilledButtonClass.value : messageOutlineButtonClass.value
})

function onSendMessage() {
  const username = (user.value.username ?? '').trim()
  const userId = user.value.id ?? null
  if (!username || !userId) return
  pop.close()
  void (async () => {
    // If we already know there's a conversation, deep-link directly to it (avoids the extra URL hop).
    const cached = dmLookupCache.value[userId]
    let conversationId: string | null = dmLookupConversationId.value ?? (cached !== undefined ? cached : null)

    // If we haven't checked yet, do a quick lookup on click.
    if (conversationId === null && cached === undefined && !dmLookupInflight.value) {
      try {
        const res = await apiFetchData<LookupMessageConversationResponse['data']>('/messages/lookup', {
          method: 'POST',
          body: { user_ids: [userId] },
        })
        conversationId = res?.conversationId ?? null
        dmLookupCache.value = { ...dmLookupCache.value, [userId]: conversationId }
        dmLookupConversationId.value = conversationId
      } catch {
        // ignore
      }
    }

    if (conversationId) {
      await navigateTo({ path: '/chat', query: { c: conversationId } })
      return
    }
    await navigateTo({ path: '/chat', query: { to: username } })
  })()
}
</script>


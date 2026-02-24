<template>
  <div>
    <!-- Full-bleed profile header (cancel app layout padding) -->
    <div class="relative">
      <div class="group relative aspect-[3.25/1] w-full bg-gray-200 dark:bg-zinc-900">
        <img
          v-if="profileBannerUrl"
          v-show="!hideBannerThumb"
          :src="profileBannerUrl"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        >
        <div
          v-if="profileBannerUrl"
          v-show="!hideBannerThumb"
          class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
          aria-hidden="true"
        />
        <button
          v-if="profileBannerUrl"
          v-show="!hideBannerThumb"
          type="button"
          class="absolute inset-0 cursor-zoom-in"
          aria-label="View banner"
          @click="emit('openImage', { event: $event, url: profileBannerUrl, title: 'Banner', kind: 'banner' })"
        />
        <div
          v-if="showOnlineNow || showLastOnline"
          v-tooltip.bottom="showLastOnline ? tinyTooltip(lastOnlineTooltip) : undefined"
          class="absolute right-4 bottom-0 translate-y-[36px] rounded-full px-2 py-0.5 text-[11px] shadow-sm backdrop-blur-sm"
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
        <!-- Nudge overlay (top-right), fully inside banner with consistent margin -->
        <div v-if="showNudge" class="pointer-events-none absolute inset-4 z-20 flex justify-end">
          <div class="pointer-events-auto">
            <!-- Nudge back split-button (primary action + caret menu) -->
            <div
              v-if="nudgeState?.inboundPending"
              class="inline-flex overflow-hidden rounded-xl border moh-border"
            >
              <Button
                label="Nudge back"
                size="small"
                severity="secondary"
                class="!rounded-none !border-0 !text-xs"
                :disabled="nudgeInflight || ignoreInflight"
                @click="onNudgeBack"
              />
              <Button
                type="button"
                size="small"
                severity="secondary"
                class="!rounded-none !border-0 !px-2 !text-xs"
                aria-label="More nudge actions"
                aria-haspopup="true"
                :disabled="nudgeInflight || ignoreInflight"
                @click="toggleNudgeMenu"
              >
                <template #icon>
                  <Icon name="tabler:chevron-down" aria-hidden="true" />
                </template>
              </Button>
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
            </div>

            <!-- Default nudge button (no inbound pending) -->
            <Button
              v-else
              :label="nudgePrimaryLabel"
              size="small"
              severity="secondary"
              rounded
              class="!text-xs"
              :disabled="nudgePrimaryDisabled"
              @click="onNudgePrimary"
            />
          </div>
        </div>
      </div>

      <div
        :class="[
          'absolute left-4 bottom-0 translate-y-1/2 transition-opacity duration-200',
          hideAvatarDuringBanner ? 'opacity-0 pointer-events-none' : 'opacity-100'
        ]"
      >
        <div
          :class="[
            'group relative ring-4 ring-white dark:ring-black',
            avatarRoundClass
          ]"
        >
          <AppUserAvatar
            v-show="!hideAvatarThumb"
            :user="profile"
            size-class="h-24 w-24"
            bg-class="bg-gray-200 dark:bg-zinc-800"
            :presence-scale="0.15"
            :presence-inset-ratio="0.25"
          />
          <div
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            :class="[
              'pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20',
              avatarRoundClass
            ]"
            aria-hidden="true"
          />
          <button
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            type="button"
            class="absolute inset-0 cursor-zoom-in"
            aria-label="View avatar"
            @click="
              emit('openImage', {
                event: $event,
                url: profileAvatarUrl,
                title: 'Avatar',
                kind: 'avatar',
                isOrganization: Boolean(profile?.isOrganization),
              })
            "
          />
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-3xl px-4 pb-5 pt-14">
      <div class="flex items-start justify-between gap-4 mt-1">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="text-xl font-bold leading-none text-gray-900 dark:text-gray-50 truncate">
              {{ profileName }}
            </div>
            <AppVerifiedBadge
              :status="profile?.verifiedStatus"
              :premium="profile?.premium"
              :premium-plus="profile?.premiumPlus"
              :is-organization="profile?.isOrganization"
              :steward-badge-enabled="profile?.stewardBadgeEnabled ?? true"
            />
          </div>
          <div class="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <div class="truncate">
              @{{ profile?.username }}
            </div>
            <span
              v-if="relationshipTagLabel"
              class="shrink-0 inline-flex items-center rounded-md bg-gray-200/70 px-2.5 py-1 text-[10px] font-semibold leading-none text-gray-800 dark:bg-zinc-800/80 dark:text-zinc-200"
            >
              {{ relationshipTagLabel }}
            </span>
          </div>
        </div>

        <div class="shrink-0 flex items-center gap-2">
          <Button
            v-if="isSelf"
            label="Edit profile"
            severity="secondary"
            rounded
            :class="showEditProfileNudge ? ['moh-edit-profile-nudge', editProfileNudgeToneClass] : ''"
            @click="emit('edit')"
          >
            <template #icon>
              <Icon name="tabler:pencil" aria-hidden="true" />
            </template>
          </Button>
          <Button
            v-if="showChatButton"
            type="button"
            severity="secondary"
            rounded
            text
            class="!px-2"
            aria-label="Send message"
            v-tooltip.bottom="tinyTooltip('Message')"
            @click="onChatClick"
          >
            <template #icon>
              <Icon name="tabler:message-circle-2" aria-hidden="true" />
            </template>
          </Button>
          <Button
            v-if="showPostBell"
            type="button"
            severity="secondary"
            rounded
            text
            class="!px-2"
            :disabled="bellInflight"
            :aria-label="bellEnabled ? 'Disable post notifications' : 'Enable post notifications'"
            v-tooltip.bottom="tinyTooltip(bellEnabled ? 'Post notifications on' : 'Post notifications off')"
            @click="togglePostBell"
          >
            <template #icon>
              <Icon
                :name="bellEnabled ? 'tabler:bell-filled' : 'tabler:bell'"
                :class="bellEnabled ? bellEnabledIconClass : ''"
                aria-hidden="true"
              />
            </template>
          </Button>
          <AppFollowButton
            v-else-if="isAuthed && profile?.id"
            :user-id="profile.id"
            :username="profile.username"
            :initial-relationship="followRelationship"
            @followed="emit('followed')"
            @unfollowed="emit('unfollowed')"
          />
          <Button
            v-if="canOpenMenu"
            type="button"
            severity="secondary"
            rounded
            text
            aria-label="More"
            @click="toggleMenu"
          >
            <template #icon>
              <Icon name="tabler:dots-vertical" aria-hidden="true" />
            </template>
          </Button>
        </div>
      </div>

      <div v-if="showFollowCounts" class="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        <button type="button" class="cursor-pointer hover:underline" @click="emit('openFollowing')">
          <span class="font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{{ followingCount ?? 0 }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Following</span>
        </button>
        <button type="button" class="cursor-pointer hover:underline" @click="emit('openFollowers')">
          <span class="font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{{ followerCountN }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">{{ followerLabel }}</span>
        </button>
      </div>

      <div v-if="profile?.bio" class="mt-4 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
        {{ profile.bio }}
      </div>
      <div v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        No bio yet.
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
        <div v-if="locationLabel" class="inline-flex items-center gap-1.5 min-w-0">
          <Icon name="tabler:map-pin" class="shrink-0" aria-hidden="true" />
          <span class="truncate">{{ locationLabel }}</span>
        </div>

        <a
          v-if="websiteHref"
          :href="websiteHref"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="inline-flex items-center gap-1.5 min-w-0 hover:underline"
        >
          <Icon name="tabler:link" class="shrink-0" aria-hidden="true" />
          <span class="truncate max-w-[18rem]">{{ websiteLabel }}</span>
        </a>

        <div v-if="birthdayLabel" class="inline-flex items-center gap-1.5 min-w-0">
          <Icon name="tabler:cake" class="shrink-0" aria-hidden="true" />
          <span class="truncate">Born {{ birthdayLabel }}</span>
        </div>

        <div v-if="joinedLabel" class="inline-flex items-center gap-1.5 min-w-0">
          <Icon name="tabler:calendar" class="shrink-0" aria-hidden="true" />
          <span class="truncate">Joined {{ joinedLabel }}</span>
        </div>
      </div>
    </div>
  </div>

  <Menu v-if="canOpenMenu" ref="menuRef" :model="menuItems" popup>
    <template #item="{ item, props }">
      <a v-bind="props.action" class="flex items-center gap-2">
        <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
        <span v-bind="props.label">{{ item.label }}</span>
      </a>
    </template>
  </Menu>

  <AppReportDialog
    v-model:visible="reportOpen"
    target-type="user"
    :subject-user-id="profile?.id ?? null"
    :subject-label="profile?.username ? `@${profile.username}` : 'User'"
    @submitted="onReportSubmitted"
  />

  <Dialog
    v-model:visible="blockConfirmVisible"
    modal
    :header="viewerHasBlockedProfile ? `Unblock ${profileBlockHandle}?` : `Block ${profileBlockHandle}?`"
    :style="{ width: '28rem', maxWidth: '92vw' }"
  >
    <div class="text-sm text-gray-700 dark:text-gray-300">
      <template v-if="viewerHasBlockedProfile">
        They'll be able to see your posts and engage with them again.
      </template>
      <template v-else>
        They can still view your posts but won't be able to engage with them.
      </template>
    </div>
    <template #footer>
      <Button label="Cancel" text severity="secondary" @click="blockConfirmVisible = false" />
      <Button
        :label="blockingProfile ? (viewerHasBlockedProfile ? 'Unblocking…' : 'Blocking…') : (viewerHasBlockedProfile ? 'Unblock' : 'Block')"
        :severity="viewerHasBlockedProfile ? 'secondary' : 'danger'"
        :disabled="blockingProfile"
        @click="confirmBlock"
      />
    </template>
  </Dialog>

  <Dialog
    v-model:visible="startChatInfoVisible"
    modal
    header="Starting new chats"
    :style="{ width: '28rem', maxWidth: '92vw' }"
  >
    <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
      <p>
        To start new chats yourself, upgrade to Premium.
      </p>
    </div>
    <template #footer>
      <Button label="Not now" text severity="secondary" @click="startChatInfoVisible = false" />
      <Button label="View tiers" severity="secondary" @click="goPremium" />
      <Button
        label="Get Premium"
        class="!border-[var(--moh-premium)] !bg-[var(--moh-premium)] !text-white hover:opacity-95"
        @click="goBilling"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import AppImg from '~/components/app/AppImg.vue'
import type { FollowRelationship, NudgeState, PublicProfile } from '~/types/api'
import { formatDateTime, formatListTime } from '~/utils/time-format'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { MenuItem } from 'primevue/menuitem'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { avatarRoundClass as getAvatarRoundClass } from '~/utils/avatar-rounding'
import { userColorTier } from '~/utils/user-tier'
import { PRIMARY_PREMIUM_ORANGE, PRIMARY_VERIFIED_BLUE } from '~/utils/theme-tint'

const props = defineProps<{
  profile: PublicProfile | null
  profileName: string
  profileAvatarUrl: string | null
  profileBannerUrl: string | null
  hideBannerThumb: boolean
  hideAvatarThumb: boolean
  hideAvatarDuringBanner: boolean
  relationshipTagLabel: string | null
  isSelf: boolean
  followRelationship: FollowRelationship | null
  nudge: NudgeState | null
  showFollowCounts: boolean
  followerCount: number | null
  followingCount: number | null
}>()

const emit = defineEmits<{
  (
    e: 'openImage',
    payload: { event: MouseEvent; url: string; title: string; kind: 'avatar' | 'banner'; isOrganization?: boolean },
  ): void
  (e: 'edit'): void
  (e: 'followed'): void
  (e: 'unfollowed'): void
  (e: 'openFollowers'): void
  (e: 'openFollowing'): void
  (e: 'nudge-updated', payload: NudgeState | null): void
}>()

const { user: profile } = useUserOverlay(computed(() => props.profile ?? null))
const avatarRoundClass = computed(() => getAvatarRoundClass(Boolean(profile.value?.isOrganization)))
const profileName = computed(() => props.profileName)
const profileAvatarUrl = computed(() => props.profileAvatarUrl ?? null)
const profileBannerUrl = computed(() => props.profileBannerUrl ?? null)
const hasAvatar = computed(() => Boolean((profileAvatarUrl.value ?? '').trim()))
const hasBanner = computed(() => Boolean((profileBannerUrl.value ?? '').trim()))
const relationshipTagLabel = computed(() => props.relationshipTagLabel ?? null)
const isSelf = computed(() => Boolean(props.isSelf))
const showEditProfileNudge = computed(() => isSelf.value && !hasAvatar.value && !hasBanner.value)
const editProfileNudgeToneClass = computed(() => {
  const p = profile.value
  if (p?.premium || p?.premiumPlus) return 'moh-edit-profile-nudge--premium'
  if (p?.verifiedStatus && p.verifiedStatus !== 'none') return 'moh-edit-profile-nudge--verified'
  return 'moh-edit-profile-nudge--normal'
})
const followState = useFollowState()
const followRelationship = computed(() => {
  const id = profile.value?.id ?? null
  if (id) return followState.get(id) ?? props.followRelationship ?? null
  return props.followRelationship ?? null
})
const nudgeFromProps = computed(() => props.nudge ?? null)
const showFollowCounts = computed(() => Boolean(props.showFollowCounts))
const followerCount = computed(() => props.followerCount ?? null)
const followingCount = computed(() => props.followingCount ?? null)
const hideBannerThumb = computed(() => Boolean(props.hideBannerThumb))
const hideAvatarThumb = computed(() => Boolean(props.hideAvatarThumb))
const hideAvatarDuringBanner = computed(() => Boolean(props.hideAvatarDuringBanner))

const followerCountN = computed(() => Math.max(0, Math.floor(props.followerCount ?? 0)))
const followerLabel = computed(() => (followerCountN.value === 1 ? 'Follower' : 'Followers'))

const { user: authUser } = useAuth()
const isAuthed = computed(() => Boolean(authUser.value?.id))
const viewerCanStartChats = computed(() => Boolean(authUser.value?.premium || authUser.value?.premiumPlus))
const viewerIsVerified = computed(() => (authUser.value?.verifiedStatus ?? 'none') !== 'none')

const locationLabel = computed(() => {
  const s = (profile.value as any)?.locationDisplay ?? null
  const v = typeof s === 'string' ? s.trim() : ''
  return v ? v : null
})

const websiteHref = computed(() => {
  const s = (profile.value as any)?.website ?? null
  const v = typeof s === 'string' ? s.trim() : ''
  return v ? v : null
})

const websiteLabel = computed(() => {
  const href = websiteHref.value
  if (!href) return ''
  try {
    const u = new URL(href)
    const host = u.hostname
    const path = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : ''
    return `${host}${path}`
  } catch {
    return href
  }
})

const birthdayLabel = computed(() => {
  const display = (profile.value as any)?.birthdayDisplay ?? null
  const displayV = typeof display === 'string' ? display.trim() : ''
  if (displayV) return displayV
  const s = (profile.value as any)?.birthdayMonthDay ?? null
  const v = typeof s === 'string' ? s.trim() : ''
  return v ? v : null
})

const joinedLabel = computed(() => {
  const raw = (profile.value as any)?.createdAt ?? null
  if (!raw) return null
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const viewerFollowsUser = computed(() => Boolean(followRelationship.value?.viewerFollowsUser))
const bellEnabled = computed(() => Boolean(followRelationship.value?.viewerPostNotificationsEnabled))
const showPostBell = computed(() => {
  if (!isAuthed.value) return false
  if (isSelf.value) return false
  if (!profile.value?.id || !profile.value?.username) return false
  return viewerFollowsUser.value
})

const profileTier = computed(() => userColorTier(profile.value))
const bellEnabledIconClass = computed(() => {
  if (!bellEnabled.value) return ''
  const tier = profileTier.value
  // Orgs are silver.
  if (tier === 'organization') return '!text-[#313643]'
  // Use fixed colors so org viewer theme can't override target tier.
  if (tier === 'premium') return `!text-[${PRIMARY_PREMIUM_ORANGE[500]}]`
  if (tier === 'verified') return `!text-[${PRIMARY_VERIFIED_BLUE[500]}]`
  // Normal: neutral foreground
  return '!text-gray-900 dark:!text-gray-50'
})

const bellInflight = computed(() => Boolean(followState.inflight.value[`follow-bell:${profile.value?.id ?? ''}`]))
async function togglePostBell() {
  const id = profile.value?.id ?? null
  const username = profile.value?.username ?? null
  if (!id || !username) return
  await followState.setPostNotificationsEnabled({ userId: id, username, enabled: !bellEnabled.value })
}

const showChatButton = computed(() => {
  if (!isAuthed.value) return false
  if (!viewerIsVerified.value) return false
  if (isSelf.value) return false
  if (!profile.value?.username) return false
  // Can't start chats with unverified accounts.
  if (userColorTier(profile.value) === 'normal') return false
  return true
})

const startChatInfoVisible = ref(false)
function goPremium() {
  return navigateTo('/tiers')
}
function goBilling() {
  return navigateTo('/settings/billing')
}
function onChatClick() {
  const username = (profile.value?.username ?? '').trim()
  if (!username) return
  if (!viewerCanStartChats.value) {
    startChatInfoVisible.value = true
    return
  }
  void navigateTo({ path: '/chat', query: { to: username } })
}

const isMutualFollow = computed(() => {
  const rel = followRelationship.value
  if (!rel) return false
  return Boolean(rel.viewerFollowsUser && rel.userFollowsViewer)
})

const showNudge = computed(() => {
  if (!isAuthed.value) return false
  if (isSelf.value) return false
  if (!profile.value?.id || !profile.value?.username) return false
  return isMutualFollow.value
})

const nudgeState = ref<NudgeState | null>(nudgeFromProps.value)
watch(
  nudgeFromProps,
  (next) => {
    nudgeState.value = next ?? null
  },
  { immediate: true },
)

const nudgeInflight = ref(false)
const ignoreInflight = ref(false)
const { nudgeUser, ackNudge, ignoreNudge, markNudgeNudgedBackById } = useNudge()
const { push: pushToast } = useAppToast()

const gotItNudgeTooltip = 'Accepts the nudge. They can nudge you again without you nudging back.'
const ignoreNudgeTooltip = 'Dismisses it, but they still can’t nudge you again for 24 hours (unless you nudge them back).'

const nudgePrimaryLabel = computed(() => {
  const s = nudgeState.value
  if (s?.inboundPending) return 'Nudge back'
  if (s?.outboundPending) return 'Nudged'
  return 'Nudge'
})

const nudgePrimaryDisabled = computed(() => {
  const s = nudgeState.value
  if (nudgeInflight.value) return true
  // Block repeated sends when outbound is pending (unless this is a “nudge back” state).
  if (s?.outboundPending && !s?.inboundPending) return true
  return false
})

type MenuItemWithIcon = MenuItem & { iconName?: string; value?: 'gotit' | 'ignore' }
const nudgeMenuMounted = ref(false)
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

async function toggleNudgeMenu(event: Event) {
  nudgeMenuMounted.value = true
  await nextTick()
  nudgeMenuRef.value?.toggle(event)
}

async function onNudgeGotIt() {
  const id = nudgeState.value?.inboundNotificationId ?? null
  if (!id) return
  ignoreInflight.value = true
  try {
    await ackNudge(id, { username: profile.value?.username ?? null })
    nudgeState.value = {
      outboundPending: Boolean(nudgeState.value?.outboundPending),
      inboundPending: false,
      inboundNotificationId: null,
      outboundExpiresAt: nudgeState.value?.outboundExpiresAt ?? null,
    }
    emit('nudge-updated', nudgeState.value)
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
    await ignoreNudge(id, { username: profile.value?.username ?? null })
    nudgeState.value = {
      outboundPending: Boolean(nudgeState.value?.outboundPending),
      inboundPending: false,
      inboundNotificationId: null,
      outboundExpiresAt: nudgeState.value?.outboundExpiresAt ?? null,
    }
    emit('nudge-updated', nudgeState.value)
    pushToast({ title: 'Ignored', tone: 'success' })
  } finally {
    ignoreInflight.value = false
  }
}

async function onNudgeBack() {
  const username = profile.value?.username ?? null
  const inboundId = nudgeState.value?.inboundNotificationId ?? null
  if (!username || !inboundId) return

  nudgeInflight.value = true
  try {
    // Mark "nudged back" on the inbound notification (best-effort), then send our nudge.
    await markNudgeNudgedBackById(inboundId, { username }).catch(() => {})
    const res = await nudgeUser(username)
    nudgeState.value = {
      outboundPending: true,
      inboundPending: false,
      inboundNotificationId: null,
      outboundExpiresAt: res.nextAllowedAt ?? null,
    }
    emit('nudge-updated', nudgeState.value)
    pushToast({ title: 'Nudged back', tone: 'success' })
  } finally {
    nudgeInflight.value = false
  }
}

async function onNudgePrimary() {
  const username = profile.value?.username ?? null
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
    emit('nudge-updated', nudgeState.value)
  } finally {
    nudgeInflight.value = false
  }
}

const canOpenMenu = computed(() => {
  if (!isAuthed.value) return false
  if (isSelf.value) return false
  return Boolean(profile.value?.id)
})

const reportOpen = ref(false)
const menuRef = ref()

const blockState = useBlockState()
const toast = useAppToast()

const viewerHasBlockedProfile = computed(() =>
  Boolean(profile.value?.viewerHasBlockedUser) || blockState.isBlockedByMe(profile.value?.id ?? ''),
)
const profileBlockHandle = computed(() => {
  const u = profile.value?.username
  return u ? `@${u}` : 'this user'
})

const blockConfirmVisible = ref(false)
const blockingProfile = ref(false)

async function confirmBlock() {
  if (blockingProfile.value || !profile.value?.id) return
  blockingProfile.value = true
  try {
    if (viewerHasBlockedProfile.value) {
      await blockState.unblockUser(profile.value.id)
      toast.push({ title: `${profileBlockHandle.value} unblocked`, message: 'You can now engage with their posts.', tone: 'success', durationMs: 3000 })
    } else {
      await blockState.blockUser(profile.value.id)
      toast.push({ title: `${profileBlockHandle.value} blocked`, message: "They can still see your posts but can't engage with them.", tone: 'success', durationMs: 3000 })
    }
    blockConfirmVisible.value = false
  } catch (e: unknown) {
    toast.pushError(e, viewerHasBlockedProfile.value ? 'Failed to unblock.' : 'Failed to block.')
  } finally {
    blockingProfile.value = false
  }
}

const menuItems = computed<MenuItemWithIcon[]>(() => {
  if (!canOpenMenu.value) return []
  const items: MenuItemWithIcon[] = [
    {
      label: 'Report user',
      iconName: 'tabler:flag',
      command: () => {
        reportOpen.value = true
      },
    },
    {
      label: viewerHasBlockedProfile.value ? 'Unblock user' : 'Block user',
      iconName: viewerHasBlockedProfile.value ? 'tabler:ban-off' : 'tabler:ban',
      command: () => {
        blockConfirmVisible.value = true
      },
    },
  ]
  return items
})

function toggleMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(menuRef.value as any)?.toggle(event)
}

function onReportSubmitted() {
  // toast + close handled in dialog
}

const { addInterest, removeInterest, getPresenceStatus, isPresenceKnown } = usePresence()
const lastProfileId = ref<string | null>(null)
watch(
  () => profile.value?.id ?? null,
  (profileId) => {
    if (!import.meta.client) return
    const prev = lastProfileId.value
    if (prev && prev !== profileId) removeInterest([prev])
    lastProfileId.value = profileId ?? null
    if (profileId) addInterest([profileId])
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  const id = lastProfileId.value
  if (id) removeInterest([id])
})

const presenceStatus = computed(() => {
  const id = profile.value?.id
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
  if (!profile.value?.id || !isPresenceKnown(profile.value.id)) return false
  return Boolean(profile.value?.lastOnlineAt)
})

const { nowMs } = useNowTicker({ everyMs: 15_000 })
const lastOnlineShort = computed(() => {
  const iso = profile.value?.lastOnlineAt ?? null
  const t = formatListTime(iso, nowMs.value)
  if (t === 'now') return '<1m ago'
  if (/^\d+[mhd]$/.test(t)) return `${t} ago`
  return t
})

const lastOnlineTooltip = computed(() => {
  const iso = profile.value?.lastOnlineAt ?? null
  if (!iso) return null
  return formatDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' })
})
</script>

<style scoped>
.moh-edit-profile-nudge {
  --moh-edit-nudge-color: var(--moh-text);
  border-color: transparent !important;
  border-width: 0 !important;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--moh-edit-nudge-color) 20%, transparent);
  animation: mohEditProfilePulse 3.2s ease-in-out infinite;
}

.moh-edit-profile-nudge--normal {
  --moh-edit-nudge-color: var(--moh-text);
}

.moh-edit-profile-nudge--verified {
  --moh-edit-nudge-color: var(--moh-verified);
}

.moh-edit-profile-nudge--premium {
  --moh-edit-nudge-color: var(--moh-premium);
}

@keyframes mohEditProfilePulse {
  0%,
  100% {
    box-shadow:
      0 0 0 0 color-mix(in srgb, var(--moh-edit-nudge-color) 18%, transparent),
      0 0 0 0 color-mix(in srgb, var(--moh-edit-nudge-color) 10%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 10px color-mix(in srgb, var(--moh-edit-nudge-color) 8%, transparent),
      0 0 0 22px color-mix(in srgb, var(--moh-edit-nudge-color) 4%, transparent);
  }
}
</style>


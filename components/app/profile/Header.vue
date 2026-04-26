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
          ref="avatarWrapperRef"
          :class="[
            'group relative inline-flex leading-none ring-4 ring-white dark:ring-black',
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
            :show-empty-status="isSelf"
            :status-behavior="isSelf ? 'custom' : 'view'"
            :status-position-class="isSelf ? '-right-2 -top-2' : '-right-1 -top-1'"
            :status-size-class="isSelf ? 'h-8 w-8' : 'h-5 w-5'"
            :status-icon-class="isSelf ? 'text-[18px]' : 'text-[13px]'"
            @status-click="openStatusEditor"
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
            class="absolute inset-0"
            :class="isSelf && selectedSpaceId && !$route.path.startsWith('/spaces') && !$route.path.startsWith('/s/') ? 'cursor-pointer' : 'cursor-zoom-in'"
            aria-label="Avatar options"
            @click="onAvatarClick($event)"
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
            <AppOrgAffiliationAvatars
              v-if="!profile?.isOrganization && profile?.orgAffiliations && profile.orgAffiliations.length > 0"
              :orgs="profile.orgAffiliations"
              size="sm"
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
            v-tooltip.bottom="tinyTooltip('Message')"
            type="button"
            severity="secondary"
            rounded
            text
            class="!px-2"
            aria-label="Send message"
            @click="onChatClick"
          >
            <template #icon>
              <Icon name="tabler:message-circle-2" aria-hidden="true" />
            </template>
          </Button>
          <Button
            v-if="showPostBell"
            v-tooltip.bottom="tinyTooltip(bellEnabled ? 'Every post/reply from this user (standalone, no rollup)' : 'Enable every post/reply from this user')"
            type="button"
            severity="secondary"
            rounded
            text
            class="!px-2"
            :disabled="bellInflight"
            :aria-label="bellEnabled ? 'Disable every-post notifications for this user' : 'Enable every-post notifications for this user'"
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
            v-if="isAuthed && profile?.id && !isSelf"
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

      <!-- Posting streak milestone badges + status label -->
      <div v-if="(profile?.longestStreakDays ?? 0) >= 2" class="mt-3 flex items-center gap-2 flex-wrap">
        <AppStatusLabel :longest-streak-days="profile!.longestStreakDays" />
        <AppStreakBadge v-if="(profile?.longestStreakDays ?? 0) >= 7" :longest-streak-days="profile!.longestStreakDays" />
        <span
          v-if="profile!.checkinStreakDays > 0"
          class="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
        >
          <Icon name="tabler:flame" class="text-[11px]" style="color: var(--moh-checkin)" aria-hidden="true" />
          {{ profile!.checkinStreakDays }}-day streak
        </span>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
        <NuxtLink
          v-if="locationLabel && locationTo"
          :to="locationTo"
          class="inline-flex items-center gap-1.5 min-w-0 hover:underline underline-offset-2"
        >
          <Icon name="tabler:map-pin" class="shrink-0" aria-hidden="true" />
          <span class="truncate">{{ locationLabel }}</span>
        </NuxtLink>
        <div v-else-if="locationLabel" class="inline-flex items-center gap-1.5 min-w-0">
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

      <NuxtLink
        v-if="crewPill"
        :to="`/c/${encodeURIComponent(crewPill.slug)}`"
        class="mt-3 inline-flex items-center gap-2 rounded-full border moh-border pl-1.5 pr-3 py-1 max-w-full hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
        :aria-label="`View Crew: ${crewPillName}`"
        @mouseenter="onCrewPillEnter"
        @mouseleave="onCrewPillLeave"
      >
        <!-- Crew avatar or fallback shield icon -->
        <span
          class="h-6 w-6 overflow-hidden bg-gray-200 dark:bg-zinc-800 shrink-0 inline-flex items-center justify-center"
          :class="crewAvatarRound"
        >
          <img
            v-if="crewPill.avatarUrl"
            :src="crewPill.avatarUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
          >
          <Icon v-else name="tabler:shield-check" class="text-xs opacity-70" aria-hidden="true" />
        </span>
        <span class="text-xs font-medium moh-text truncate">{{ crewPillName }}</span>
      </NuxtLink>
    </div>
  </div>

  <Menu v-if="canOpenMenu" ref="menuRef" :model="menuItems" popup>
    <template #item="{ item, props }">
      <a v-bind="props.action" class="flex items-center gap-2" :class="item.class">
        <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
        <span v-bind="props.label">{{ item.label }}</span>
      </a>
    </template>
  </Menu>

  <!-- Avatar context menu: shown when on own profile and optionally in a space -->
  <Menu ref="avatarMenuRef" :model="avatarMenuItems" popup>
    <template #item="{ item, props }">
      <a v-bind="props.action" class="flex items-center gap-2">
        <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
        <span v-bind="props.label">{{ item.label }}</span>
      </a>
    </template>
  </Menu>

  <AppStatusEditorDialog
    :open="statusEditorOpen"
    :draft="statusDraft"
    :active-status="Boolean(activeStatus)"
    :saving="statusSaving"
    :error="statusError"
    title-id="profile-status-editor-title"
    @update:open="(open) => { if (!open) closeStatusEditor() }"
    @update:draft="statusDraft = $event"
    @save="saveStatus"
    @clear="clearStatus"
  />

  <AppReportDialog
    v-model:visible="reportOpen"
    target-type="user"
    :subject-user-id="profile?.id ?? null"
    :subject-label="profile?.username ? `@${profile.username}` : 'User'"
    @submitted="onReportSubmitted"
  />


  <AppCrewInviteToCrewDialog
    v-if="canInviteToCrew"
    v-model="inviteToCrewOpen"
    :invitee-user-id="inviteToCrewUserId"
    :invitee-name="profile?.name || profile?.username || null"
  />

  <AppConfirmDialog
    :visible="startChatInfoVisible"
    header="Starting new chats"
    message="To start new chats yourself, upgrade to Premium."
    cancel-label="Not now"
    confirm-label="Get Premium"
    confirm-severity="primary"
    @update:visible="startChatInfoVisible = $event"
    @confirm="goBilling"
    @cancel="startChatInfoVisible = false"
  >
    <template #extra-actions>
      <button
        type="button"
        class="moh-tap moh-focus rounded-lg px-4 py-2 text-sm font-medium moh-text-muted hover:moh-text transition-colors"
        @click="goPremium"
      >
        View tiers
      </button>
    </template>
  </AppConfirmDialog>
</template>

<script setup lang="ts">
import AppImg from '~/components/app/AppImg.vue'
import type { FollowRelationship, NudgeState, PublicProfile } from '~/types/api'
import { formatDateTime, formatListTime } from '~/utils/time-format'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { MenuItem } from 'primevue/menuitem'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { avatarRoundClass as getAvatarRoundClass, crewAvatarRoundClass } from '~/utils/avatar-rounding'
import { getApiErrorMessage } from '~/utils/api-error'

const crewAvatarRound = crewAvatarRoundClass()
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
    payload: {
      event: MouseEvent
      url: string
      title: string
      kind: 'avatar' | 'banner'
      isOrganization?: boolean
      originRect?: { left: number; top: number; width: number; height: number }
    },
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

const locationTo = computed(() => {
  const p = profile.value as any
  if (!p?.locationState) return null
  const query: Record<string, string> = { state: p.locationState }
  if (p.locationCity) query.city = p.locationCity
  if (p.locationCounty) query.county = p.locationCounty
  if (p.locationZip) query.zip = p.locationZip
  return { path: '/l', query }
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
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
})

// Subtle "my crew" pill sourced lazily from the compact crew summary endpoint.
// Keeps profile page lean and avoids inflating the PublicProfile DTO with crew data
// that most viewers never look at.
const crewApi = useCrew()
const crewPill = ref<import('~/types/api').CrewPublic | null>(null)
const crewPillName = computed(() => {
  if (!crewPill.value) return ''
  const n = (crewPill.value.name ?? '').trim()
  return n.length > 0 ? n : 'Untitled Crew'
})
watch(
  () => profile.value?.id ?? null,
  async (id) => {
    if (!id) {
      crewPill.value = null
      return
    }
    try {
      crewPill.value = await crewApi.getCrewForUser(id)
    } catch {
      crewPill.value = null
    }
  },
  { immediate: true },
)

const crewPreviewPop = useCrewPreviewPopover()

function onCrewPillEnter(e: MouseEvent) {
  const crew = crewPill.value
  const el = e.currentTarget as HTMLElement | null
  if (!crew || !el) return
  crewPreviewPop.onTriggerEnter({ crew, anchorEl: el })
}

function onCrewPillLeave() {
  crewPreviewPop.onTriggerLeave()
}

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
const avatarWrapperRef = ref<HTMLElement | null>(null)

// Avatar context menu (for own profile: Go to space and/or View photo).
const { selectedSpaceId, currentSpace: currentSpaceForNav } = useSpaceLobby()
const avatarMenuRef = ref()

type AvatarMenuItem = MenuItemWithIcon

const avatarMenuItems = computed<AvatarMenuItem[]>(() => {
  const items: AvatarMenuItem[] = []
  const ownerUsername = currentSpaceForNav.value?.owner?.username
  const route = useRoute()
  if (ownerUsername && !route.path.startsWith('/spaces') && !route.path.startsWith('/s/')) {
    items.push({
      label: 'Go to space',
      iconName: 'tabler:layout-grid',
      command: () => navigateTo(`/s/${encodeURIComponent(ownerUsername)}`),
    })
  }
  if (profileAvatarUrl.value) {
    items.push({
      label: 'View photo',
      iconName: 'tabler:photo',
      command: () => {
        emit('openImage', {
          event: new MouseEvent('click'),
          url: profileAvatarUrl.value!,
          title: 'Avatar',
          kind: 'avatar',
          isOrganization: Boolean(profile.value?.isOrganization),
          originRect: avatarWrapperRef.value?.getBoundingClientRect() ?? undefined,
        })
      },
    })
  }
  return items
})

function onAvatarClick(event: MouseEvent) {
  const route = useRoute()
  const inSpace = Boolean(selectedSpaceId.value) && !route.path.startsWith('/spaces') && !route.path.startsWith('/s/')
  if (isSelf.value && inSpace) {
     
    ;(avatarMenuRef.value as any)?.toggle(event)
    return
  }
  if (profileAvatarUrl.value) {
    emit('openImage', {
      event,
      url: profileAvatarUrl.value,
      title: 'Avatar',
      kind: 'avatar',
      isOrganization: Boolean(profile.value?.isOrganization),
    })
  }
}

const blockState = useBlockState()
const toast = useAppToast()

const viewerHasBlockedProfile = computed(() =>
  Boolean(profile.value?.viewerHasBlockedUser) || blockState.isBlockedByMe(profile.value?.id ?? ''),
)
const profileBlockHandle = computed(() => {
  const u = profile.value?.username
  return u ? `@${u}` : 'this user'
})

const blockingProfile = ref(false)
const { confirm } = useAppConfirm()

async function openBlockConfirm() {
  const isBlocked = viewerHasBlockedProfile.value
  const ok = await confirm({
    header: isBlocked ? `Unblock ${profileBlockHandle.value}?` : `Block ${profileBlockHandle.value}?`,
    message: isBlocked
      ? "They'll be able to see your posts and engage with them again."
      : "They can still view your posts but won't be able to engage with them.",
    confirmLabel: isBlocked ? 'Unblock' : 'Block',
    confirmSeverity: isBlocked ? 'primary' : 'danger',
  })
  if (!ok || blockingProfile.value || !profile.value?.id) return
  blockingProfile.value = true
  try {
    if (isBlocked) {
      await blockState.unblockUser(profile.value.id)
      toast.push({ title: `${profileBlockHandle.value} unblocked`, message: 'You can now engage with their posts.', tone: 'success', durationMs: 3000 })
    } else {
      await blockState.blockUser(profile.value.id)
      toast.push({ title: `${profileBlockHandle.value} blocked`, message: "They can still see your posts but can't engage with them.", tone: 'success', durationMs: 3000 })
    }
  } catch (e: unknown) {
    toast.pushError(e, isBlocked ? 'Failed to unblock.' : 'Failed to block.')
  } finally {
    blockingProfile.value = false
  }
}

const viewerCrew = useViewerCrew()
// Ensure viewer crew state is loaded so the invite option appears correctly.
// ensureLoaded is idempotent — subsequent calls are no-ops if already loaded.
onMounted(() => { void viewerCrew.ensureLoaded() })

const inviteToCrewOpen = ref(false)
const inviteToCrewUserId = ref<string | null>(null)

// Can invite to crew when:
//   a) viewer is crew owner with room (memberCount < 5), OR
//   b) viewer has no crew yet (will create one and invite as first member)
// AND profile user is not already in a crew
const canInviteToCrew = computed(() => {
  if (!isAuthed.value || isSelf.value) return false
  if (!viewerIsVerified.value) return false
  if ((profile.value as PublicProfile & { inCrew?: boolean })?.inCrew) return false
  const membership = viewerCrew.membership.value
  if (membership?.role === 'owner') {
    // Owner can invite if the viewer crew has room (max 5 members)
    // We rely on viewerCrew to know the owner's role; room check is loose here
    // (server will reject if full); this shows/hides the button optimistically.
    return true
  }
  // No crew yet — can create one and invite
  if (!membership) return true
  return false
})

const inviteToCrewLabel = computed(() =>
  viewerCrew.membership.value ? 'Add to my Crew' : 'Invite to Crew',
)

function openInviteToCrew() {
  if (!profile.value?.id) return
  inviteToCrewUserId.value = profile.value.id
  inviteToCrewOpen.value = true
}

// Exclude IDs for the invite dialog: just the profile user (pre-selected)
const inviteToCrewExcludeIds = computed<string[]>(() => [])

const menuItems = computed<MenuItemWithIcon[]>(() => {
  if (!canOpenMenu.value) return []
  const items: MenuItemWithIcon[] = []

  if (canInviteToCrew.value) {
    items.push({
      label: inviteToCrewLabel.value,
      iconName: 'tabler:shield-check',
      class: 'text-amber-600 dark:text-amber-400 font-semibold',
      command: () => openInviteToCrew(),
    })
  }

  items.push(
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
      command: () => openBlockConfirm(),
    },
  )
  return items
})

function toggleMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
   
  ;(menuRef.value as any)?.toggle(event)
}

function onReportSubmitted() {
  // toast + close handled in dialog
}

const { addInterest, removeInterest, getPresenceStatus, getUserStatus, setMyStatus, clearMyStatus, isPresenceKnown } = usePresence()
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

const statusEditorOpen = ref(false)
const statusDraft = ref('')
const statusSaving = ref(false)
const statusError = ref<string | null>(null)
const activeStatus = computed(() => {
  const id = profile.value?.id
  return id ? getUserStatus(id) : null
})

function openStatusEditor() {
  if (!isSelf.value) return
  statusDraft.value = activeStatus.value?.text ?? ''
  statusError.value = null
  statusEditorOpen.value = true
}

function closeStatusEditor() {
  statusEditorOpen.value = false
  statusError.value = null
}

async function saveStatus() {
  const text = statusDraft.value.trim()
  if (!text) return
  statusSaving.value = true
  statusError.value = null
  try {
    await setMyStatus(text)
    closeStatusEditor()
  } catch (e) {
    statusError.value = getApiErrorMessage(e) || 'Could not save status.'
  } finally {
    statusSaving.value = false
  }
}

async function clearStatus() {
  if (!activeStatus.value) return
  statusSaving.value = true
  statusError.value = null
  try {
    await clearMyStatus()
    statusDraft.value = ''
    closeStatusEditor()
  } catch (e) {
    statusError.value = getApiErrorMessage(e) || 'Could not clear status.'
  } finally {
    statusSaving.value = false
  }
}

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


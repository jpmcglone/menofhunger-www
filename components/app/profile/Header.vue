<template>
  <div class="-mt-4">
    <!-- Full-bleed profile header (cancel app layout padding) -->
    <div class="relative">
      <div class="group relative aspect-[3/1] w-full bg-gray-200 dark:bg-zinc-900">
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
      </div>

      <div
        :class="[
          'absolute left-4 bottom-0 translate-y-1/2 transition-opacity duration-200',
          hideAvatarDuringBanner ? 'opacity-0 pointer-events-none' : 'opacity-100'
        ]"
      >
        <div class="group relative ring-4 ring-white dark:ring-black rounded-full">
          <AppUserAvatar
            v-show="!hideAvatarThumb"
            :user="profile"
            size-class="h-28 w-28"
            bg-class="bg-gray-200 dark:bg-zinc-800"
            :presence-scale="0.15"
            :presence-inset-ratio="0.25"
          />
          <div
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            class="pointer-events-none absolute inset-0 rounded-full bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
            aria-hidden="true"
          />
          <button
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            type="button"
            class="absolute inset-0 cursor-zoom-in"
            aria-label="View avatar"
            @click="emit('openImage', { event: $event, url: profileAvatarUrl, title: 'Avatar', kind: 'avatar' })"
          />
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-3xl px-4 pb-5 pt-16">
      <div class="flex items-start justify-between gap-4 mt-1">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="text-2xl font-bold leading-none text-gray-900 dark:text-gray-50 truncate">
              {{ profileName }}
            </div>
            <AppVerifiedBadge
              :status="profile?.verifiedStatus"
              :premium="profile?.premium"
              :premium-plus="profile?.premiumPlus"
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
            @click="emit('edit')"
          >
            <template #icon>
              <Icon name="tabler:pencil" aria-hidden="true" />
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
          <div v-if="showNudge" class="flex items-center gap-2">
            <!-- Nudge back split-button (primary action + caret menu) -->
            <div
              v-if="nudgeState?.inboundPending"
              class="inline-flex overflow-hidden rounded-xl border moh-border"
            >
              <Button
                label="Nudge back"
                severity="secondary"
                class="!rounded-none !border-0"
                :disabled="nudgeInflight || ignoreInflight"
                @click="onNudgeBack"
              />
              <Button
                type="button"
                severity="secondary"
                class="!rounded-none !border-0 !px-2"
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
              severity="secondary"
              rounded
              :disabled="nudgePrimaryDisabled"
              @click="onNudgePrimary"
            />
          </div>
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
        <button type="button" class="hover:underline" @click="emit('openFollowing')">
          <span class="font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{{ followingCount ?? 0 }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Following</span>
        </button>
        <button type="button" class="hover:underline" @click="emit('openFollowers')">
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
</template>

<script setup lang="ts">
import AppImg from '~/components/app/AppImg.vue'
import type { FollowRelationship, NudgeState, PublicProfile } from '~/types/api'
import { formatDateTime, formatListTime } from '~/utils/time-format'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { MenuItem } from 'primevue/menuitem'
import { useUserOverlay } from '~/composables/useUserOverlay'

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
  (e: 'openImage', payload: { event: MouseEvent; url: string; title: string; kind: 'avatar' | 'banner' }): void
  (e: 'edit'): void
  (e: 'followed'): void
  (e: 'unfollowed'): void
  (e: 'openFollowers'): void
  (e: 'openFollowing'): void
}>()

const { user: profile } = useUserOverlay(computed(() => props.profile ?? null))
const profileName = computed(() => props.profileName)
const profileAvatarUrl = computed(() => props.profileAvatarUrl ?? null)
const profileBannerUrl = computed(() => props.profileBannerUrl ?? null)
const relationshipTagLabel = computed(() => props.relationshipTagLabel ?? null)
const isSelf = computed(() => Boolean(props.isSelf))
const followRelationship = computed(() => props.followRelationship ?? null)
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
    await ackNudge(id)
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
    await ignoreNudge(id)
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
  const username = profile.value?.username ?? null
  const inboundId = nudgeState.value?.inboundNotificationId ?? null
  if (!username || !inboundId) return

  nudgeInflight.value = true
  try {
    // Mark "nudged back" on the inbound notification (best-effort), then send our nudge.
    await markNudgeNudgedBackById(inboundId).catch(() => {})
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

const menuItems = computed<MenuItemWithIcon[]>(() => {
  if (!canOpenMenu.value) return []
  return [
    {
      label: 'Report user',
      iconName: 'tabler:flag',
      command: () => {
        reportOpen.value = true
      },
    },
  ]
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

const lastOnlineShort = computed(() => {
  const iso = profile.value?.lastOnlineAt ?? null
  const t = formatListTime(iso)
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


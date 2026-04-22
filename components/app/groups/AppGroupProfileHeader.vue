<template>
  <!-- Full-bleed group header (same shell pattern as profile: banner + overlapping avatar + max-w-3xl meta). -->
  <div class="relative w-full">
    <div class="relative">
      <div class="group relative aspect-[3.25/1] w-full overflow-hidden bg-gray-200 dark:bg-zinc-900">
        <img
          v-if="coverUrl"
          v-show="!hideBannerThumb"
          :src="coverUrl"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        >
        <div
          v-if="coverUrl"
          v-show="!hideBannerThumb"
          class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
          aria-hidden="true"
        />
        <button
          v-if="coverUrl"
          v-show="!hideBannerThumb"
          type="button"
          class="absolute inset-0 z-[1] cursor-zoom-in"
          aria-label="View group banner"
          @click="emitOpenBanner($event)"
        />
        <div
          class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
          aria-hidden="true"
        />
        <!-- Settings on banner: members (including owners) — owners edit details via “Edit group”; this opens advanced settings. -->
        <div class="absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-2">
          <NuxtLink
            v-if="showSettingsLink"
            :to="`/g/${encodeURIComponent(shell.slug)}/settings`"
            class="moh-tap hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/50"
          >
            <Icon name="tabler:settings" class="text-[15px] opacity-90" aria-hidden="true" />
            Settings
          </NuxtLink>
          <NuxtLink
            v-if="showSettingsLink"
            :to="`/g/${encodeURIComponent(shell.slug)}/settings`"
            class="moh-tap flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/50 sm:hidden"
            aria-label="Group settings"
          >
            <Icon name="tabler:settings" class="text-lg" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <div
        :class="[
          'absolute left-4 bottom-0 z-10 translate-y-1/2 transition-opacity duration-200',
          hideAvatarDuringBanner ? 'opacity-0 pointer-events-none' : 'opacity-100',
        ]"
      >
        <div
          ref="avatarWrapperRef"
          class="group/av relative h-24 w-24 overflow-hidden bg-gray-200 ring-4 ring-white dark:bg-zinc-800 dark:ring-black"
          :class="avatarRoundClass"
        >
          <img
            v-if="avatarUrl"
            v-show="!hideAvatarThumb"
            :src="avatarUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          >
          <div
            v-else
            class="flex h-full w-full items-center justify-center text-2xl font-bold moh-text"
          >
            {{ initials }}
          </div>
          <div
            v-if="avatarUrl"
            v-show="!hideAvatarThumb"
            class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover/av:bg-black/20"
            :class="avatarRoundClass"
            aria-hidden="true"
          />
          <button
            v-if="avatarUrl"
            v-show="!hideAvatarThumb"
            type="button"
            class="absolute inset-0 cursor-zoom-in"
            aria-label="View group avatar"
            @click="emitOpenAvatar($event)"
          />
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-3xl px-4 pb-5 pt-14">
      <div class="flex items-start justify-between gap-4 mt-1">
        <div class="min-w-0">
          <h1 class="text-xl font-bold leading-none text-gray-900 dark:text-gray-50 truncate">
            {{ shell.name }}
          </h1>
          <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <!--
              Member list is API-gated to active members (groups.service#listMembers
              calls assertActiveMember). Non-members see the count without a link so
              clicking it can't trigger an unhandled 404 from the members page.
            -->
            <NuxtLink
              v-if="isMember"
              :to="`/g/${encodeURIComponent(shell.slug)}/members`"
              class="font-medium hover:underline underline-offset-2 text-gray-700 dark:text-gray-200 tabular-nums"
            >
              {{ shell.memberCount.toLocaleString() }} members
            </NuxtLink>
            <span
              v-else
              class="font-medium text-gray-700 dark:text-gray-200 tabular-nums"
            >
              {{ shell.memberCount.toLocaleString() }} members
            </span>
            <span aria-hidden="true">·</span>
            <span>{{ shell.joinPolicy === 'approval' ? 'Approval to join' : 'Open' }}</span>
          </div>
        </div>
        <div v-if="!isMember" class="shrink-0 flex items-center gap-2">
          <!-- Logged-out: prompt to log in -->
          <NuxtLink
            v-if="!viewerIsLoggedIn"
            to="/login"
            class="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--moh-group)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            Log in to join
          </NuxtLink>
          <!-- Logged-in but not verified: prompt to verify -->
          <NuxtLink
            v-else-if="!viewerIsVerified"
            to="/settings/verification"
            class="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--moh-group)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            Get verified to join
          </NuxtLink>
          <!-- Verified: show normal join/pending buttons -->
          <template v-else-if="!shell.viewerPendingApproval">
            <Button
              label="Join group"
              rounded
              :loading="joinBusy"
              @click="$emit('join')"
            />
          </template>
          <template v-else>
            <span class="text-xs moh-text-muted self-center">Request pending</span>
            <Button
              label="Cancel request"
              rounded
              severity="secondary"
              size="small"
              :loading="cancelBusy"
              @click="$emit('cancel-request')"
            />
          </template>
        </div>
        <div v-else class="shrink-0 flex items-center gap-2">
          <!-- Pending requests badge (owners + mods of approval-policy groups) -->
          <NuxtLink
            v-if="isAdminViewer && shell.joinPolicy === 'approval'"
            :to="`/g/${encodeURIComponent(shell.slug)}/pending`"
            class="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold moh-surface-hover border moh-border"
            :aria-label="pendingMemberCount > 0 ? `${pendingMemberCount} pending request${pendingMemberCount !== 1 ? 's' : ''}` : 'Pending requests'"
          >
            <Icon name="tabler:users-group" class="text-[14px] opacity-80" aria-hidden="true" />
            <span class="hidden sm:inline">Requests</span>
            <span
              v-if="pendingMemberCount > 0"
              class="absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none"
              aria-hidden="true"
            >
              {{ pendingMemberCount >= 99 ? '99+' : pendingMemberCount }}
            </span>
          </NuxtLink>
          <!-- Pending sent invites (owners + mods). Always present for admins so
               the "who have I invited?" view is one tap away even when the count
               is zero. -->
          <NuxtLink
            v-if="isAdminViewer"
            :to="`/g/${encodeURIComponent(shell.slug)}/invites`"
            class="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold moh-surface-hover border moh-border"
            :aria-label="pendingInviteCount > 0 ? `${pendingInviteCount} pending invite${pendingInviteCount !== 1 ? 's' : ''}` : 'Pending invites'"
          >
            <Icon name="tabler:mail-forward" class="text-[14px] opacity-80" aria-hidden="true" />
            <span class="hidden sm:inline">Invites</span>
            <span
              v-if="pendingInviteCount > 0"
              class="absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[color:var(--moh-group)] px-1 text-[10px] font-bold text-white leading-none"
              aria-hidden="true"
            >
              {{ pendingInviteCount >= 99 ? '99+' : pendingInviteCount }}
            </span>
          </NuxtLink>
          <Button
            v-if="isAdminViewer"
            label="Invite"
            rounded
            @click="$emit('invite')"
          >
            <template #icon>
              <Icon name="tabler:user-plus" aria-hidden="true" />
            </template>
          </Button>
          <Button
            v-if="isOwner"
            label="Edit group"
            severity="secondary"
            rounded
            @click="$emit('edit')"
          >
            <template #icon>
              <Icon name="tabler:pencil" aria-hidden="true" />
            </template>
          </Button>
          <Button
            v-if="canLeave"
            label="Leave group"
            rounded
            severity="secondary"
            size="small"
            :loading="leaveBusy"
            @click="onLeaveClick"
          />
        </div>
      </div>

      <!-- Description -->
      <div v-if="shell.description" class="mt-4">
        <!-- Obfuscated: logged-out or unverified — short fade like article gate -->
        <div
          v-if="descriptionObfuscated"
          class="overflow-hidden opacity-75"
          style="max-height: 2.75rem; mask-image: linear-gradient(to bottom, black 0%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);"
        >
          <div class="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
            {{ shell.description }}
          </div>
        </div>
        <!-- Full description for verified viewers -->
        <div v-else class="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
          {{ shell.description }}
        </div>
      </div>
      <div v-else-if="!descriptionObfuscated" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        No description yet.
      </div>

      <!-- Rules: members only -->
      <div v-if="shell.rules && isMember" class="mt-4 border-t moh-border pt-4">
        <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
          Rules
        </div>
        <div class="relative">
          <div
            ref="rulesContentRef"
            class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed overflow-hidden transition-[max-height] duration-300 ease-in-out"
            :style="{ maxHeight: rulesExpanded ? `${rulesFullHeight}px` : '3.25rem' }"
          >
            {{ shell.rules }}
          </div>
          <button
            v-if="rulesOverflows"
            type="button"
            class="mt-1 text-xs font-medium text-[color:var(--moh-group)] hover:underline"
            @click="rulesExpanded = !rulesExpanded"
          >
            {{ rulesExpanded ? 'Show less' : 'See more' }}
          </button>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'

const props = withDefaults(defineProps<{
  shell: CommunityGroupShell
  isMember: boolean
  isOwner?: boolean
  canLeave: boolean
  coverUrl: string | null
  avatarUrl: string | null
  joinBusy?: boolean
  leaveBusy?: boolean
  cancelBusy?: boolean
  /** Link to settings for any member; owner sees more on the settings page. */
  showSettingsLink?: boolean
  hideBannerThumb?: boolean
  hideAvatarThumb?: boolean
  hideAvatarDuringBanner?: boolean
  /** Whether the current viewer is authenticated (affects join CTA and description visibility). */
  viewerIsLoggedIn?: boolean
  /** Whether the current viewer is verified (affects join CTA). */
  viewerIsVerified?: boolean
}>(), {
  viewerIsLoggedIn: true,
  viewerIsVerified: true,
})

const emit = defineEmits<{
  (
    e: 'openImage',
    payload: {
      event: MouseEvent
      url: string
      title: string
      kind: 'avatar' | 'banner'
      originRect?: { left: number; top: number; width: number; height: number }
    },
  ): void
  (e: 'edit'): void
  (e: 'invite'): void
  (e: 'join'): void
  (e: 'leave'): void
  (e: 'cancel-request'): void
}>()

const avatarRoundClass = groupAvatarRoundClass()
const avatarWrapperRef = ref<HTMLElement | null>(null)
const { confirm } = useAppConfirm()

async function onLeaveClick() {
  const ok = await confirm({
    header: 'Leave group?',
    message: "You'll lose access to the group's posts and feed. You can rejoin later.",
    confirmLabel: 'Leave',
    confirmSeverity: 'danger',
  })
  if (ok) emit('leave')
}

const isAdminViewer = computed(() => {
  const role = props.shell.viewerMembership?.role
  return role === 'owner' || role === 'moderator'
})

const pendingMemberCount = computed(() => props.shell.pendingMemberCount ?? 0)
const pendingInviteCount = computed(() => props.shell.pendingInviteCount ?? 0)

// Show full description only to verified (logged-in + verified) viewers.
const descriptionObfuscated = computed(() => !props.viewerIsLoggedIn || !props.viewerIsVerified)

const rulesContentRef = ref<HTMLElement | null>(null)
const rulesExpanded = ref(false)
const rulesFullHeight = ref(0)
const rulesOverflows = ref(false)

function measureRules() {
  const el = rulesContentRef.value
  if (!el) return
  rulesFullHeight.value = el.scrollHeight
  rulesOverflows.value = el.scrollHeight > 52
}

onMounted(() => nextTick(measureRules))
watch(() => props.shell.rules, () => {
  rulesExpanded.value = false
  nextTick(measureRules)
})

function emitOpenBanner(event: MouseEvent) {
  const url = props.coverUrl
  if (!url) return
  emit('openImage', { event, url, title: 'Group banner', kind: 'banner' })
}

function emitOpenAvatar(event: MouseEvent) {
  const url = props.avatarUrl
  if (!url) return
  emit('openImage', {
    event,
    url,
    title: 'Group avatar',
    kind: 'avatar',
    originRect: avatarWrapperRef.value?.getBoundingClientRect() ?? undefined,
  })
}

const initials = computed(() => {
  const n = (props.shell.name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})
</script>

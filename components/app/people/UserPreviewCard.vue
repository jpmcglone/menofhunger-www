<template>
  <div class="relative overflow-hidden rounded-2xl moh-popover moh-card-matte">
    <!-- Nudge overlay (top-right) -->
    <div
      v-if="showNudge"
      class="absolute top-3 right-3 z-20"
      v-tooltip.bottom="nudgeDisabledTooltip"
    >
      <div
        v-if="nudgeAction.kind === 'nudgeBack'"
        class="inline-flex overflow-hidden rounded-xl border moh-border"
        @click.stop.prevent
      >
        <Button
          size="small"
          label="Nudge back"
          severity="secondary"
          class="!rounded-none !border-0 !text-xs"
          :disabled="nudgePrimaryDisabled"
          @click.stop.prevent="onNudgeBack"
        />
        <Button
          size="small"
          type="button"
          severity="secondary"
          class="!rounded-none !border-0 !px-2 !text-xs"
          aria-label="More nudge actions"
          aria-haspopup="true"
          :disabled="nudgePrimaryDisabled"
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
        :label="nudgeAction.label"
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
              :show-status="false"
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
            :show-status="false"
            :presence-scale="0.22"
            :presence-inset-ratio="0.4"
          />
        </div>
      </div>

      <!-- Status pill: bottom-aligned with banner bottom, immediately right of the avatar.
           Capped width keeps it clear of the online/last-online pill that peeks up on the right.
           Text clamps to 2 lines max. Shape adapts: pill on 1 line, rounded
           rectangle when wrapped to 2 lines. Rendered as a NuxtLink so that
           right-click / cmd+click / middle-click on the status open the
           profile in a new tab — see `40-internal-links.mdc`. -->
      <ClientOnly>
        <NuxtLink
          v-if="activeStatus && profilePath"
          :to="profilePath"
          :aria-label="`View @${user.username} profile — status: ${activeStatus.text}`"
          :class="[
            'moh-focus absolute z-20 left-[6.25rem] bottom-2 inline-flex max-w-[10rem] items-center gap-1.5 bg-white px-2.5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.25)] ring-1 ring-black/5 transition-[transform,border-radius] duration-200 ease-out motion-safe:hover:scale-[1.04] active:scale-[0.97]',
            statusIsMultiline ? 'rounded-xl' : 'rounded-full',
          ]"
          @click="onNavigate"
        >
          <Icon name="tabler:message-circle-filled" class="shrink-0 text-[11px] text-zinc-950" aria-hidden="true" />
          <span ref="statusTextEl" class="moh-clamp-2 min-w-0 text-[11px] font-semibold leading-snug text-zinc-950 text-left">{{ activeStatus.text }}</span>
        </NuxtLink>
        <div
          v-else-if="activeStatus"
          :class="[
            'absolute z-20 left-[6.25rem] bottom-2 inline-flex max-w-[10rem] items-center gap-1.5 bg-white px-2.5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.25)] ring-1 ring-black/5 transition-[transform,border-radius] duration-200 ease-out motion-safe:hover:scale-[1.04]',
            statusIsMultiline ? 'rounded-xl' : 'rounded-full',
          ]"
        >
          <Icon name="tabler:message-circle-filled" class="shrink-0 text-[11px] text-zinc-950" aria-hidden="true" />
          <span ref="statusTextEl" class="moh-clamp-2 min-w-0 text-[11px] font-semibold leading-snug text-zinc-950 text-left">{{ activeStatus.text }}</span>
        </div>
      </ClientOnly>
    </div>

    <div class="px-4 pb-4 pt-12">
      <!-- Online / last-online pill: right below the banner -->
      <div v-if="user.id && (showOnlineNow || showLastOnline)" class="flex justify-end -mt-10 mb-3">
        <div
          v-tooltip.bottom="showLastOnline ? tinyTooltip(lastOnlineTooltip) : undefined"
          class="rounded-full px-2 py-0.5 text-[11px] shadow-sm backdrop-blur-sm"
          :class="
            showOnlineNow
              ? 'bg-[var(--moh-online)]/90 text-white dark:bg-[var(--moh-online)]/20 dark:text-[var(--moh-online)]'
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
              :is-bot="user.isBot"
            />
            <AppOrgAffiliationAvatars
              v-if="!user.isOrganization && user.orgAffiliations && user.orgAffiliations.length > 0"
              :orgs="user.orgAffiliations"
              size="sm"
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
        v-if="currentSpaceId"
        class="mt-3 flex min-w-0 items-center gap-2 rounded-xl border moh-border bg-[color:var(--moh-surface-2)] px-3 py-2.5"
      >
        <Icon name="tabler:layout-grid" class="shrink-0 text-sm moh-text-muted" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold uppercase tracking-wide moh-text-muted">
            In a space
          </div>
          <div class="mt-0.5 truncate text-xs font-medium moh-text">
            {{ currentSpace?.title || 'Live now' }}
          </div>
        </div>
        <button
          v-if="currentSpace"
          type="button"
          class="moh-pressable shrink-0 rounded-lg bg-[var(--p-primary-color)] px-2.5 py-1.5 text-xs font-semibold text-white transition-[opacity,transform] active:scale-[0.96]"
          @click.stop.prevent="joinCurrentSpace"
        >
          Join space
        </button>
      </div>

      <div
        v-if="user.bio"
        class="mt-3 moh-body whitespace-pre-wrap break-words max-h-[4.5rem] overflow-hidden"
      >
        {{ user.bio }}
      </div>

      <NuxtLink
        v-if="locationLabel && locationTo"
        :to="locationTo"
        class="mt-2 inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:underline underline-offset-2 min-w-0 max-w-full"
        @click="onNavigate"
      >
        <ClientOnly>
          <AppStateShape
            v-if="locationState"
            :state="locationState"
            class="h-4 w-4 shrink-0 opacity-80"
          />
          <template #fallback>
            <Icon name="tabler:map-pin" class="shrink-0" aria-hidden="true" />
          </template>
        </ClientOnly>
        <Icon v-if="!locationState" name="tabler:map-pin" class="shrink-0" aria-hidden="true" />
        <span class="truncate">{{ locationLabel }}</span>
      </NuxtLink>

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
import type { UserPreviewCardProps } from '../../../composables/people/user-preview-card-types'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useUserPreviewCard } from '~/composables/people/useUserPreviewCard'

const props = defineProps<UserPreviewCardProps>()

const {
  user,
  avatarRoundClass,
  canSendMessageFromPreview,
  nudgeAction,
  showNudge,
  nudgeDisabledTooltip,
  nudgePrimaryDisabled,
  gotItNudgeTooltip,
  ignoreNudgeTooltip,
  nudgeMenuRef,
  nudgeMenuItems,
  toggleNudgeMenu,
  onNudgeBack,
  onNudgePrimary,
  showOnlineNow,
  activeStatus,
  statusTextEl,
  statusIsMultiline,
  currentSpaceId,
  currentSpace,
  showLastOnline,
  lastOnlineShort,
  lastOnlineTooltip,
  profilePath,
  locationLabel,
  locationState,
  locationTo,
  followersPath,
  followingPath,
  displayName,
  pop,
  onNavigate,
  joinCurrentSpace,
  messageButtonClass,
  onSendMessage,
} = useUserPreviewCard(props)
</script>


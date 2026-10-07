<template>
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
      <!-- Nudge overlay (top-right), fully inside banner with consistent margin -->
      <div v-if="showNudge" class="pointer-events-none absolute inset-4 z-20 flex justify-end">
        <div
          v-tooltip.bottom="nudgeDisabledTooltip"
          class="pointer-events-auto"
        >
          <!-- Nudge back split-button (primary action + caret menu) -->
          <div
            v-if="nudgeAction.kind === 'nudgeBack'"
            class="inline-flex overflow-hidden rounded-xl border moh-border"
          >
            <Button
              label="Nudge back"
              size="small"
              severity="secondary"
              class="!rounded-none !border-0 !text-xs"
              :disabled="nudgePrimaryDisabled"
              @click="onNudgeBack"
            />
            <Button
              type="button"
              size="small"
              severity="secondary"
              class="!rounded-none !border-0 !px-2 !text-xs"
              aria-label="More nudge actions"
              aria-haspopup="true"
              :disabled="nudgePrimaryDisabled"
              @click="toggleNudgeMenu"
            >
              <template #icon>
                <Icon name="tabler:chevron-down" aria-hidden="true" />
              </template>
            </Button>
            <Menu v-if="nudgeMenuMounted" ref="nudgeMenuRef" :model="nudgeMenuItems" popup>
              <template #item="{ item, props: itemProps }">
                <a v-bind="itemProps.action" class="flex items-center gap-2">
                  <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
                  <span
                    v-tooltip.bottom="
                      item.value === 'ignore'
                        ? tinyTooltip(ignoreNudgeTooltip)
                        : item.value === 'gotit'
                          ? tinyTooltip(gotItNudgeTooltip)
                          : undefined
                    "
                    v-bind="itemProps.label"
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
            :label="nudgeAction.label"
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
        'absolute left-5 sm:left-6 bottom-0 translate-y-[64px] transition-opacity duration-200',
        hideAvatarDuringBanner ? 'opacity-0 pointer-events-none' : 'opacity-100'
      ]"
    >
      <div
        ref="avatarWrapperRef"
        :class="[
          'group relative inline-flex leading-none ring-4 ring-[var(--moh-bg)]',
          avatarRoundClass
        ]"
      >
        <AppUserAvatar
          v-show="!hideAvatarThumb"
          :user="profile"
          size-class="h-28 w-28"
          bg-class="bg-gray-200 dark:bg-zinc-800"
          :presence-scale="0.15"
          :presence-inset-ratio="0.25"
          :show-empty-status="canSetStatus && !activeStatus"
          :show-status="!activeStatus"
          :status-behavior="canSetStatus ? 'custom' : 'view'"
          :status-position-class="isSelf ? '-right-2 -top-2' : '-right-1 -top-1'"
          :status-size-class="'h-11 w-11'"
          status-appearance="surface"
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

    <!-- Status pill: bottom-aligned with banner, immediately right of the avatar.
         Always white/dark to read as a clear "status" callout in either theme.
         Text clamps to 2 lines max. Shape switches from pill (1 line) to
         rounded rectangle (2 lines) so a wrapped status doesn't read as a
         tall stadium.
         Self: click opens editor. Others: click opens a read-only status modal. -->
    <ClientOnly>
      <button
        v-if="activeStatus && canSetStatus"
        v-tooltip.bottom="tinyTooltip('Update status')"
        type="button"
        :class="[
          'cursor-pointer absolute z-20 left-[10rem] bottom-3 inline-flex max-w-[calc(100%-11rem)] items-center gap-1.5 bg-white px-3 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.25)] ring-1 ring-black/5 transition-[transform,border-radius] duration-200 ease-out motion-safe:hover:scale-[1.04] active:scale-[0.96]',
          statusIsMultiline ? 'rounded-xl' : 'rounded-full',
        ]"
        :aria-label="`Update your status: ${activeStatus.text}`"
        @click.stop="openStatusEditor"
      >
        <Icon name="tabler:message-circle-filled" class="shrink-0 text-[13px] text-zinc-950" aria-hidden="true" />
        <span ref="statusTextEl" class="moh-clamp-2 min-w-0 text-xs font-semibold leading-snug text-zinc-950 text-left">{{ activeStatus.text }}</span>
      </button>
      <button
        v-else-if="activeStatus"
        type="button"
        :class="[
          'cursor-pointer absolute z-20 left-[10rem] bottom-3 inline-flex max-w-[calc(100%-11rem)] items-center gap-1.5 bg-white px-3 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.25)] ring-1 ring-black/5 transition-[transform,border-radius] duration-200 ease-out motion-safe:hover:scale-[1.04] active:scale-[0.96]',
          statusIsMultiline ? 'rounded-xl' : 'rounded-full',
        ]"
        :aria-label="`View ${profileName}'s status`"
        @click.stop="statusViewOpen = true"
      >
        <Icon name="tabler:message-circle-filled" class="shrink-0 text-[13px] text-zinc-950" aria-hidden="true" />
        <span ref="statusTextEl" class="moh-clamp-2 min-w-0 text-xs font-semibold leading-snug text-zinc-950 text-left">{{ activeStatus.text }}</span>
      </button>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useProfileHeaderContext } from '~/composables/profile/useProfileHeader'

const {
  profileBannerUrl,
  hideBannerThumb,
  emit,
  showNudge,
  nudgeAction,
  nudgePrimaryDisabled,
  onNudgeBack,
  toggleNudgeMenu,
  nudgeMenuMounted,
  nudgeMenuItems,
  ignoreNudgeTooltip,
  gotItNudgeTooltip,
  onNudgePrimary,
  nudgeDisabledTooltip,
  hideAvatarDuringBanner,
  avatarRoundClass,
  profile,
  canSetStatus,
  activeStatus,
  isSelf,
  openStatusEditor,
  hideAvatarThumb,
  profileAvatarUrl,
  selectedSpaceId,
  onAvatarClick,
  statusIsMultiline,
  profileName,
  statusViewOpen,
  nudgeMenuRef,
  avatarWrapperRef,
  statusTextEl,
} = useProfileHeaderContext()
</script>


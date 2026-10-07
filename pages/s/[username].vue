<template>
  <AppPageContent bottom="standard" class="h-full">
    <div class="w-full flex flex-col h-full">
      <div v-if="!space" class="moh-gutter-x py-8">
        <div v-if="spaceLoading" class="flex items-center gap-2 moh-meta">
          <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
          <span>Loading space…</span>
        </div>
        <div v-else class="moh-meta">
          <p>Space not found or is currently offline.</p>
          <NuxtLink to="/spaces" class="mt-2 inline-flex font-semibold text-[var(--p-primary-color)] hover:underline">
            Back to Spaces
          </NuxtLink>
        </div>
      </div>

      <template v-else>
        <div class="moh-gutter-x pt-4 pb-3 flex items-start justify-between gap-3 shrink-0 border-b moh-border">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="moh-h1">{{ displayTitle }}</h1>
              <AppSpaceStatusBadge :kind="spaceStatusKind" size="md" class="!text-[10px] !px-2" />
            </div>
            <p v-if="displaySubtitle" class="mt-1 moh-meta">{{ displaySubtitle }}</p>
            <p v-if="space.description" class="mt-1 moh-meta">{{ space.description }}</p>
            <p v-if="spaceScheduleLabel && !space.isActive" class="mt-1 moh-meta">
              <template v-if="isOwner">Scheduled {{ spaceScheduleLabel }}</template>
              <template v-else>Hosted by @{{ space.owner?.username ?? 'unknown' }} · {{ spaceScheduleLabel }}</template>
            </p>
            <p v-else-if="!isOwner" class="mt-1 moh-meta">
              Hosted by @{{ space.owner?.username ?? 'unknown' }}
            </p>
          </div>
          <div class="shrink-0 mt-1 flex flex-wrap items-center justify-end gap-2">
            <AppSpaceNotifyCount
              v-if="showHostReminders"
              :count="hostNotifyCount"
            />
            <button
              v-else-if="showSpaceNotifyMe"
              type="button"
              class="moh-tap moh-focus inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="space.viewerSubscribed
                ? 'bg-[var(--p-primary-color)]/15 text-[var(--p-primary-color)]'
                : 'border moh-border-subtle moh-meta moh-surface-hover'"
              :disabled="spaceNotifyBusy"
              :aria-label="space.viewerSubscribed ? 'Stop notifications' : 'Notify me'"
              @click="onToggleSpaceNotify"
            >
              {{ space.viewerSubscribed ? 'Notifying' : 'Notify me' }}
            </button>
            <template v-if="canJoinSpace">
              <AppPostRowShareMenu
                :can-share="true"
                :tooltip="spaceShareTooltip"
                :items="spaceShareMenuItems"
              />
              <button
                type="button"
                class="moh-tap moh-focus inline-flex items-center gap-1.5 rounded-full border moh-border-subtle px-3 py-1.5 text-xs font-medium moh-meta moh-surface-hover transition-colors"
                aria-label="Leave space"
                @click="onLeave"
              >
                <Icon name="tabler:door-exit" class="text-[14px]" aria-hidden="true" />
                Leave
              </button>
            </template>
            <SpaceOwnerPanel
              v-if="isOwner && canJoinSpace"
              :space="space"
              @space-updated="(s) => { space = s; upsertSpace(s) }"
            />
          </div>
        </div>

        <!-- Gate: logged-out or unverified users see a CTA instead of interactive content -->
        <div v-if="!canJoinSpace" class="moh-gutter-x flex-1 flex items-center justify-center min-h-[40vh]">
          <div class="text-center max-w-sm">
            <Icon name="tabler:lock" class="text-[48px] opacity-20 mx-auto" aria-hidden="true" />
            <p class="mt-3 text-lg font-semibold moh-text">Verified members only</p>
            <p class="mt-1 text-sm moh-meta">
              {{ isAuthed ? 'Upgrade to Verified or Premium to join spaces.' : 'Log in or create an account to join.' }}
            </p>
            <Button
              as="NuxtLink"
              :to="isAuthed ? '/tiers' : `/login?redirect=${encodeURIComponent(route.fullPath)}`"
              :label="isAuthed ? 'View tiers' : 'Log in'"
              rounded
              class="mt-4"
            >
              <template #icon>
                <Icon :name="isAuthed ? 'tabler:star' : 'tabler:login'" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <template v-else>
          <!-- Watch party hugs the 16:9 player. Radio / idle still fill. -->
          <div
            class="moh-gutter-x flex items-start justify-center"
            :class="space?.mode === 'WATCH_PARTY' && space?.watchPartyUrl
              ? 'shrink-0 pb-2'
              : 'flex-1 min-h-0 pb-3 min-h-[40vh]'"
          >
            <!-- Watch Party mode: YouTube player.
                 ClientOnly prevents hydration mismatches — the server never renders
                 this component (spaceReady=false), so Vue must not try to hydrate it
                 when Suspense resolves and onMounted fires during the hydration phase.
                 spaceReady gates the inner v-if until after emitSpacesJoin so the
                 player's onMounted requestCurrentState fires while we're already in
                 the socket room. -->
            <template v-if="space?.mode === 'WATCH_PARTY' && space?.watchPartyUrl">
              <div
                class="w-full"
                :class="pinWatchPlayerForChat
                  ? 'fixed left-0 right-0 z-[var(--moh-z-pinned-player)] rounded-none'
                  : 'relative max-h-full aspect-video'"
                :style="pinWatchPlayerForChat
                  ? { top: 'var(--moh-safe-top, 0px)', height: WATCH_PLAYER_PINNED_HEIGHT }
                  : undefined"
              >
                <ClientOnly>
                  <SpaceYouTubePlayer
                    :space="space"
                    :room-ready="spaceReady"
                    class="absolute inset-0 w-full h-full"
                  />
                </ClientOnly>
              </div>
            </template>
            <!-- Watch party with no video yet -->
            <div
              v-else-if="space.mode === 'WATCH_PARTY'"
              class="flex w-full h-full min-h-[12rem] items-center justify-center rounded-xl moh-surface"
              role="status"
            >
              <div class="px-4 text-center">
                <Icon name="tabler:device-tv" class="text-[48px] moh-meta" aria-hidden="true" />
                <p class="mt-3 text-sm moh-text">No video set yet</p>
              </div>
            </div>
            <!-- Radio mode: audio visualizer -->
            <AppSpaceVisualizer
              v-else-if="space.mode === 'RADIO' && space.radioStreamUrl"
              class="w-full h-full"
            />
            <!-- None mode: calm idle hearth -->
            <AppSpaceIdleAmbiance v-else class="w-full h-full" />
          </div>

          <!-- Reactions + who is here -->
          <div class="moh-gutter-x pb-3 pt-2 shrink-0 border-t moh-border">
            <div class="flex items-center justify-between gap-3">
              <div v-if="space" class="flex min-w-0 flex-wrap items-center gap-1.5">
                <button
                  v-for="r in reactions"
                  :key="r.id"
                  type="button"
                  class="moh-tap moh-focus rounded-lg p-2 text-xl leading-none transition-transform active:scale-90 moh-surface-hover"
                  :aria-label="r.label"
                  @click="onReactionClick(r.id, r.emoji)"
                >
                  {{ r.emoji }}
                </button>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div
                  v-if="space && members.length"
                  class="flex items-center gap-2"
                >
                  <span class="moh-meta text-xs tabular-nums">{{ members.length }} here</span>
                  <div class="flex items-center -space-x-2">
                    <template v-for="u in presenceStack" :key="u.id">
                      <NuxtLink
                        v-if="u.username"
                        v-tooltip.bottom="tinyTooltip(`@${u.username}`)"
                        :to="`/u/${encodeURIComponent(u.username)}`"
                        class="relative moh-focus"
                        :aria-label="`View @${u.username}`"
                      >
                        <div :ref="(el) => setAvatarEl(u.id, el as HTMLElement | null)" class="relative">
                          <AppUserAvatar
                            :user="u"
                            size-class="h-8 w-8 ring-2 ring-[var(--moh-bg)]"
                            bg-class="moh-surface dark:bg-black"
                            :show-presence="false"
                          />
                          <Transition name="moh-avatar-pause-fade">
                            <div
                              v-if="space.mode === 'RADIO' && (u.paused || u.muted)"
                              class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center ring-1 ring-white/20"
                              aria-hidden="true"
                            >
                              <Icon
                                :name="u.paused ? 'tabler:player-pause' : 'tabler:volume-off'"
                                class="text-[11px] text-white"
                                aria-hidden="true"
                              />
                            </div>
                          </Transition>
                        </div>
                      </NuxtLink>
                      <div
                        v-else
                        v-tooltip.bottom="tinyTooltip('User')"
                        class="relative"
                      >
                        <div :ref="(el) => setAvatarEl(u.id, el as HTMLElement | null)" class="relative">
                          <AppUserAvatar
                            :user="u"
                            size-class="h-8 w-8 ring-2 ring-[var(--moh-bg)]"
                            bg-class="moh-surface dark:bg-black"
                            :show-presence="false"
                          />
                        </div>
                      </div>
                    </template>
                  </div>
                  <span
                    v-if="presenceOverflowCount > 0"
                    class="moh-meta text-xs font-semibold tabular-nums"
                  >+{{ presenceOverflowCount }}</span>
                </div>
                <button
                  type="button"
                  class="min-[962px]:hidden moh-tap moh-focus shrink-0 inline-flex items-center gap-1.5 rounded-full border moh-border-subtle px-3 py-1.5 text-xs font-medium moh-meta moh-surface-hover transition-colors"
                  :aria-label="spaceChatSheetOpen ? 'Close chat' : 'Open chat'"
                  @click="spaceChatSheetOpen = !spaceChatSheetOpen"
                >
                  <Icon name="tabler:messages" class="text-[14px]" aria-hidden="true" />
                  Chat
                </button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { useSpaceUsernamePage } from '~/composables/pages/spaces/useSpaceUsernamePage'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { WATCH_PLAYER_PINNED_HEIGHT } from '~/utils/watchPartyLayout'

definePageMeta({
  layout: 'app',
  title: 'Space',
  hideTopBar: true,
  keepalive: { max: 1 },
})

const {
  setAvatarEl,
  onReactionClick,
  onLeave,
  onToggleSpaceNotify,
  route,
  username,
  spaceChatSheetOpen,
  pinWatchPlayerForChat,
  isAuthed,
  canJoinSpace,
  presence,
  spaceLoading,
  space,
  displayTitle,
  displaySubtitle,
  spaceNotifyBusy,
  spaceReady,
  isOwner,
  spaceScheduleLabel,
  spaceStatusKind,
  showHostReminders,
  hostNotifyCount,
  showSpaceNotifyMe,
  presenceStack,
  presenceOverflowCount,
  spaceShareTooltip,
  spaceShareMenuItems,
  upsertSpace,
  members,
  requestCurrentState,
  user,
  reactions,
} = await useSpaceUsernamePage()
</script>

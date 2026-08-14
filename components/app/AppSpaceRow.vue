<template>
  <div
    class="relative overflow-hidden transition-colors"
    :class="[
      compact ? '' : rowKind === 'quiet' ? 'rounded-xl border moh-border px-2.5 py-1.5' : 'rounded-xl border moh-border p-2.5',
      !compact && selectedSpaceId === space.id ? 'bg-black/[0.03] dark:bg-white/[0.04]' : '',
    ]"
    @click.stop
  >
    <!-- Visualizer behind the row while this radio space is playing -->
    <div
      v-if="showRadioVisualizer"
      :style="{ opacity: SPACE_VISUALIZER_BACKGROUND_OPACITY }"
      class="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      <AppSpaceVisualizer background-only class="w-full h-full" />
    </div>

    <div
      class="relative z-10 flex items-center"
      :class="compact ? 'gap-2 px-3 py-1.5' : rowKind === 'quiet' ? 'gap-2.5' : 'gap-3'"
    >
      <div
        v-if="!compact && showWatchPoster"
        class="relative w-32 shrink-0 overflow-hidden rounded-lg aspect-video bg-black/10 dark:bg-white/10"
        aria-hidden="true"
      >
        <img
          v-if="posterSrc"
          :src="posterSrc"
          class="absolute inset-0 h-full w-full object-cover"
          alt=""
          loading="lazy"
          @error="onPosterError"
        >
        <div
          v-else
          class="absolute inset-0 flex items-center justify-center moh-text-muted"
        >
          <Icon name="tabler:device-tv" class="text-[22px] opacity-70" />
        </div>
      </div>
      <div
        v-else-if="!compact && rowKind === 'radio'"
        class="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/10 dark:bg-white/10 moh-text-muted"
        aria-hidden="true"
      >
        <Icon :name="tileIcon" class="relative z-10 text-[22px] opacity-80" />
      </div>
      <div
        v-else-if="!compact"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/10 dark:bg-white/10 moh-text-muted"
        aria-hidden="true"
      >
        <Icon :name="tileIcon" class="text-[16px] opacity-70" />
      </div>

      <!-- Enter (preview embeds are non-interactive chrome) -->
      <button
        v-if="!preview"
        type="button"
        class="min-w-0 flex-1 text-left moh-focus"
        :class="compact ? 'py-0' : 'py-0.5'"
        :aria-label="`Enter ${displayTitle}`"
        @click="onEnterSpace"
      >
        <div class="flex items-center gap-1.5 leading-none min-w-0">
          <span
            class="font-semibold moh-text truncate"
            :class="compact ? 'text-xs' : 'text-sm'"
          >{{ displayTitle }}</span>
          <AppSpaceStatusBadge :kind="statusKind" :size="compact ? 'sm' : 'md'" />
        </div>
        <div
          v-if="!compact && metaLine"
          class="mt-1 text-[11px] moh-meta leading-none truncate"
        >{{ metaLine }}</div>
      </button>
      <div
        v-else
        class="min-w-0 flex-1"
        :class="compact ? 'py-0' : 'py-0.5'"
      >
        <div class="flex items-center gap-1.5 leading-none min-w-0">
          <span
            class="font-semibold moh-text truncate"
            :class="compact ? 'text-xs' : 'text-sm'"
          >{{ displayTitle }}</span>
          <AppSpaceStatusBadge :kind="statusKind" :size="compact ? 'sm' : 'md'" />
        </div>
        <div
          v-if="!compact && metaLine"
          class="mt-1 text-[11px] moh-meta leading-none truncate"
        >{{ metaLine }}</div>
      </div>

      <!-- Notify + share + play — hidden in feed preview and compact chat embeds -->
      <div
        v-if="!preview && !compact"
        class="shrink-0 flex items-center gap-0.5"
      >
        <AppSpaceNotifyCount
          v-if="showHostReminders"
          :count="hostNotifyCount"
          :compact="compact"
        />
        <button
          v-else-if="showNotifyMe"
          type="button"
          class="moh-tap moh-focus inline-flex items-center justify-center rounded-full font-semibold transition-colors"
          :class="[
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
            space.viewerSubscribed
              ? 'bg-[var(--p-primary-color)]/15 text-[var(--p-primary-color)]'
              : 'moh-surface-hover moh-meta',
          ]"
          :disabled="notifyBusy"
          :aria-label="space.viewerSubscribed ? 'Stop notifications' : 'Notify me'"
          @click.stop="onToggleNotify"
        >
          {{ space.viewerSubscribed ? (compact ? 'On' : 'Notifying') : (compact ? 'Notify' : 'Notify me') }}
        </button>
        <AppPostRowShareMenu
          v-if="!compact"
          :can-share="true"
          :tooltip="shareTooltip"
          :items="shareItems"
        />
        <button
          v-if="space.mode === 'RADIO' && space.radioStreamUrl"
          type="button"
          class="moh-tap moh-focus inline-flex items-center justify-center rounded-full transition-colors moh-surface-hover"
          :class="compact ? 'h-7 w-7' : 'h-9 w-9'"
          :aria-label="selectedSpaceId === space.id && isPlaying ? 'Pause' : 'Play'"
          @click.stop="onPlaySpace"
        >
          <Icon
            :name="selectedSpaceId === space.id && isPlaying ? 'tabler:player-pause' : 'tabler:player-play'"
            :class="compact ? 'text-[14px]' : 'text-[17px]'"
            class="opacity-90"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import type { Space } from '~/types/api'
import { siteConfig } from '~/config/site'
import { SPACE_VISUALIZER_BACKGROUND_OPACITY, primeSpaceAudioContext } from '~/composables/useSpaceAudio'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
import { getYouTubePosterUrls } from '~/utils/link-utils'
import { spaceCardMetaLine, spaceLobbyRowKind, spaceStatusKind } from '~/utils/space-display'

const props = defineProps<{
  space: Space
  preview?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  spaceUpdated: [space: Space]
}>()

const { selectedSpaceId, select, lobbyCountForSpace } = useSpaceLobby()
const { isPlaying, playSpace, pause } = useSpaceAudio()
const { user } = useAuth()
const { subscribeToSchedule, unsubscribeFromSchedule } = useSpaceOwner()
const { upsertSpace } = useSpaces()
const { confirm } = useAppConfirm()

const toast = useAppToast()

const liveListenerCount = computed(() => lobbyCountForSpace(props.space.id))
const { copyText: copyToClipboard } = useCopyToClipboard()
const notifyBusy = ref(false)

type MenuItemWithIcon = MenuItem & { iconName?: string }

const displayTitle = useSpaceDisplayTitle(() => props.space)
const statusKind = computed(() => spaceStatusKind(props.space))
const rowKind = computed(() => spaceLobbyRowKind(props.space))
const metaLine = computed(() =>
  spaceCardMetaLine(props.space, {
    hostUsername: props.space.owner?.username ?? null,
    hereCount: liveListenerCount.value,
  }),
)

const showWatchPoster = computed(() => rowKind.value === 'watch')
const showRadioVisualizer = computed(() => (
  props.space.mode === 'RADIO'
  && selectedSpaceId.value === props.space.id
  && isPlaying.value
))

const youtubePosterUrls = computed(() =>
  showWatchPoster.value && props.space.watchPartyUrl
    ? getYouTubePosterUrls(props.space.watchPartyUrl)
    : null,
)
const posterTier = ref<'maxres' | 'fallback' | 'none'>('maxres')
watch(() => props.space.watchPartyUrl, () => {
  posterTier.value = 'maxres'
})
const posterSrc = computed(() => {
  if (!youtubePosterUrls.value || posterTier.value === 'none') return null
  return posterTier.value === 'fallback'
    ? youtubePosterUrls.value.fallback
    : youtubePosterUrls.value.maxres
})
function onPosterError() {
  posterTier.value = posterTier.value === 'maxres' ? 'fallback' : 'none'
}

const tileIcon = computed(() =>
  props.space.mode === 'RADIO' ? 'tabler:radio' : rowKind.value === 'watch' ? 'tabler:device-tv' : 'tabler:flame',
)

const isOwnSpace = computed(() => Boolean(
  user.value?.id && props.space.owner?.id && props.space.owner.id === user.value.id,
))

/** Host always gets reminders — locked chip, not a toggle. */
const showHostReminders = computed(() => statusKind.value === 'scheduled' && isOwnSpace.value)

const hostNotifyCount = computed(() => Math.max(0, Number(props.space.subscriberCount) || 0))

const showNotifyMe = computed(() => {
  if (!user.value?.id) return false
  if (statusKind.value !== 'scheduled') return false
  if (isOwnSpace.value) return false
  return true
})

const shareTooltip = tinyTooltip('Share')
const shareItems = computed<MenuItemWithIcon[]>(() => [
  {
    label: 'Copy link',
    iconName: 'tabler:link',
    command: async () => {
      if (!import.meta.client) return
      const url = props.space.owner?.username
        ? `${siteConfig.url}/s/${encodeURIComponent(props.space.owner.username)}`
        : `${siteConfig.url}/spaces`
      try {
        await copyToClipboard(url)
        toast.push({ title: 'Space link copied', tone: 'public', durationMs: 1400 })
      } catch {
        toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
      }
    },
  },
])

async function onToggleNotify() {
  if (notifyBusy.value) return
  if (props.space.viewerSubscribed) {
    const ok = await confirm({
      header: 'Stop notifications?',
      message: 'You will no longer get reminders when this space is about to go live.',
      confirmLabel: 'Stop notifying',
      confirmSeverity: 'danger',
      cancelLabel: 'Keep notifying',
    })
    if (!ok) return
  }
  notifyBusy.value = true
  try {
    const updated = props.space.viewerSubscribed
      ? await unsubscribeFromSchedule(props.space.id)
      : await subscribeToSchedule(props.space.id)
    if (updated) {
      upsertSpace(updated)
      emit('spaceUpdated', updated)
      toast.push({
        title: updated.viewerSubscribed ? 'You will be notified' : 'Notifications off',
        tone: 'public',
        durationMs: 1400,
      })
    }
  } finally {
    notifyBusy.value = false
  }
}
function onEnterSpace() {
  const isSameSpace = selectedSpaceId.value === props.space.id
  const wasPlaying = isPlaying.value
  if (!isSameSpace && wasPlaying && props.space.mode === 'RADIO') primeSpaceAudioContext()
  void select(props.space.id).then(() => {
    if (!isSameSpace && wasPlaying && props.space.mode === 'RADIO') {
      void playSpace(props.space)
    }
    const owner = props.space.owner?.username
    if (owner) {
      navigateTo(`/s/${encodeURIComponent(owner)}`)
    }
  })
}

function onPlaySpace() {
  primeSpaceAudioContext()
  void select(props.space.id).then(() => {
    if (isPlaying.value && selectedSpaceId.value === props.space.id) {
      pause()
    } else {
      void playSpace(props.space)
    }
  })
}
</script>

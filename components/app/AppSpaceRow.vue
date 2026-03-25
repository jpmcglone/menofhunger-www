<template>
  <div
    class="relative overflow-hidden transition-colors"
    :class="[
      preview || compact ? '' : 'border-b moh-border',
      !compact && selectedSpaceId === space.id ? 'bg-black/[0.03] dark:bg-white/[0.04]' : '',
    ]"
    @click.stop
  >
    <!-- Visualizer background when this space is playing in radio mode -->
    <div
      v-if="selectedSpaceId === space.id && isPlaying && space.mode === 'RADIO'"
      :style="{ opacity: SPACE_VISUALIZER_BACKGROUND_OPACITY }"
      class="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      <AppSpaceVisualizer background-only class="w-full h-full" />
    </div>

    <!-- Row content -->
    <div
      class="relative z-10 flex items-center"
      :class="compact ? 'gap-2 px-3 py-1.5' : 'gap-3 px-4 py-2.5'"
    >
      <!-- Owner avatar -->
      <div v-if="!compact" class="shrink-0">
        <AppUserAvatar
          :user="{ id: space.owner?.id ?? '', username: space.owner?.username ?? null, avatarUrl: space.owner?.avatarUrl ?? null }"
          size-class="h-8 w-8"
          bg-class="moh-surface dark:bg-black"
          :show-presence="false"
        />
      </div>

      <!-- Far left: lobby count badge -->
      <span
        :class="[
          'inline-flex items-center justify-center px-1 rounded font-medium tabular-nums shrink-0',
          'moh-text-muted bg-black/10 dark:bg-white/10',
          compact ? 'min-w-[1rem] h-4 text-[10px]' : 'min-w-[1.25rem] h-5 text-[11px]',
          (space.listenerCount ?? 0) === 0 ? 'invisible' : '',
        ]"
        aria-hidden="true"
      >{{ space.listenerCount ?? 0 }}</span>

      <!-- Left: enter button -->
      <button
        type="button"
        class="min-w-0 flex-1 text-left moh-focus"
        :class="compact ? 'py-0' : 'py-0.5'"
        :aria-label="`Enter ${space.title}`"
        @click="onEnterSpace"
      >
        <!-- Compact: single line -->
        <div v-if="compact" class="flex items-center gap-1.5 leading-none">
          <span class="font-semibold moh-text text-xs truncate">{{ space.title }}</span>
          <span
            v-if="selectedSpaceId === space.id"
            class="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[var(--p-primary-color)]/15 text-[var(--p-primary-color)]"
          >
            Active
          </span>
          <Icon
            v-if="space.mode === 'WATCH_PARTY'"
            name="tabler:device-tv"
            class="shrink-0 text-[10px] moh-meta opacity-70"
            aria-hidden="true"
            v-tooltip.top="tinyTooltip('Watch Party')"
          />
          <Icon
            v-else-if="space.mode === 'RADIO'"
            name="tabler:radio"
            class="shrink-0 text-[10px] moh-meta opacity-70"
            aria-hidden="true"
            v-tooltip.top="tinyTooltip('Radio')"
          />
        </div>

        <!-- Standard: two lines -->
        <template v-else>
          <div class="flex items-center gap-1.5 leading-snug">
            <span class="font-semibold moh-text text-sm">{{ space.title }}</span>
            <span
              v-if="selectedSpaceId === space.id"
              class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[var(--p-primary-color)]/15 text-[var(--p-primary-color)]"
            >
              Active
            </span>
            <Icon
              v-if="space.mode === 'WATCH_PARTY'"
              name="tabler:device-tv"
              class="shrink-0 text-[13px] moh-meta opacity-60"
              aria-hidden="true"
              v-tooltip.top="tinyTooltip('Watch Party')"
            />
            <Icon
              v-else-if="space.mode === 'RADIO'"
              name="tabler:radio"
              class="shrink-0 text-[13px] moh-meta opacity-60"
              aria-hidden="true"
              v-tooltip.top="tinyTooltip('Radio')"
            />
          </div>
          <div class="mt-0.5 text-[11px] moh-meta leading-none">
            <span v-if="space.owner?.username">@{{ space.owner.username }}</span>
          </div>
        </template>
      </button>

      <!-- Right: share + play (radio only) -->
      <div class="shrink-0 flex items-center" :class="compact ? 'gap-0' : 'gap-0.5'">
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

const props = defineProps<{
  space: Space
  preview?: boolean
  compact?: boolean
}>()

const { selectedSpaceId, select } = useSpaceLobby()
const { isPlaying, playSpace, pause } = useSpaceAudio()

const toast = useAppToast()
const { copyText: copyToClipboard } = useCopyToClipboard()

type MenuItemWithIcon = MenuItem & { iconName?: string }

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

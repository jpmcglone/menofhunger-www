<template>
  <!-- Hidden when Marv is globally disabled or the viewer hasn't loaded yet. -->
  <div v-if="hidden" />

  <!-- Premium-eligible row: real navigation to the marv conversation. -->
  <NuxtLink
    v-else-if="showRow"
    :to="conversationPath"
    class="block w-full text-left"
    :data-testid="dataTestid"
    @click="onClick"
  >
    <div
      :class="[
        'moh-marv-pinned-surface w-full px-4 py-2 transition-colors',
        isSelected ? 'moh-pane-row-active' : 'hover:bg-amber-50/40 dark:hover:bg-amber-500/10',
      ]"
    >
      <div class="flex items-center gap-3">
        <!-- Marv's real avatar with a subtle AI sparkle overlay -->
        <div class="relative shrink-0">
          <AppUserAvatar
            :user="marvUser"
            size-class="h-9 w-9"
            :enable-preview="false"
            :show-presence="false"
            :show-status="false"
          />
          <!-- AI indicator: small sparkle, tucked into the bottom-right of the avatar -->
          <span
            class="moh-marv-ai-spark pointer-events-none absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-amber-400 via-rose-400 to-violet-500 text-white shadow-sm dark:border-zinc-950"
            aria-label="AI"
            title="AI helper"
          >
            <Icon name="tabler:sparkles" class="text-[9px]" aria-hidden="true" />
          </span>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <div class="font-semibold truncate moh-text moh-marv-name">{{ displayName }}</div>
            <div
              v-if="creditsLabel"
              class="ml-auto shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400"
            >
              {{ creditsLabel }}
            </div>
          </div>
        </div>

        <span
          v-if="unreadCount > 0"
          class="ml-2 inline-flex min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] justify-center text-center tabular-nums bg-violet-600 text-white"
          aria-label="Unread messages"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </div>
    </div>
  </NuxtLink>

  <!-- Non-premium CTA: small card linking to /tiers. -->
  <NuxtLink
    v-else
    to="/tiers"
    class="block w-full text-left"
    :data-testid="`${dataTestid}-cta`"
  >
    <div
      class="moh-marv-pinned-surface w-full px-4 py-2 transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-500/10"
    >
      <div class="flex items-center gap-3">
        <div class="relative shrink-0">
          <AppUserAvatar
            :user="marvUser"
            size-class="h-9 w-9"
            :enable-preview="false"
            :show-presence="false"
            :show-status="false"
          />
          <span
            class="moh-marv-ai-spark pointer-events-none absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-amber-400 via-rose-400 to-violet-500 text-white shadow-sm dark:border-zinc-950"
            aria-hidden="true"
          >
            <Icon name="tabler:sparkles" class="text-[9px]" aria-hidden="true" />
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <div class="font-semibold truncate moh-text moh-marv-name">Meet {{ displayName }}</div>
            <span
              class="ml-auto shrink-0 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
            >
              Premium
            </span>
          </div>
        </div>
        <Icon name="tabler:chevron-right" class="text-base text-gray-400" aria-hidden="true" />
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  /** True when the marv DM conversation is the currently-selected chat. */
  isSelected: { type: Boolean, default: false },
  /** When the viewer already has a marv conversation, this is its id. */
  conversationId: { type: [String, null] as PropType<string | null>, default: null },
  /** Number of unread messages from Marv. */
  unreadCount: { type: Number, default: 0 },
  /** For testing/QA hooks. */
  dataTestid: { type: String, default: 'chat-marv-pinned-row' },
})

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const {
  isAvailable,
  enabled,
  isPremium,
  marvDisplayName,
  marvUsername,
  marvAvatarUrl,
  credits,
  marvUserId,
} = useMarv()

const hidden = computed(() => !enabled.value || !marvUserId.value)
const showRow = computed(() => isAvailable.value)
const displayName = computed(() => marvDisplayName.value ?? 'Marv')

/**
 * Synthetic user object for `AppUserAvatar`. We construct it from the cached
 * `MarvinMeDto.marv` payload rather than fetching a UserDto for Marv — saves
 * a round-trip and keeps this component self-contained.
 */
const marvUser = computed(() => ({
  id: marvUserId.value ?? 'marv',
  avatarUrl: marvAvatarUrl.value,
  name: marvDisplayName.value,
  username: marvUsername.value,
}))

const conversationPath = computed(() => {
  if (props.conversationId) return `/chat?c=${encodeURIComponent(props.conversationId)}`
  // Without an existing conversation id, route to a "draft" marv chat the page can resolve on mount.
  return '/chat?marv=1'
})

const creditsLabel = computed(() => {
  if (!isPremium.value) return null
  const c = credits.value
  if (!c) return null
  const n = Math.floor(c.credits)
  return `${n.toLocaleString()} credits`
})

function onClick(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  if (props.conversationId) {
    event.preventDefault()
    emit('select', props.conversationId)
  }
}
</script>

<style>
.moh-marv-pinned-surface {
  position: relative;
  background: linear-gradient(
    135deg,
    rgba(245, 158, 11, 0.06),
    rgba(244, 114, 182, 0.06) 50%,
    rgba(139, 92, 246, 0.06)
  );
}
:root.dark .moh-marv-pinned-surface,
.dark .moh-marv-pinned-surface {
  background: linear-gradient(
    135deg,
    rgba(245, 158, 11, 0.10),
    rgba(244, 114, 182, 0.10) 50%,
    rgba(139, 92, 246, 0.10)
  );
}

/*
 * Subtle "AI" shimmer on the name. Cycles a soft warm gradient across the text
 * on a slow, gentle loop — enough to signal "this is an AI helper" without
 * being a flashing badge. Respects `prefers-reduced-motion`.
 */
.moh-marv-name {
  background: linear-gradient(
    90deg,
    currentColor 0%,
    currentColor 35%,
    rgba(245, 158, 11, 0.85) 50%,
    rgba(244, 114, 182, 0.85) 60%,
    currentColor 75%,
    currentColor 100%
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: moh-marv-name-shimmer 6s ease-in-out infinite;
}
@keyframes moh-marv-name-shimmer {
  0%, 100% { background-position: 100% 0; }
  50%      { background-position: 0% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .moh-marv-name { animation: none; background: none; color: inherit; -webkit-text-fill-color: inherit; }
}

/*
 * The sparkle badge gets a slow gentle pulse so it reads as alive but not
 * attention-grabbing. Kept inside the avatar bounds so layout doesn't shift.
 */
.moh-marv-ai-spark {
  animation: moh-marv-spark-pulse 4s ease-in-out infinite;
}
@keyframes moh-marv-spark-pulse {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50%      { transform: scale(1.08); filter: brightness(1.18); }
}
@media (prefers-reduced-motion: reduce) {
  .moh-marv-ai-spark { animation: none; }
}
</style>

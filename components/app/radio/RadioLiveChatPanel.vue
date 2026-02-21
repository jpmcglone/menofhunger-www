<template>
  <section class="h-full min-h-0 flex flex-col">
    <header
      v-if="showHeader"
      class="shrink-0 px-4 py-3 border-b moh-border-subtle flex items-center justify-between gap-3"
    >
      <AppLiveChatHeader :title="stationName" :message-count="chatMessageCount" title-class="moh-h2" />
    </header>

    <div class="relative flex-1 min-h-0">
      <div
        ref="scrollerEl"
        class="no-scrollbar h-full overflow-y-auto overscroll-y-contain"
        @scroll="onScrollerScroll"
        @wheel.passive="markUserScrollIntent"
        @touchstart.passive="markUserScrollIntent"
        @touchmove.passive="markUserScrollIntent"
      >
        <div v-if="!spaceId" class="px-4 py-6 text-sm text-gray-600 dark:text-gray-300">
          Select a space to see its chat.
        </div>
        <div v-else-if="messages.length === 0" class="px-4 py-6 text-sm text-gray-600 dark:text-gray-300">
          No messages yet. Say hello.
        </div>
        <RadioLiveChatMessageList v-else :messages="messages" />

        <Transition name="moh-typing-fade">
          <div
            v-if="spaceId && typingUsersTotalCount > 0"
            class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 truncate"
            role="status"
            aria-live="polite"
          >
            <template v-if="typingUsersTotalCount === 1">
              <span class="font-semibold" :class="typingNameClass(typingUsersForDisplay[0]!)">
                @{{ typingUsersForDisplay[0]!.username }}
              </span>
              <span class="ml-1">is typing…</span>
            </template>
            <template v-else>
              <span class="font-semibold" :class="typingNameClass(typingUsersForDisplay[0]!)">
                @{{ typingUsersForDisplay[0]!.username }}
              </span>
              <span class="mx-1">and</span>
              <span class="font-semibold" :class="typingNameClass(typingUsersForDisplay[1]!)">
                @{{ typingUsersForDisplay[1]!.username }}
              </span>
              <span v-if="typingUsersTotalCount > 2" class="ml-1">and others</span>
              <span class="ml-1">are typing…</span>
            </template>
          </div>
        </Transition>
      </div>

      <!-- Custom thin pill scrollbar (native scrollbar hidden) -->
      <div
        v-if="scrollPillNeeded"
        class="pointer-events-none absolute right-1 top-2 bottom-2 z-10 w-[4px] transition-opacity duration-200 ease-out"
        :class="scrollPillVisible ? 'opacity-90' : 'opacity-0'"
        aria-hidden="true"
      >
        <div
          class="w-full rounded-full transition-[height,transform] duration-150 ease-out will-change-transform"
          :style="scrollPillThumbStyle"
        />
      </div>

      <Transition name="moh-fade">
        <button
          v-if="showScrollToBottomButton"
          type="button"
          class="absolute left-1/2 bottom-4 z-10 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg cursor-pointer border moh-border bg-white/90 text-gray-900 hover:bg-white dark:bg-zinc-900/90 dark:text-gray-100 dark:hover:bg-zinc-900"
          @click="onScrollToBottomClick"
        >
          <Icon name="tabler:arrow-down" class="mr-1 inline-block text-xs" aria-hidden="true" />
          <span>{{ pendingNewLabel }}</span>
        </button>
      </Transition>
    </div>

    <div
      ref="chatBarEl"
      class="shrink-0 w-full border-t moh-border-subtle px-3 sm:px-4 pt-2 pb-2 flex flex-col justify-end gap-2"
      :style="{ minHeight: 'var(--moh-radio-bar-height, 4rem)' }"
    >
      <AppDmComposer
        v-model="composerText"
        :user="composerUser"
        :disabled="!spaceId"
        :placeholder="spaceId ? 'Chat…' : 'Select a space to chat…'"
        :priority-users="lobbyMentionCandidates"
        :priority-section-title="stationName"
        @send="onSend"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBottomAnchoredList } from '~/composables/useBottomAnchoredList'
import RadioLiveChatMessageList from '~/components/app/radio/RadioLiveChatMessageList.vue'
import AppDmComposer from '~/components/app/DmComposer.vue'
import { userColorTier } from '~/utils/user-tier'
import type { FollowListUser } from '~/types/api'

withDefaults(defineProps<{ showHeader?: boolean }>(), {
  showHeader: true,
})

const { spaceId, messages, sendMessage, typingNameClass, typingUsersForDisplay, typingUsersTotalCount } = useSpaceLiveChat({
  passive: true,
})
const { currentSpace, members } = useSpaceLobby()
const { user } = useAuth()

const lobbyMentionCandidates = computed<FollowListUser[]>(() =>
  members.value
    .filter((m) => Boolean(m.username))
    .map((m) => ({
      id: m.id,
      username: m.username,
      name: null,
      premium: m.premium,
      premiumPlus: m.premiumPlus,
      isOrganization: m.isOrganization,
      stewardBadgeEnabled: false,
      verifiedStatus: m.verifiedStatus,
      avatarUrl: m.avatarUrl,
      relationship: { viewerFollowsUser: false, userFollowsViewer: false, viewerPostNotificationsEnabled: false },
    })),
)
const presence = usePresence()

const stationName = computed(() => currentSpace.value?.name ?? 'Space')
const chatMessageCount = computed(() => messages.value.filter(m => m.kind === 'user').length)

const scrollerEl = ref<HTMLElement | null>(null)
const {
  atBottom,
  pendingNewCount,
  showScrollToBottomButton,
  pendingNewLabel,
  scrollToBottom,
  onNewItemsAppended,
  onScrollToBottomClick,
} = useBottomAnchoredList(scrollerEl)

const composerText = ref('')
const composerUser = computed(() => user.value ?? null)
const chatBarEl = ref<HTMLElement | null>(null)

const scrollPillTopPx = ref(0)
const scrollPillHeightPx = ref(0)
const scrollPillVisible = ref(false)
let scrollPillHideTimer: ReturnType<typeof setTimeout> | null = null
let lastUserScrollIntentAt = 0
const USER_SCROLL_GRACE_MS = 2000

function scheduleAfterFrame(fn: () => void) {
  if (!import.meta.client) return
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fn)
  else setTimeout(fn, 0)
}

const scrollPillNeeded = computed(() => {
  const el = scrollerEl.value
  if (!el) return false
  return el.scrollHeight > el.clientHeight + 1
})

const scrollPillColor = computed(() => {
  const tier = userColorTier(user.value as any)
  if (tier === 'organization') return 'var(--moh-org)'
  if (tier === 'premium') return 'var(--moh-premium)'
  if (tier === 'verified') return 'var(--moh-verified)'
  return 'rgba(148, 163, 184, 0.9)' // neutral
})

const scrollPillThumbStyle = computed<Record<string, string>>(() => {
  const h = Math.max(0, Math.floor(scrollPillHeightPx.value))
  const y = Math.max(0, Math.floor(scrollPillTopPx.value))
  return {
    height: `${h}px`,
    transform: `translateY(${y}px)`,
    background: scrollPillColor.value,
  }
})

function updateScrollPill() {
  const el = scrollerEl.value
  if (!el) return
  // Overlay track is `top-2 bottom-2` => 8px inset each side.
  const insetPx = 8
  const trackH = Math.max(0, el.clientHeight - insetPx * 2)
  const scrollable = Math.max(1, el.scrollHeight - el.clientHeight)
  if (trackH <= 0 || el.scrollHeight <= el.clientHeight + 1) {
    scrollPillHeightPx.value = 0
    scrollPillTopPx.value = 0
    scrollPillVisible.value = false
    return
  }
  const ratio = el.clientHeight / el.scrollHeight
  const minThumb = 18
  const thumbH = Math.min(trackH, Math.max(minThumb, Math.floor(trackH * ratio)))
  const maxTop = Math.max(0, trackH - thumbH)
  const scrollRatio = el.scrollTop / scrollable
  scrollPillHeightPx.value = thumbH
  scrollPillTopPx.value = Math.floor(maxTop * scrollRatio)
}

function kickScrollPillVisibility() {
  if (!scrollPillNeeded.value) {
    scrollPillVisible.value = false
    return
  }
  scrollPillVisible.value = true
  if (scrollPillHideTimer) clearTimeout(scrollPillHideTimer)
  scrollPillHideTimer = setTimeout(() => {
    scrollPillHideTimer = null
    scrollPillVisible.value = false
  }, 1200)
}

function markUserScrollIntent() {
  if (!import.meta.client) return
  lastUserScrollIntentAt = Date.now()
  kickScrollPillVisibility()
}

function onScrollerScroll() {
  updateScrollPill()
  // Only show pill for user-driven scrolling (programmatic scrolls shouldn't surface it).
  if (import.meta.client && Date.now() - lastUserScrollIntentAt < USER_SCROLL_GRACE_MS) {
    kickScrollPillVisibility()
  }
}

let scrollPillRo: ResizeObserver | null = null
watch(
  scrollerEl,
  (el, prev) => {
    if (!import.meta.client) return
    if (!scrollPillRo && typeof ResizeObserver === 'function') {
      scrollPillRo = new ResizeObserver(() => updateScrollPill())
    }
    if (prev && scrollPillRo) scrollPillRo.unobserve(prev)
    if (el && scrollPillRo) {
      scrollPillRo.observe(el)
      requestAnimationFrame(() => {
        updateScrollPill()
      })
    }
  },
  { flush: 'post' },
)

let chatBarResizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (!import.meta.client) return
  if (typeof ResizeObserver !== 'function') return
  chatBarResizeObserver = new ResizeObserver(() => {
    // If the user was pinned to bottom, keep them pinned when the composer grows/shrinks.
    if (!atBottom.value) return
    scrollToBottom('auto')
    scheduleAfterFrame(() => scrollToBottom('auto'))
  })
  if (chatBarEl.value) chatBarResizeObserver.observe(chatBarEl.value)
})

watch(
  () => typingUsersTotalCount.value,
  () => {
    if (!import.meta.client) return
    if (!spaceId.value) return
    if (!atBottom.value) return
    scheduleAfterFrame(() => scrollToBottom('auto'))
    scheduleAfterFrame(() => updateScrollPill())
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (chatBarResizeObserver) {
    chatBarResizeObserver.disconnect()
    chatBarResizeObserver = null
  }
})

function onSend() {
  if (!spaceId.value) return
  const text = composerText.value.trim()
  if (!text) return
  // Stop typing immediately when sending.
  try {
    presence.emitSpacesTyping(spaceId.value, false)
  } catch {
    // ignore
  }
  sendMessage(text)
  composerText.value = ''
  // Best-effort: keep view pinned when sending while at bottom.
  scheduleAfterFrame(() => scrollToBottom('auto'))
}

const didInitScroll = ref(false)

let typingStartTimer: ReturnType<typeof setTimeout> | null = null
let typingStopTimer: ReturnType<typeof setTimeout> | null = null

watch(
  [composerText, spaceId],
  ([text, sid], [prevText, prevSid]) => {
    if (!import.meta.client) return
    const prevId = String(prevSid ?? '').trim()
    const nextId = String(sid ?? '').trim()

    // Space switched (or cleared): ensure we stop typing in the old one.
    if (prevId && prevId !== nextId) {
      if (typingStartTimer) clearTimeout(typingStartTimer)
      if (typingStopTimer) clearTimeout(typingStopTimer)
      typingStartTimer = null
      typingStopTimer = null
      try {
        presence.emitSpacesTyping(prevId, false)
      } catch {
        // ignore
      }
      return
    }

    if (!nextId) return

    const has = Boolean(String(text ?? '').trim().length > 0)
    if (!has) {
      if (typingStartTimer) clearTimeout(typingStartTimer)
      typingStartTimer = null
      if (typingStopTimer) clearTimeout(typingStopTimer)
      typingStopTimer = setTimeout(() => {
        typingStopTimer = null
        presence.emitSpacesTyping(nextId, false)
      }, 120)
      return
    }

    if (!typingStartTimer) {
      typingStartTimer = setTimeout(() => {
        typingStartTimer = null
        presence.emitSpacesTyping(nextId, true)
      }, 220)
    }
    if (typingStopTimer) clearTimeout(typingStopTimer)
    typingStopTimer = setTimeout(() => {
      typingStopTimer = null
      presence.emitSpacesTyping(nextId, false)
    }, 1600)
  },
)

onBeforeUnmount(() => {
  if (typingStartTimer) clearTimeout(typingStartTimer)
  if (typingStopTimer) clearTimeout(typingStopTimer)
  typingStartTimer = null
  typingStopTimer = null
  if (spaceId.value) {
    try {
      presence.emitSpacesTyping(spaceId.value, false)
    } catch {
      // ignore
    }
  }
})

watch(
  spaceId,
  () => {
    didInitScroll.value = false
    pendingNewCount.value = 0
    scheduleAfterFrame(() => scrollToBottom('auto'))
  },
  { immediate: true },
)

watch(
  () => messages.value.length,
  (len, prev) => {
    if (!import.meta.client) return
    if (!spaceId.value) return
    if (!scrollerEl.value) return

    if (!didInitScroll.value) {
      didInitScroll.value = true
      pendingNewCount.value = 0
      scheduleAfterFrame(() => scrollToBottom('auto'))
      scheduleAfterFrame(() => updateScrollPill())
      return
    }

    const next = Math.max(0, Math.floor(Number(len) || 0))
    const prevN = Math.max(0, Math.floor(Number(prev) || 0))
    if (next > prevN) onNewItemsAppended({ count: next - prevN })
    scheduleAfterFrame(() => updateScrollPill())
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (scrollPillHideTimer) {
    clearTimeout(scrollPillHideTimer)
    scrollPillHideTimer = null
  }
  if (scrollPillRo) {
    scrollPillRo.disconnect()
    scrollPillRo = null
  }
})
</script>


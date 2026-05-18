<template>
  <Transition name="typing-expand">
    <div
      v-if="displayUsers.length > 0"
      class="typing-expand-outer"
    >
      <div
        class="typing-expand-inner text-sm text-gray-500 dark:text-gray-400"
        :class="size === 'compact' ? 'py-1' : 'py-2'"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-center gap-1 flex-wrap truncate">
        <!-- First user -->
        <component
          :is="hoverPreview ? NuxtLink : 'span'"
          :to="hoverPreview ? `/u/${encodeURIComponent(displayUsers[0]!.username)}` : undefined"
          class="font-semibold"
          :class="[tierClass(displayUsers[0]!), hoverPreview ? 'hover:underline underline-offset-2' : '']"
          @click.stop
          @mouseenter="(e: MouseEvent) => trigger.onEnter(displayUsers[0]!.username, e)"
          @mousemove="(e: MouseEvent) => trigger.onMove(e)"
          @mouseleave="trigger.onLeave"
        >@{{ displayUsers[0]!.username }}</component>

        <template v-if="totalCount === 1">
          <Transition name="moh-fade" mode="out-in">
            <span v-if="displayUsers[0]!.status === 'thinking'" key="thinking">is <span class="text-violet-500 dark:text-violet-400">thinking</span>…</span>
            <span v-else key="verb">is <span class="typing-wave" aria-hidden="true"><span
              v-for="(char, i) in verbChars"
              :key="i"
              class="typing-wave-char"
              :style="{ animationDelay: `${i * 60}ms` }"
            >{{ char }}</span></span></span>
          </Transition>
        </template>

        <template v-else>
          <span>and</span>

          <!-- Second user -->
          <component
            :is="hoverPreview ? NuxtLink : 'span'"
            :to="hoverPreview ? `/u/${encodeURIComponent(displayUsers[1]!.username)}` : undefined"
            class="font-semibold"
            :class="[tierClass(displayUsers[1]!), hoverPreview ? 'hover:underline underline-offset-2' : '']"
            @click.stop
            @mouseenter="(e: MouseEvent) => trigger.onEnter(displayUsers[1]!.username, e)"
            @mousemove="(e: MouseEvent) => trigger.onMove(e)"
            @mouseleave="trigger.onLeave"
          >@{{ displayUsers[1]!.username }}</component>

          <span v-if="totalCount > 2">and others</span>
          <span>are <span class="typing-wave" aria-hidden="true"><span
            v-for="(char, i) in verbChars"
            :key="i"
            class="typing-wave-char"
            :style="{ animationDelay: `${i * 60}ms` }"
          >{{ char }}</span></span></span>
        </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import type { TypingUserDisplay } from '~/composables/chat/useChatTyping'

const props = withDefaults(
  defineProps<{
    users: TypingUserDisplay[]
    /** Verb used in the copy: "replying", "typing", or "commenting". */
    verb?: 'replying' | 'typing' | 'commenting'
    /** Max names to show (remaining users become "and others"). */
    maxNamesShown?: number
    /** Whether @names link to profiles and show a hover preview card. */
    hoverPreview?: boolean
    /** 'compact' reduces vertical padding for inline-in-post use. */
    size?: 'default' | 'compact'
  }>(),
  {
    verb: 'replying',
    maxNamesShown: 2,
    hoverPreview: true,
    size: 'default',
  },
)

const trigger = useUserPreviewMultiTrigger()

const totalCount = computed(() => props.users.length)
const displayUsers = computed(() => props.users.slice(0, props.maxNamesShown))
const verbChars = computed(() => [...(props.verb + '\u2026')])

function tierClass(user: TypingUserDisplay): string {
  if (user.tier === 'organization') return 'text-[var(--moh-org)]'
  if (user.tier === 'premium') return 'text-[var(--moh-premium)]'
  if (user.tier === 'verified') return 'text-[var(--moh-verified)]'
  return 'text-gray-700 dark:text-gray-200'
}
</script>

<style scoped>
/* ── Height + fade slide-in ─────────────────────────────────────────────── */
.typing-expand-outer {
  display: grid;
  grid-template-rows: 1fr;
}

.typing-expand-inner {
  overflow: hidden;
}

.typing-expand-enter-active,
.typing-expand-leave-active {
  transition:
    grid-template-rows 0.28s ease,
    opacity 0.22s ease;
}

.typing-expand-enter-from,
.typing-expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

.typing-expand-enter-to,
.typing-expand-leave-from {
  grid-template-rows: 1fr;
  opacity: 1;
}

/* ── Wave animation ─────────────────────────────────────────────────────── */
.typing-wave {
  display: inline;
}

.typing-wave-char {
  display: inline-block;
  animation: typing-wave-bounce 1.6s ease-in-out infinite;
  will-change: transform;
}

@keyframes typing-wave-bounce {
  0%,
  55%,
  100% {
    transform: translateY(0) scale(1);
  }
  28% {
    transform: translateY(-0.2em) scale(1.2);
  }
}
</style>

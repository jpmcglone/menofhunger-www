<template>
  <!-- Author bio section. Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=448-143 -->
  <div class="mt-6 rounded-2xl border moh-border moh-surface-2 p-5" @click.stop>
    <div class="mb-4 flex items-center justify-between gap-3">
      <p class="text-[11px] font-semibold uppercase tracking-widest moh-text-soft">About the author</p>
          <div v-if="canTip" class="relative">
            <button
              type="button"
              class="moh-tap inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--moh-brass)] px-2.5 text-[11px] font-medium text-[var(--moh-brass)] transition-colors hover:bg-[var(--moh-surface-hover)]"
              aria-label="Send coins to author"
              @click.stop="tipOpen = !tipOpen"
            >
              <AppIconGlyph name="coins" :size="16" />
              Tip
            </button>

            <Transition name="tip-pop">
              <div
                v-if="tipOpen"
                class="absolute top-full right-0 z-50 mt-2 w-52 space-y-2.5 rounded-2xl border moh-border moh-surface p-3 shadow-xl"
              >
                <div class="text-center text-xs font-semibold moh-text">Send coins to {{ article?.author?.name || article?.author?.username }}</div>
                <div class="grid grid-cols-4 gap-1.5">
                  <button
                    v-for="amt in TIP_PRESETS"
                    :key="amt"
                    type="button"
                    :class="[
                      'rounded-xl py-1.5 text-xs font-semibold transition-colors border',
                      tipAmount === amt
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'moh-surface-hover moh-border moh-text',
                    ]"
                    @click.stop="tipAmount = amt"
                  >
                    {{ amt }}
                  </button>
                </div>
                <div class="flex gap-1.5">
                  <input
                    v-model.number="tipAmount"
                    type="number"
                    min="1"
                    class="min-w-0 flex-1 rounded-xl border moh-border moh-surface px-2 py-1.5 text-center text-xs moh-text focus:outline-none focus:ring-1 focus:ring-amber-400"
                    placeholder="Custom"
                    @click.stop
                  >
                  <button
                    type="button"
                    :disabled="tipLoading || !tipAmount || tipAmount < 1"
                    class="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                    @click.stop="sendTip"
                  >
                    {{ tipLoading ? '…' : 'Send' }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>
    </div>

    <div class="flex gap-3">
      <NuxtLink
        :to="`/u/${article.author.username}`"
        class="flex-shrink-0"
        @mouseenter="(e) => authorEnter(e)"
        @mousemove="(e) => authorMove(e)"
        @mouseleave="authorLeave"
      >
        <AppUserAvatar :user="article.author" size="lg" />
      </NuxtLink>
      <div class="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div class="min-w-0">
          <NuxtLink
            :to="`/u/${article.author.username}`"
            class="block min-w-0"
            @mouseenter="(e) => authorEnter(e)"
            @mousemove="(e) => authorMove(e)"
            @mouseleave="authorLeave"
          >
            <AppUserIdentityLine
              :user="article.author"
              name-class="text-base"
              handle-class="text-xs"
              badge-size="md"
            />
          </NuxtLink>
          <p v-if="authorBio" class="mt-1 text-sm moh-text-muted line-clamp-4">
            {{ authorBio }}
          </p>
        </div>
        <div
          v-if="!viewerIsAuthor && article.author.id && article.author.username"
          class="flex shrink-0 items-center gap-2"
        >

          <template v-if="!viewerIsAuthor && article.author.id && article.author.username">
            <AppFollowButton
              v-if="isAuthed"
              :user-id="article.author.id"
              :username="article.author.username"
              :show-icon="false"
              button-class="!min-h-11"
            />
            <Button
              v-else
              label="Follow"
              rounded
              size="small"
              @click="showAuthActionModal({ kind: 'login', action: 'follow' })"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'
import { useArticlePageContext } from '~/composables/pages/article/useArticlePage'

defineProps<{ article: Article }>()

const {
  canTip,
  tipOpen,
  TIP_PRESETS,
  tipAmount,
  tipLoading,
  sendTip,
  authorEnter,
  authorMove,
  authorLeave,
  authorBio,
  viewerIsAuthor,
  isAuthed,
  showAuthActionModal,
} = useArticlePageContext()
</script>

<style scoped>
.tip-pop-enter-active,
.tip-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tip-pop-enter-from,
.tip-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}
</style>

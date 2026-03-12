<template>
  <div
    :class="['group relative flex items-stretch border-t border-gray-200 dark:border-zinc-800 transition-colors', hoverClass]"
  >
    <!-- Visibility accent bar: flush right, full height -->
    <div :class="['absolute right-0 top-0 bottom-0 w-[3px]', visibilityBarClass]" aria-hidden="true" />

    <!-- Main clickable area -->
    <NuxtLink
      :to="destination"
      class="flex flex-1 items-start gap-4 pl-4 py-5 min-w-0"
      :class="article.isDraft ? 'pr-2' : 'pr-5'"
    >
      <!-- Content -->
      <div class="flex flex-1 flex-col gap-2 min-w-0">
        <!-- Title -->
        <h3 class="line-clamp-3 text-xl font-bold leading-snug text-gray-900 dark:text-gray-100">
          {{ article.title || 'Untitled' }}
        </h3>

        <!-- Excerpt: full for accessible articles, partial + faded for gated -->
        <div
          v-if="article.excerpt"
          class="relative overflow-hidden"
          :style="isGated
            ? 'opacity: 0.75; mask-image: linear-gradient(to bottom, black 30%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 30%, transparent 100%);'
            : ''"
        >
          <p class="line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-zinc-400">
            {{ article.excerpt }}
          </p>
        </div>

        <!-- Meta row -->
        <div class="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs uppercase tracking-wide text-gray-400 dark:text-zinc-500">
          <template v-if="article.isDraft">
            <span class="normal-case tracking-normal">Saved {{ savedLabel }}</span>
          </template>
          <template v-else-if="isGated">
            <span>{{ dateLabel }}</span>
            <span>·</span>
            <span class="font-medium">{{ article.author?.name || article.author?.username }}</span>
            <span>·</span>
            <span
              :class="[
                'normal-case tracking-normal inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                article.visibility === 'premiumOnly'
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
              ]"
            >
              <Icon name="tabler:lock" class="text-[9px]" aria-hidden="true" />
              {{ article.visibility === 'premiumOnly' ? 'Become premium to read' : 'Verify to read' }}
            </span>
          </template>
          <template v-else>
            <span>{{ dateLabel }}</span>
            <span>·</span>
            <span class="font-medium">{{ article.author?.name || article.author?.username }}</span>
            <template v-if="readingTime">
              <span>·</span>
              <span>{{ readingTime }}</span>
            </template>
            <template v-if="article.boostCount || article.commentCount || article.viewCount">
              <span>·</span>
              <span v-if="article.boostCount" class="flex items-center gap-0.5">
                <Icon name="tabler:arrow-up" class="text-[10px]" aria-hidden="true" />
                {{ article.boostCount }}
              </span>
              <span v-if="article.commentCount" class="flex items-center gap-0.5">
                <Icon name="tabler:message-circle" class="text-[10px]" aria-hidden="true" />
                {{ article.commentCount }}
              </span>
              <span v-if="article.viewCount" class="flex items-center gap-0.5">
                <Icon name="tabler:eye" class="text-[10px]" aria-hidden="true" />
                {{ article.viewCount }}
              </span>
            </template>
          </template>
        </div>
      </div>

      <!-- Thumbnail -->
      <div
        v-if="article.thumbnailUrl"
        class="relative flex-shrink-0 w-28 sm:w-36 overflow-hidden rounded-md bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700"
        style="aspect-ratio: 16/9;"
      >
        <img
          :src="article.thumbnailUrl"
          :alt="article.title"
          :class="['h-full w-full object-cover', isGated ? 'blur-md scale-110' : '']"
        />
        <!-- Lock overlay for gated articles -->
        <div
          v-if="isGated"
          class="absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <Icon name="tabler:lock" class="text-white text-xl drop-shadow" aria-hidden="true" />
        </div>
      </div>
    </NuxtLink>

    <!-- Draft "more" button -->
    <div v-if="article.isDraft" ref="moreWrapEl" class="relative flex items-center px-2">
      <button
        type="button"
        class="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        aria-label="More options"
        @click.prevent.stop="toggleMenu"
      >
        <Icon name="tabler:dots-vertical" class="text-[16px]" aria-hidden="true" />
      </button>

      <Transition name="more-menu">
        <div
          v-if="menuOpen"
          class="absolute right-2 top-full z-30 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
          role="menu"
        >
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            role="menuitem"
            @click.stop="onDelete"
          >
            <Icon name="tabler:trash" class="text-[14px]" aria-hidden="true" />
            Delete
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'

const props = defineProps<{
  article: Article
}>()

const emit = defineEmits<{
  (e: 'delete', id: string): void
}>()

const destination = computed(() =>
  props.article.isDraft ? `/articles/edit/${props.article.id}` : `/a/${props.article.id}`,
)

const isGated = computed(() => props.article.viewerCanAccess === false)

const dateLabel = computed(() => {
  const date = new Date(props.article.publishedAt ?? props.article.lastSavedAt ?? props.article.createdAt)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})

const savedLabel = computed(() => {
  const date = new Date(props.article.lastSavedAt ?? props.article.createdAt)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})

const visibilityBarClass = computed(() => {
  if (props.article.visibility === 'premiumOnly') return 'bg-orange-500'
  if (props.article.visibility === 'verifiedOnly') return 'bg-blue-500'
  return 'bg-transparent'
})

const hoverClass = computed(() => {
  if (props.article.visibility === 'premiumOnly') {
    return 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
  }
  if (props.article.visibility === 'verifiedOnly') {
    return 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
  }
  return 'hover:bg-gray-50 dark:hover:bg-white/5'
})

const readingTime = computed(() => {
  const mins = props.article.readingTimeMinutes
  if (!mins) return null
  return `${mins} min read`
})

// ─── More menu ───────────────────────────────────────────────────────────────

const menuOpen = ref(false)
const moreWrapEl = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function onDelete() {
  menuOpen.value = false
  emit('delete', props.article.id)
}

function onClickAway(e: MouseEvent) {
  if (moreWrapEl.value && !moreWrapEl.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

watch(menuOpen, (open) => {
  if (open) {
    document.addEventListener('click', onClickAway)
  } else {
    document.removeEventListener('click', onClickAway)
  }
})

onUnmounted(() => document.removeEventListener('click', onClickAway))
</script>

<style scoped>
.more-menu-enter-active,
.more-menu-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.more-menu-enter-from,
.more-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

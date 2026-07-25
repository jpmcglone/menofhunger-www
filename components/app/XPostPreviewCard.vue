<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="group block overflow-hidden border border-gray-300 bg-white text-gray-950 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-950"
    :class="compact ? 'rounded-lg' : 'rounded-xl'"
    aria-label="Open post on X"
    @click.stop
  >
    <div :class="compact ? 'p-2.5' : 'p-3.5'">
      <div class="flex items-start gap-2.5">
        <div
          class="shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800"
          :class="compact ? 'h-8 w-8' : 'h-10 w-10'"
          aria-hidden="true"
        >
          <img
            v-if="post.author.avatarUrl"
            :src="post.author.avatarUrl"
            class="h-full w-full object-cover"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
          >
          <div
            v-else
            class="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500 dark:text-zinc-400"
          >
            {{ post.author.name.charAt(0).toUpperCase() }}
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-1">
            <span class="truncate font-semibold" :class="compact ? 'text-xs' : 'text-sm'">
              {{ post.author.name }}
            </span>
            <Icon
              v-if="post.author.verified"
              name="tabler:circle-check-filled"
              class="shrink-0 text-[#1d9bf0]"
              :class="compact ? 'h-3.5 w-3.5' : 'h-4 w-4'"
              aria-label="Verified"
            />
            <span class="truncate text-gray-500 dark:text-zinc-500" :class="compact ? 'text-[11px]' : 'text-sm'">
              {{ post.author.handle }}
            </span>
            <span v-if="formattedDate" class="shrink-0 text-gray-500 dark:text-zinc-500" :class="compact ? 'text-[11px]' : 'text-sm'">
              · {{ formattedDate }}
            </span>
          </div>

          <div
            class="mt-1 whitespace-pre-wrap break-words text-pretty"
            :class="compact ? 'line-clamp-10 text-xs leading-snug' : 'line-clamp-[20] text-[15px] leading-snug'"
          >
            {{ post.text }}
          </div>

          <div
            v-if="post.media.length"
            class="mt-2 grid overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800"
            :class="post.media.length > 1 ? 'grid-cols-2 gap-px bg-gray-200 dark:bg-zinc-800' : 'grid-cols-1'"
          >
            <div
              v-for="media in post.media"
              :key="`${media.type}:${media.url}`"
              class="relative min-h-24 overflow-hidden bg-gray-100 dark:bg-zinc-900"
            >
              <img
                v-if="media.previewUrl"
                :src="media.previewUrl"
                :alt="media.alt || ''"
                class="h-full max-h-80 w-full object-cover"
                loading="lazy"
                referrerpolicy="no-referrer"
              >
              <div
                v-if="media.type === 'video'"
                class="absolute inset-0 flex items-center justify-center"
                aria-hidden="true"
              >
                <span class="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white">
                  <Icon name="tabler:player-play-filled" class="h-5 w-5 translate-x-px" />
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="post.quote"
            class="mt-2.5 rounded-xl border border-gray-300 p-2.5 dark:border-zinc-700"
          >
            <div class="flex min-w-0 items-center gap-1.5">
              <img
                v-if="post.quote.author.avatarUrl"
                :src="post.quote.author.avatarUrl"
                class="h-5 w-5 shrink-0 rounded-full object-cover"
                alt=""
                loading="lazy"
                referrerpolicy="no-referrer"
              >
              <span class="truncate text-xs font-semibold">{{ post.quote.author.name }}</span>
              <Icon
                v-if="post.quote.author.verified"
                name="tabler:circle-check-filled"
                class="h-3.5 w-3.5 shrink-0 text-[#1d9bf0]"
                aria-label="Verified"
              />
              <span class="truncate text-xs text-gray-500 dark:text-zinc-500">
                {{ post.quote.author.handle }}
              </span>
              <span v-if="formatDate(post.quote.createdAt)" class="shrink-0 text-xs text-gray-500 dark:text-zinc-500">
                · {{ formatDate(post.quote.createdAt) }}
              </span>
            </div>
            <div class="mt-1.5 whitespace-pre-wrap break-words text-pretty text-sm leading-snug line-clamp-10">
              {{ post.quote.text }}
            </div>
            <img
              v-if="post.quote.media[0]?.previewUrl"
              :src="post.quote.media[0].previewUrl || undefined"
              :alt="post.quote.media[0].alt || ''"
              class="mt-2 max-h-64 w-full rounded-lg border border-gray-200 object-cover dark:border-zinc-800"
              loading="lazy"
              referrerpolicy="no-referrer"
            >
          </div>
        </div>

        <span class="shrink-0 text-lg font-semibold leading-none" aria-label="X">𝕏</span>
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
import type { SocialPostMetadata } from '~/utils/link-metadata'

const props = withDefaults(
  defineProps<{
    post: SocialPostMetadata
    href: string
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const formattedDate = computed(() => formatDate(props.post.createdAt))
</script>

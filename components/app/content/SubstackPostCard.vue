<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="group block overflow-hidden rounded-xl border moh-border bg-white text-gray-950 transition-colors hover:bg-gray-50 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
    :aria-label="`Open on Substack: ${meta.title ?? 'post'}`"
    @click.stop
  >
    <div class="flex min-h-[6rem] gap-0">
      <!-- Cover image (left) -->
      <div
        v-if="meta.imageUrl"
        class="w-24 shrink-0 overflow-hidden sm:w-28"
      >
        <img
          :src="meta.imageUrl"
          class="h-full w-full object-cover"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
        >
      </div>

      <!-- Text column (right) -->
      <div class="flex min-w-0 flex-1 flex-col justify-between px-3 py-2.5">
        <div class="min-w-0">
          <!-- Newsletter name -->
          <p
            v-if="meta.siteName"
            class="mb-0.5 truncate text-xs text-gray-500 dark:text-zinc-400"
          >
            {{ meta.siteName }}
          </p>
          <!-- Post title -->
          <p class="line-clamp-2 text-sm font-semibold leading-snug">
            {{ meta.title }}
          </p>
          <!-- Subtitle / description -->
          <p
            v-if="meta.description"
            class="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-600 dark:text-zinc-400"
          >
            {{ meta.description }}
          </p>
        </div>

        <!-- Substack branding footer -->
        <div class="mt-2 flex items-center gap-1.5">
          <!-- Substack orange S badge (inline SVG, no external dep) -->
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5 shrink-0 fill-[#FF6719]"
            aria-hidden="true"
          >
            <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
          </svg>
          <span class="text-[11px] font-semibold text-[#FF6719]">Substack</span>
        </div>
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
import type { LinkMetadata } from '~/utils/link-metadata'

defineProps<{
  meta: LinkMetadata
  href: string
}>()
</script>

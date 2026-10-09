<template>
  <div
    class="relative flex items-center gap-2.5 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
    role="option"
  >
    <!-- Background anchor (full-row click) -->
    <NuxtLink
      v-if="recent.user?.username"
      :to="`/u/${encodeURIComponent(recent.user.username)}`"
      class="absolute inset-0 z-[1]"
      tabindex="-1"
      aria-hidden="true"
      @click.capture="emit('close')"
    />
    <NuxtLink
      v-else-if="recent.group?.slug"
      :to="`/groups/${encodeURIComponent(recent.group.slug)}`"
      class="absolute inset-0 z-[1]"
      tabindex="-1"
      aria-hidden="true"
      @click.capture="emit('close')"
    />
    <div
      v-else
      class="absolute inset-0 z-[1] cursor-pointer"
      @mousedown.prevent
      @click.stop="emit('apply')"
    />
    <!-- Content at z-[2] -->
    <div class="relative z-[2] flex items-center gap-2.5 w-full min-w-0 pointer-events-none">
      <AppSearchPersonSummary v-if="recent.user" :user="recent.user" />
      <AppSearchGroupSummary v-else-if="recent.group" :group="recent.group" />
      <template v-else>
        <div class="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
          <Icon name="tabler:clock" class="text-base moh-text-muted" aria-hidden="true" />
        </div>
        <span class="min-w-0 flex-1 text-sm moh-text truncate">{{ recent.query }}</span>
      </template>
    </div>
    <!-- Per-row X at z-[3] -->
    <button
      type="button"
      class="relative z-[3] shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors p-0.5 rounded"
      aria-label="Remove from recent searches"
      @mousedown.prevent
      @click.stop="emit('remove')"
    >
      <Icon name="tabler:x" size="14" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { RecentSearch } from '~/types/api'

defineProps<{ recent: RecentSearch }>()
const emit = defineEmits<{ close: []; apply: []; remove: [] }>()
</script>

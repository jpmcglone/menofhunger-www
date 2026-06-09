<template>
  <div class="relative mb-1.5 flex items-center">
    <NuxtLink
      :to="`/g/${encodeURIComponent(group.slug)}`"
      class="inline-flex max-w-full items-center gap-1.5 rounded-full border moh-border bg-black/[0.025] py-0.5 pl-0.5 pr-2 -ml-0.5 text-left shadow-sm shadow-black/[0.03] transition-colors hover:bg-black/[0.05] dark:bg-white/[0.045] dark:shadow-black/20 dark:hover:bg-white/[0.075]"
      :aria-label="`Group: ${group.name}`"
      @click.stop
      @mouseenter="onFeedGroupEnter"
      @mousemove="onFeedGroupMove"
      @mouseleave="onFeedGroupLeave"
    >
      <div
        class="h-[18px] w-[18px] shrink-0 overflow-hidden bg-gray-200 dark:bg-zinc-700 moh-img-outline"
        :class="groupAvatarRoundClass"
      >
        <img
          v-if="group.avatarImageUrl"
          :src="group.avatarImageUrl"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
        >
        <div
          v-else
          class="flex h-full w-full items-center justify-center text-[8px] font-bold text-gray-500 dark:text-zinc-400"
        >
          {{ groupInitials }}
        </div>
      </div>
      <span class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500" aria-hidden="true">
        in
      </span>
      <span class="whitespace-nowrap text-xs font-semibold text-gray-700 dark:text-zinc-200">
        {{ group.name }}
      </span>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import { groupAvatarRoundClass as getGroupAvatarRoundClass } from '~/utils/avatar-rounding'

const props = defineProps<{
  group: CommunityGroupShell
}>()

const groupAvatarRoundClass = getGroupAvatarRoundClass()

const groupInitials = computed(() => {
  const n = (props.group.name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})

const { onEnter: onFeedGroupEnter, onMove: onFeedGroupMove, onLeave: onFeedGroupLeave } = useGroupPreviewTrigger({
  shell: computed(() => props.group),
})
</script>

<template>
  <div class="relative mb-1.5 flex items-center">
    <NuxtLink
      :to="`/g/${encodeURIComponent(group.slug)}`"
      class="moh-focus inline-flex min-h-11 max-w-full items-center gap-2 py-1 text-left transition-colors hover:opacity-80"
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
      <span class="truncate text-sm font-semibold moh-text">
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

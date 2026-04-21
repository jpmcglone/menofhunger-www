<template>
  <div class="flex items-center gap-3">
    <template v-for="(slot, i) in slots" :key="i">
      <!-- Filled slot -->
      <NuxtLink
        v-if="slot.member"
        :to="`/u/${encodeURIComponent(slot.member.user.username ?? '')}`"
        class="relative shrink-0 group"
        :title="slot.member.user.name ?? slot.member.user.username ?? ''"
      >
        <AppUserAvatar
          :user="slot.member.user"
          size-class="h-12 w-12"
          :enable-preview="false"
        />
        <span
          v-if="slot.member.role === 'owner'"
          class="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-[var(--moh-bg)]"
          title="Crew Owner"
          aria-label="Crew Owner"
        >
          <Icon name="tabler:crown" class="text-[9px] text-white" aria-hidden="true" />
        </span>
      </NuxtLink>

      <!-- Empty slot -->
      <button
        v-else
        type="button"
        class="relative shrink-0 h-12 w-12 rounded-full border-2 border-dashed border-gray-300 dark:border-zinc-600 flex items-center justify-center transition-colors"
        :class="slot.isAddButton && canAddMember
          ? 'cursor-pointer hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 text-gray-400 dark:text-zinc-500'
          : 'cursor-default text-gray-200 dark:text-zinc-700 pointer-events-none'"
        :aria-label="slot.isAddButton && canAddMember ? 'Add crew member' : undefined"
        :disabled="!slot.isAddButton || !canAddMember"
        @click="slot.isAddButton && canAddMember ? emit('add-member') : undefined"
      >
        <Icon
          v-if="slot.isAddButton && canAddMember"
          name="tabler:plus"
          class="text-lg"
          aria-hidden="true"
        />
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { CrewMemberListItem } from '~/types/api'

const MAX_SLOTS = 5

const props = defineProps<{
  members: CrewMemberListItem[]
  isOwner: boolean
  canAddMember: boolean
}>()

const emit = defineEmits<{
  (e: 'add-member'): void
}>()

type Slot =
  | { member: CrewMemberListItem; isAddButton: false }
  | { member: null; isAddButton: boolean }

const slots = computed<Slot[]>(() => {
  const result: Slot[] = []

  for (const member of props.members.slice(0, MAX_SLOTS)) {
    result.push({ member, isAddButton: false })
  }

  const emptyCount = MAX_SLOTS - result.length
  for (let i = 0; i < emptyCount; i++) {
    // The leftmost empty slot is the add button
    result.push({ member: null, isAddButton: i === 0 })
  }

  return result
})
</script>

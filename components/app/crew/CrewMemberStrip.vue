<template>
  <div class="flex items-center gap-3">
    <!-- Active members -->
    <template v-for="member in displayMembers" :key="`m-${member.user.id}`">
      <button
        v-if="viewerIsMember"
        type="button"
        class="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--moh-bg)]"
        :title="member.user.name ?? member.user.username ?? ''"
        @click="onMemberClick($event, member)"
      >
        <AppUserAvatar
          :user="member.user"
          size-class="h-12 w-12"
          :enable-preview="false"
        />
        <span
          v-if="member.role === 'owner'"
          class="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-[var(--moh-bg)]"
          title="Crew Owner"
          aria-label="Crew Owner"
        >
          <Icon name="tabler:crown" class="text-[9px] text-white" aria-hidden="true" />
        </span>
      </button>
      <NuxtLink
        v-else
        :to="`/u/${encodeURIComponent(member.user.username ?? '')}`"
        class="relative shrink-0"
        :title="member.user.name ?? member.user.username ?? ''"
      >
        <AppUserAvatar
          :user="member.user"
          size-class="h-12 w-12"
          :enable-preview="false"
        />
        <span
          v-if="member.role === 'owner'"
          class="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-[var(--moh-bg)]"
          title="Crew Owner"
          aria-label="Crew Owner"
        >
          <Icon name="tabler:crown" class="text-[9px] text-white" aria-hidden="true" />
        </span>
      </NuxtLink>
    </template>

    <!-- Pending invitees (visible to crew members only) -->
    <template v-if="viewerIsMember">
      <button
        v-for="inv in displayPending"
        :key="`p-${inv.id}`"
        type="button"
        class="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--moh-bg)]"
        :title="`Invite pending — ${inv.invitee.name ?? inv.invitee.username ?? ''}`"
        @click="onPendingClick($event, inv)"
      >
        <AppUserAvatar
          :user="inv.invitee"
          size-class="h-12 w-12"
          :enable-preview="false"
          class="opacity-40 saturate-0"
        />
        <span
          class="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-500 ring-2 ring-[var(--moh-bg)]"
          aria-label="Invite pending"
        >
          <Icon name="tabler:clock" class="text-[9px] text-white" aria-hidden="true" />
        </span>
      </button>
    </template>

    <!-- Empty slots + add button: only when the viewer can actually invite. -->
    <template v-if="canAddMember">
      <template v-for="slot in emptySlots" :key="`e-${slot.key}`">
        <button
          type="button"
          class="relative shrink-0 h-12 w-12 rounded-full border-2 border-dashed border-gray-300 dark:border-zinc-600 flex items-center justify-center transition-colors"
          :class="slot.isAdd
            ? 'cursor-pointer hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 text-gray-400 dark:text-zinc-500'
            : 'cursor-default text-gray-200 dark:text-zinc-700 pointer-events-none'"
          :aria-label="slot.isAdd ? 'Add crew member' : undefined"
          :disabled="!slot.isAdd"
          @click="slot.isAdd ? emit('add-member') : undefined"
        >
          <Icon
            v-if="slot.isAdd"
            name="tabler:plus"
            class="text-lg"
            aria-hidden="true"
          />
        </button>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { CrewInvite, CrewMemberListItem } from '~/types/api'

const MAX_SLOTS = 5

const props = defineProps<{
  members: CrewMemberListItem[]
  pendingInvitees?: CrewInvite[]
  isOwner: boolean
  viewerIsMember?: boolean
  canAddMember: boolean
}>()

const emit = defineEmits<{
  (e: 'add-member'): void
  (e: 'member-click', payload: { member: CrewMemberListItem; anchorEl: HTMLElement }): void
  (e: 'pending-click', payload: { invite: CrewInvite; anchorEl: HTMLElement }): void
}>()

const displayMembers = computed(() => props.members.slice(0, MAX_SLOTS))

const displayPending = computed(() => {
  if (!props.viewerIsMember) return []
  const remaining = Math.max(0, MAX_SLOTS - displayMembers.value.length)
  return (props.pendingInvitees ?? []).slice(0, remaining)
})

const emptySlots = computed(() => {
  if (!props.canAddMember) return []
  const filled = displayMembers.value.length + displayPending.value.length
  const empty = Math.max(0, MAX_SLOTS - filled)
  const result: Array<{ key: number; isAdd: boolean }> = []
  for (let i = 0; i < empty; i++) {
    result.push({ key: i, isAdd: i === 0 })
  }
  return result
})

function onMemberClick(event: MouseEvent, member: CrewMemberListItem) {
  const anchorEl = event.currentTarget as HTMLElement | null
  if (!anchorEl) return
  emit('member-click', { member, anchorEl })
}

function onPendingClick(event: MouseEvent, invite: CrewInvite) {
  const anchorEl = event.currentTarget as HTMLElement | null
  if (!anchorEl) return
  emit('pending-click', { invite, anchorEl })
}
</script>

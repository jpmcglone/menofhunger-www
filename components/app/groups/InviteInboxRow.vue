<template>
  <div class="flex items-center gap-3 moh-gutter-x py-3">
    <NuxtLink
      :to="`/g/${encodeURIComponent(invite.group.slug)}`"
      class="shrink-0"
      :aria-label="invite.group.name"
    >
      <AppGroupsGroupAvatar :name="invite.group.name" :src="invite.group.avatarImageUrl" :size="40" />
    </NuxtLink>

    <div class="min-w-0 flex-1">
      <NuxtLink
        :to="`/g/${encodeURIComponent(invite.group.slug)}`"
        class="block truncate text-sm font-semibold moh-text hover:underline"
      >
        {{ invite.group.name }}
      </NuxtLink>
      <p class="mt-0.5 truncate text-[11px] moh-meta">
        Invited by @{{ invite.invitedBy.username }}
      </p>
    </div>

    <div class="shrink-0 flex items-center gap-2" @click.stop>
      <Button
        size="small"
        label="Accept"
        rounded
        :disabled="busy"
        :loading="busy && action === 'accept'"
        @click="onAccept"
      />
      <Button
        size="small"
        label="Decline"
        severity="secondary"
        rounded
        :disabled="busy"
        :loading="busy && action === 'decline'"
        @click="onDecline"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommunityGroupInvite } from '~/types/api'

const props = defineProps<{
  invite: CommunityGroupInvite
}>()

const emit = defineEmits<{
  accepted: [invite: CommunityGroupInvite, groupSlug: string]
  declined: [invite: CommunityGroupInvite]
}>()

const groupInvites = useGroupInvites()
const toast = useAppToast()
const { run, pending: busy } = useAsyncAction()
const action = ref<'accept' | 'decline' | null>(null)

async function onAccept() {
  if (busy.value) return
  action.value = 'accept'
  await run(async () => {
    const res = await groupInvites.acceptInvite(props.invite.id)
    emit('accepted', props.invite, res.groupSlug)
    toast.push({ title: 'Joined group', tone: 'success', durationMs: 1400 })
    if (res.groupSlug) void navigateTo(`/g/${encodeURIComponent(res.groupSlug)}`)
  }, { error: 'Could not accept invite.', durationMs: 2200 })
  action.value = null
}

async function onDecline() {
  if (busy.value) return
  action.value = 'decline'
  await run(async () => {
    await groupInvites.declineInvite(props.invite.id)
    emit('declined', props.invite)
  }, { error: 'Could not decline invite.', durationMs: 2200 })
  action.value = null
}
</script>

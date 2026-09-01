<template>
  <div class="flex items-center gap-3 moh-gutter-x py-3">
    <NuxtLink
      :to="`/g/${encodeURIComponent(invite.group.slug)}`"
      class="shrink-0"
    >
      <AppImg
        v-if="invite.group.avatarImageUrl"
        :src="invite.group.avatarImageUrl"
        class="h-10 w-10 rounded-full object-cover"
        :alt="invite.group.name"
        sizes="40px"
      />
      <div
        v-else
        class="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 dark:bg-white/10"
        aria-hidden="true"
      >
        <Icon name="heroicons-solid:user-group" class="text-[16px] opacity-70" />
      </div>
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
import { getSafeUserErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  invite: CommunityGroupInvite
}>()

const emit = defineEmits<{
  accepted: [invite: CommunityGroupInvite, groupSlug: string]
  declined: [invite: CommunityGroupInvite]
}>()

const groupInvites = useGroupInvites()
const toast = useAppToast()
const busy = ref(false)
const action = ref<'accept' | 'decline' | null>(null)

async function onAccept() {
  if (busy.value) return
  busy.value = true
  action.value = 'accept'
  try {
    const res = await groupInvites.acceptInvite(props.invite.id)
    emit('accepted', props.invite, res.groupSlug)
    toast.push({ title: 'Joined group', tone: 'success', durationMs: 1400 })
    if (res.groupSlug) void navigateTo(`/g/${encodeURIComponent(res.groupSlug)}`)
  } catch (e: unknown) {
    toast.push({
      title: getSafeUserErrorMessage(e, 'Could not accept invite.'),
      tone: 'error',
      durationMs: 2200,
    })
  } finally {
    busy.value = false
    action.value = null
  }
}

async function onDecline() {
  if (busy.value) return
  busy.value = true
  action.value = 'decline'
  try {
    await groupInvites.declineInvite(props.invite.id)
    emit('declined', props.invite)
  } catch (e: unknown) {
    toast.push({
      title: getSafeUserErrorMessage(e, 'Could not decline invite.'),
      tone: 'error',
      durationMs: 2200,
    })
  } finally {
    busy.value = false
    action.value = null
  }
}
</script>

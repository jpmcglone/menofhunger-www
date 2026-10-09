<template>
  <AppStyledTextarea
ref="field" v-model="text" :channel-scope="scope" :mention-search="searchMembers"
    :placeholder="placeholder" :disabled="disabled" :submit-trigger="submitTrigger"
    class="channel-message-editor" @escape="emit('escape')" @send="emit('send')" @blur="emit('blur')" @media-files="emit('media-files', $event)" />
</template>
<script setup lang="ts">
import type { ChannelMember, FollowListUser, GroupChannel } from '~/types/api'
import { groupChannelsKey } from '~/composables/channels/useGroupChannels'
import { channelPath } from '~/utils/channels/reducer'
const props = withDefaults(defineProps<{ groupId: string; channel: GroupChannel; placeholder: string; disabled?: boolean; submitTrigger?: 'enter' | 'cmd-enter' }>(), { disabled: false, submitTrigger: 'enter' })
const text = defineModel<string>({ required: true })
const emit = defineEmits<{ send: []; blur: []; escape: []; 'media-files': [files: File[]] }>()
const state = inject(groupChannelsKey, null)
const scope = computed(() => ({ groupId: props.groupId, channels: state?.channels.value ?? [] }))
const { apiFetchData } = useApiClient()
const { user } = useAuth()
const field = ref<{ focus: () => void } | null>(null)
async function searchMembers(query: string): Promise<FollowListUser[]> {
  const identity = user.value?.id
  const groupId = props.groupId, channelId = props.channel.id
  try {
    const members = await apiFetchData<ChannelMember[]>(`${channelPath(groupId, channelId)}/members`, { query: { q: query } })
    if (identity !== user.value?.id || groupId !== props.groupId || channelId !== props.channel.id) return []
    const relationship = { viewerFollowsUser: false, userFollowsViewer: false, viewerPostNotificationsEnabled: false }
    const broadcasts: FollowListUser[] = props.channel.capabilities.canModerate
      ? [['everyone', 'Notify everyone in this channel'], ['here', 'Notify members online now']].filter(([handle]) => handle!.startsWith(query.toLowerCase())).map(([handle, name]) => ({ id: `broadcast:${handle}`, username: handle!, name: name!, avatarUrl: null, premium: false, premiumPlus: false, verifiedStatus: 'none', isOrganization: false, relationship })) : []
    return [...broadcasts, ...members.filter(member => member.user.username).map(member => ({ ...member.user, relationship }))]
  } catch { return [] }
}
defineExpose({ focus: () => field.value?.focus() })
</script>
<style>
.channel-message-editor .moh-styled-textarea-editor { min-height: 72px; max-height: 180px; overflow-y: auto; padding: 12px; font-size: 15px; line-height: 1.5; }
</style>

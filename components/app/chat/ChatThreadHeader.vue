<template>
  <div class="shrink-0 border-b border-gray-200 px-4 py-2 sm:py-3 dark:border-zinc-800">
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-start gap-2">
        <Button
          v-if="showBack"
          text
          severity="secondary"
          aria-label="Back"
          @click="emit('back')"
        >
          <template #icon>
            <Icon name="tabler:chevron-left" aria-hidden="true" />
          </template>
        </Button>
        <div class="flex items-center gap-3 min-w-0">
          <button
            v-if="headerAvatarUser"
            type="button"
            class="rounded-full cursor-pointer transition-opacity hover:opacity-90"
            :aria-label="headerAvatarUser.username ? `View @${headerAvatarUser.username}` : 'View profile'"
            @click="goToProfile(headerAvatarUser)"
          >
            <AppUserAvatar :user="headerAvatarUser" size-class="h-9 w-9 sm:h-10 sm:w-10" />
          </button>
          <div class="min-w-0">
            <div class="font-semibold min-w-0 flex items-center gap-2">
              <template v-if="conversation?.type === 'direct' && headerDirectUser">
                <button
                  type="button"
                  class="min-w-0 truncate hover:underline cursor-pointer text-left"
                  :aria-label="headerDirectUser.username ? `View @${headerDirectUser.username}` : 'View profile'"
                  @click="goToProfile(headerDirectUser)"
                >
                  {{ headerDirectUser.name || headerDirectUser.username || 'User' }}
                </button>
                <AppVerifiedBadge
                  :status="headerDirectUser.verifiedStatus"
                  :premium="headerDirectUser.premium"
                  :premium-plus="headerDirectUser.premiumPlus"
                  :is-organization="headerDirectUser.isOrganization"
                  :is-bot="headerDirectUser.isBot"
                />
              </template>
              <template v-else-if="conversation?.type === 'group' && !conversation?.title">
                <span class="min-w-0 truncate">
                  <template v-if="headerMembers.length">
                    <template v-for="(member, index) in headerMembers" :key="`header-title-${member.id}`">
                      <button
                        type="button"
                        class="hover:underline cursor-pointer"
                        :aria-label="member.username ? `View @${member.username}` : 'View profile'"
                        @click="goToProfile(member.user)"
                        @mouseenter="(e) => onUserPreviewEnter(member.username, e)"
                        @mousemove="onUserPreviewMove"
                        @mouseleave="onUserPreviewLeave"
                      >
                        {{ member.label }}
                      </button>
                      <span v-if="index < headerMembers.length - 1">, </span>
                    </template>
                  </template>
                  <template v-else>
                    Group chat
                  </template>
                </span>
              </template>
              <template v-else>
                <span class="min-w-0 truncate">
                  {{
                    conversation
                      ? getConversationTitle(conversation)
                    : isDraftChat
                      ? (draftRecipients.length === 1
                          ? (draftRecipients[0]?.name || draftRecipients[0]?.username || 'User')
                        : draftGroupTitle)
                        : 'Select a conversation'
                  }}
                </span>
              </template>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
              <template v-if="conversation?.type === 'group' || conversation?.type === 'crew_wall'">
                <template v-if="headerMembers.length">
                  <template v-for="(member, index) in headerMembers" :key="member.id">
                    <button
                      type="button"
                      class="font-semibold hover:underline cursor-pointer"
                      :class="member.toneClass"
                      :aria-label="member.username ? `View @${member.username}` : 'View profile'"
                      @click="goToProfile(member.user)"
                      @mouseenter="(e) => onUserPreviewEnter(member.username, e)"
                      @mousemove="onUserPreviewMove"
                      @mouseleave="onUserPreviewLeave"
                    >
                      {{ member.label }}
                    </button>
                    <span v-if="index < headerMembers.length - 1">, </span>
                  </template>
                </template>
                <template v-else>
                  {{ conversation?.type === 'crew_wall' ? 'Crew chat' : 'Group chat' }}
                </template>
              </template>
              <template v-else-if="conversation?.type === 'direct'">
                <button
                  v-if="headerDirectUser?.username"
                  type="button"
                  class="hover:underline cursor-pointer"
                  :aria-label="`View @${headerDirectUser.username}`"
                  @click="goToProfile(headerDirectUser)"
                  @mouseenter="(e) => onUserPreviewEnter(headerDirectUser?.username, e)"
                  @mousemove="onUserPreviewMove"
                  @mouseleave="onUserPreviewLeave"
                >
                  @{{ headerDirectUser.username }}
                </button>
                <span v-else>Chat</span>
              </template>
              <template v-else-if="isDraftChat">
                {{
                  draftRecipients.length === 1
                    ? (draftRecipients[0]?.username ? `@${draftRecipients[0].username}` : 'New chat')
                    : `${draftRecipients.length} recipients`
                }}
              </template>
              <template v-else>
                Pick a conversation from the left.
              </template>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Calling: two icons when idle, one "Join call" when a call is live in this thread. -->
        <template v-if="showCallControls && conversation">
          <template v-if="conversation.activeCall">
            <Button
              v-if="viewerInActiveCall"
              size="small"
              severity="secondary"
              rounded
              :label="engagedHere ? 'Show call' : 'In call'"
              :disabled="!engagedHere"
              @click="emit('showCall')"
            >
              <template #icon>
                <Icon :name="conversation.activeCall.type === 'video' ? 'tabler:video' : 'tabler:phone'" aria-hidden="true" />
              </template>
            </Button>
            <Button
              v-else
              v-tooltip.bottom="joinTooltip"
              size="small"
              rounded
              :label="activeCallFull ? 'Call full' : 'Join call'"
              :disabled="activeCallFull || !canJoinActive || callBusy"
              :loading="callBusy"
              @click="emit('joinCall', conversation.activeCall)"
            >
              <template #icon>
                <Icon :name="conversation.activeCall.type === 'video' ? 'tabler:video' : 'tabler:phone'" aria-hidden="true" />
              </template>
            </Button>
          </template>
          <template v-else>
            <span v-tooltip.bottom="startTooltip" class="inline-flex">
              <Button
                text
                severity="secondary"
                aria-label="Start voice call"
                :disabled="Boolean(startDenialReason) || callBusy"
                @click="emit('startCall', 'audio')"
              >
                <template #icon>
                  <Icon name="tabler:phone" aria-hidden="true" />
                </template>
              </Button>
            </span>
            <span v-tooltip.bottom="startTooltip" class="inline-flex">
              <Button
                text
                severity="secondary"
                aria-label="Start video call"
                :disabled="Boolean(startDenialReason) || callBusy"
                @click="emit('startCall', 'video')"
              >
                <template #icon>
                  <Icon name="tabler:video" aria-hidden="true" />
                </template>
              </Button>
            </span>
          </template>
        </template>
        <Button
          v-if="conversation && !isMarvConversation"
          v-tooltip.bottom="muteButtonTooltip"
          text
          severity="secondary"
          :aria-label="conversation.isMuted ? 'Unmute notifications' : 'Mute notifications'"
          @click="emit('toggleMute')"
        >
          <template #icon>
            <Icon :name="conversation.isMuted ? 'tabler:bell-off' : 'tabler:bell'" aria-hidden="true" />
          </template>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CallSession, CallType, FollowListUser, MessageConversation, MessageUser } from '~/types/api'
import { userColorTier } from '~/utils/user-tier'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useCallGating } from '~/composables/calls/useCallGating'
import { useCallSession } from '~/composables/calls/useCallSession'

const props = defineProps<{
  conversation: MessageConversation | null
  isDraftChat: boolean
  draftRecipients: FollowListUser[]
  showBack: boolean
  isMarvConversation: boolean
  getConversationTitle: (conversation: MessageConversation) => string
}>()

const emit = defineEmits<{
  back: []
  toggleMute: []
  startCall: [type: CallType]
  joinCall: [call: CallSession]
  showCall: []
}>()

const { user: me } = useAuth()

// ─── Calling ────────────────────────────────────────────────────────────────
const gating = useCallGating()
const callSession = useCallSession()

/** Hidden for Marv, pending requests, and anything but direct/group threads. */
const showCallControls = computed(() => {
  const c = props.conversation
  if (!c || props.isMarvConversation) return false
  if (c.type !== 'direct' && c.type !== 'group') return false
  return c.viewerStatus === 'accepted'
})
const startDenialReason = computed(() => gating.startDenial(props.conversation))
const startTooltip = computed(() => {
  const d = startDenialReason.value
  return d ? tinyTooltip(gating.startDenialMessage(d)) : null
})
const viewerInActiveCall = computed(() => {
  const c = props.conversation?.activeCall
  return Boolean(c && me.value?.id && c.participants.some((p) => p.userId === me.value?.id))
})
const engagedHere = computed(() => {
  const c = props.conversation?.activeCall
  return Boolean(c && callSession.call.value?.id === c.id && callSession.phase.value === 'in_call')
})
const activeCallFull = computed(() => {
  const c = props.conversation?.activeCall
  return Boolean(c && c.participants.length >= c.capacity)
})
const canJoinActive = computed(() => {
  const c = props.conversation?.activeCall
  return Boolean(c && gating.canJoin(c))
})
const joinTooltip = computed(() => (canJoinActive.value ? null : tinyTooltip('Only verified members can join calls.')))
const callBusy = computed(() => callSession.phase.value === 'requesting_media' || callSession.phase.value === 'joining')

function getDirectUser(conversation: MessageConversation) {
  return conversation.participants.find((p) => p.user.id !== me.value?.id)?.user ?? null
}

const headerAvatarUser = computed(() => {
  if (props.conversation?.type === 'direct') {
    return getDirectUser(props.conversation)
  }
  if (props.isDraftChat && props.draftRecipients.length === 1) {
    return props.draftRecipients[0] ?? null
  }
  return null
})

const headerDirectUser = computed(() => {
  if (props.conversation?.type === 'direct') {
    return getDirectUser(props.conversation)
  }
  return null
})

function userToneClass(u: MessageUser | null | undefined): string {
  const tier = userColorTier(u as Parameters<typeof userColorTier>[0])
  if (tier === 'organization') return 'text-[var(--moh-org)]'
  if (tier === 'premium') return 'text-[var(--moh-premium)]'
  if (tier === 'verified') return 'text-[var(--moh-verified)]'
  return 'text-gray-700 dark:text-gray-200'
}

const headerMembers = computed(() => {
  // Both group chats and crew chats render a comma-separated list of the
  // other participants under the header title (and as the title itself when
  // the group chat has no custom name). Crew chats always have a name (the
  // crew's name, populated by the backend), so we only use this list for the
  // subtitle on crews — the title row keeps showing the crew name.
  const type = props.conversation?.type
  if (type !== 'group' && type !== 'crew_wall') return []
  return props.conversation!.participants
    .map((p) => p.user ?? null)
    .filter((u): u is MessageUser => Boolean(u))
    .filter((u) => u.id !== me.value?.id)
    .map((u) => {
      const label = u.name || u.username || 'User'
      return {
        id: u.id,
        label,
        username: u.username ?? '',
        user: u,
        toneClass: userToneClass(u),
      }
    })
})

const draftGroupTitle = computed(() => {
  const names = props.draftRecipients.map((u) => u.name || u.username || 'User')
  if (names.length <= 2) return names.join(' and ')
  const [first, second, ...rest] = names
  return `${first}, ${second}, and ${rest.length} others`
})

const muteButtonTooltip = computed(() => {
  const c = props.conversation
  if (!c) return null
  return c.isMuted
    ? tinyTooltip('Unmute — turn notifications back on for this chat')
    : tinyTooltip('Mute — silence notifications for this chat')
})

const pop = useUserPreviewPopover()
const { onMove: onUserPreviewMove, onLeave: onUserPreviewLeave } = useUserPreviewTrigger({ username: '' })
function onUserPreviewEnter(username: string | null | undefined, event: MouseEvent) {
  const u = (username ?? '').trim()
  if (!u) return
  pop.onTriggerEnter({ username: u, event })
}

function goToProfile(user: MessageUser | FollowListUser | null | undefined) {
  const username = (user?.username ?? '').trim()
  if (!username) return
  void navigateTo(`/u/${username}`)
}
</script>

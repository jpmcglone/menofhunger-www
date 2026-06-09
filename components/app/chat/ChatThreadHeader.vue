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
                  :steward-badge-enabled="headerDirectUser.stewardBadgeEnabled ?? true"
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
import type { FollowListUser, MessageConversation, MessageUser } from '~/types/api'
import { userColorTier } from '~/utils/user-tier'
import { tinyTooltip } from '~/utils/tiny-tooltip'

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
}>()

const { user: me } = useAuth()

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

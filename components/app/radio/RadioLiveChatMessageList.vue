<template>
  <div class="space-y-1 px-3 py-2">
    <RadioLiveChatMessageRow
      v-for="m in messages"
      :key="m.id"
      :message="m"
      :known-usernames="knownUsernames"
    />
  </div>
</template>

<script setup lang="ts">
import type { SpaceChatMessage } from '~/types/api'
import RadioLiveChatMessageRow from '~/components/app/radio/RadioLiveChatMessageRow.vue'

const props = defineProps<{
  messages: SpaceChatMessage[]
}>()

const { members } = useSpaceLobby()
const { validSet, validateMentionsInBody } = useValidatedChatUsernames()

// A username is "known" (and eligible for styled mention rendering) if they:
//   • are currently in the lobby
//   • have sent a message in this chat session
//   • have been confirmed to exist via a background API lookup
const knownUsernames = computed<Set<string>>(() => {
  const set = new Set<string>()
  for (const m of props.messages) {
    const un = (m.sender?.username ?? '').toLowerCase().trim()
    if (un) set.add(un)
  }
  for (const m of members.value) {
    const un = (m.username ?? '').toLowerCase().trim()
    if (un) set.add(un)
  }
  for (const un of validSet.value) {
    set.add(un)
  }
  return set
})

// When new messages arrive, validate any unrecognized @mentions in the background.
watch(
  () => props.messages,
  (msgs, prev) => {
    if (!import.meta.client) return
    const prevLen = prev?.length ?? 0
    const newMsgs = msgs.length > prevLen ? msgs.slice(prevLen) : msgs
    for (const m of newMsgs) {
      if (m.kind === 'user' && m.body) {
        validateMentionsInBody(m.body, knownUsernames.value)
      }
    }
  },
  { immediate: true },
)
</script>


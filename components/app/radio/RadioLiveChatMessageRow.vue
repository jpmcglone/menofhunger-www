<template>
  <div v-if="message.kind === 'system'" class="py-1.5">
    <div class="max-w-full text-left text-[11px] text-gray-400 dark:text-gray-500">
      <template v-if="systemUsername && systemProfilePath">
        <NuxtLink
          :to="systemProfilePath"
          class="font-semibold hover:underline underline-offset-2"
          @mouseenter="onSystemEnter"
          @mousemove="onSystemMove"
          @mouseleave="onSystemLeave"
        >
          @{{ systemUsername }}
        </NuxtLink>
      </template>
      <span v-else class="font-semibold">Someone</span>
      <span class="ml-1">has {{ systemVerbPhrase }} the chat</span>
    </div>
  </div>
  <div v-else class="text-sm leading-5" :class="containerClass" :style="containerStyle">
    <template v-if="profilePath">
      <NuxtLink
        :to="profilePath"
        class="font-semibold hover:underline underline-offset-2"
        :class="usernameClass"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        {{ displayUsername }}
      </NuxtLink>
    </template>
    <span v-else class="font-semibold" :class="usernameClass">
      {{ displayUsername }}
    </span>
    <span class="mx-1 text-gray-500 dark:text-gray-400">:</span>
    <span class="text-gray-900 dark:text-gray-100 break-words">
      {{ message.body }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { SpaceChatMessage } from '~/types/api'
import { userColorTier, userTierColorVar, userTierTextClass } from '~/utils/user-tier'

const props = defineProps<{
  message: SpaceChatMessage
}>()

const { user: me } = useAuth()
const isMine = computed(() => {
  const myId = String(me.value?.id ?? '').trim()
  const senderId = String(props.message?.sender?.id ?? '').trim()
  return Boolean(myId && senderId && myId === senderId)
})

const username = computed(() => (props.message?.sender?.username ?? '').trim() || null)
const displayUsername = computed(() => username.value ?? 'User')
const profilePath = computed(() => (username.value ? `/u/${encodeURIComponent(username.value)}` : null))

const senderTier = computed(() => userColorTier(props.message?.sender as any))
const usernameClass = computed(() => {
  return userTierTextClass(senderTier.value, { fallback: 'text-gray-900 dark:text-gray-100' })
})

const containerClass = computed(() => {
  if (!isMine.value) return ''
  // Give the highlight some breathing room without changing overall list width.
  return 'rounded-lg px-2 py-1 -mx-2'
})

const containerStyle = computed<Record<string, string> | undefined>(() => {
  if (!isMine.value) return undefined
  const tierVar = userTierColorVar(senderTier.value)
  if (!tierVar) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.14)',
    }
  }
  // Subtle tint using the tier color.
  return {
    backgroundColor: `color-mix(in srgb, ${tierVar} 14%, transparent)`,
  }
})

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: computed(() => username.value ?? ''),
})

const systemUsername = computed(() => {
  if (props.message.kind !== 'system') return null
  return (props.message.system?.username ?? '').trim() || null
})
const systemProfilePath = computed(() => (systemUsername.value ? `/u/${encodeURIComponent(systemUsername.value)}` : null))
const systemVerbPhrase = computed(() => {
  if (props.message.kind !== 'system') return 'joined'
  const first = props.message.system?.firstEvent
  const last = props.message.system?.lastEvent
  const firstWord = first === 'leave' ? 'left' : 'joined'
  const lastWord = last === 'leave' ? 'left' : 'joined'
  return firstWord === lastWord ? firstWord : `${firstWord} and ${lastWord}`
})

const { onEnter: onSystemEnter, onMove: onSystemMove, onLeave: onSystemLeave } = useUserPreviewTrigger({
  username: computed(() => systemUsername.value ?? ''),
})
</script>


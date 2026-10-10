<template>
  <div v-if="useManagedSurface" class="grid h-full min-h-0 flex-1" :class="desktop ? 'grid-cols-[min(22rem,45%)_1fr]' : 'grid-cols-1'">
    <div v-show="desktop" id="moh-chat-full-list" class="min-h-0 overflow-hidden" />
    <div id="moh-chat-full-thread" class="min-h-0 overflow-hidden" />
  </div>
  <ChatWorkspace v-else />
</template>

<script setup lang="ts">
import ChatWorkspace from '~/components/app/chat/ChatWorkspace.vue'
import { useDesktopChatDock } from '~/composables/chat/useDesktopChatDock'

definePageMeta({ layout: 'app', title: 'Chat', hideTopBar: true })
usePageSeo({ title: 'Chat', description: 'Chat in Men of Hunger — keep conversations focused and intentional.', canonicalPath: '/chat', noindex: true })
const route = useRoute()
const { desktop, sessions, fullHostReady } = useDesktopChatDock()
const fullConversation = computed(() => typeof route.query.c === 'string' ? route.query.c : typeof route.query.dock === 'string' && sessions.value.some(session => session.key === route.query.dock && session.mode !== 'closed') ? route.query.dock : null)
const useManagedSurface = computed(() => Boolean(fullConversation.value && (desktop.value || sessions.value.some(session => (session.conversationId === fullConversation.value || session.key === fullConversation.value) && session.mode !== 'closed'))))
watch([useManagedSurface, fullConversation], async () => {
  if (!import.meta.client) return
  fullHostReady.value = false
  await nextTick()
  fullHostReady.value = Boolean(useManagedSurface.value && fullConversation.value && document.getElementById('moh-chat-full-thread'))
}, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { fullHostReady.value = false })
</script>

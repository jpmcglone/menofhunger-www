<template>
  <ChatConversationList v-if="listOnly" v-bind="listProps" :active-list="conversations" :animate-rows="fullPage" @select="$emit('select', $event)" />
  <div v-else class="thread-fixture">
    <header><span>{{ conversationId }}</span><slot name="controls" /></header>
    <input aria-label="Fixture composer">
  </div>
</template>
<script setup lang="ts">
import ChatConversationList from '~/components/app/chat/ChatConversationList.vue'
import { conversations } from './fixture-api'
defineOptions({ name: 'ChatDockFixtureWorkspace' })
defineProps<{ listOnly?: boolean; fullPage?: boolean; conversationId?: string | null }>()
defineEmits(['select', 'state', 'draft'])
defineExpose({ chat: { conversations: computed(() => ({ primary: conversations.value })), getDirectUser: () => null, marv: { isAvailable: ref(false), marvUserId: ref(null) }, marvConversationId: ref(null), conversationsApi: { refreshAllConversationTabs: async () => {} } } })
const listProps = { isTinyViewport: true, canStartNew: true, activeTab: 'primary' as const, listLoading: false, requestsBadgeText: '', badgeToneClass: '', selectedConversationId: null, nextCursor: null, loadingMore: false, typingUsersByConversationId: {}, showRequestsBadge: false, formatListTime: () => '', getConversationTitle: (conversation: { id: string }) => conversation.id, getConversationPreview: () => 'Fixture message', getDirectUser: () => null, conversationUnreadHighlightClass: () => '', conversationDotClass: () => '' }
</script>

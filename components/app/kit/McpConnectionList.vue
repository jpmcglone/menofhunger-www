<template>
  <ul class="moh-divide rounded-xl border moh-border">
    <li
      v-for="item in connections"
      :key="item.id"
      class="flex items-center justify-between gap-3 px-4 py-3"
    >
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="truncate text-sm font-semibold moh-text">{{ item.clientName }}</span>
          <span
            v-if="showAudience"
            class="shrink-0 rounded-full border moh-border px-2 py-0.5 text-[11px] text-gray-500 dark:text-gray-400"
          >{{ item.audience === 'admin' ? 'Admin' : 'Read-only' }}</span>
        </div>
        <div class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Connected {{ formatDateOnly(item.createdAt, { fallback: 'earlier' }) }}
          · Last used {{ item.lastUsedAt ? formatDateTime(item.lastUsedAt) : 'never' }}
          · Expires {{ formatDateOnly(item.expiresAt) }}
        </div>
      </div>
      <Button
        :label="actionLabel"
        size="small"
        severity="danger"
        outlined
        class="shrink-0"
        :loading="revokingId === item.id"
        :disabled="Boolean(revokingId)"
        @click="emit('revoke', item)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { McpConnectionItemDto } from '~/types/api-contracts.gen'
import { formatDateOnly, formatDateTime } from '~/utils/time-format'

withDefaults(defineProps<{
  connections: McpConnectionItemDto[]
  revokingId?: string | null
  actionLabel?: string
  showAudience?: boolean
}>(), {
  revokingId: null,
  actionLabel: 'Disconnect',
  showAudience: false,
})

const emit = defineEmits<{ revoke: [item: McpConnectionItemDto] }>()
</script>

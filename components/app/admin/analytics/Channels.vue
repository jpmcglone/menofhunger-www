<template>
  <section v-if="data.channels" class="space-y-4">
  <AppAdminKitSectionHeading>Group channels</AppAdminKitSectionHeading>
  <div class="px-4 space-y-3">
    <div class="font-semibold text-sm">
      Activity
      <span class="text-gray-400 font-normal">({{ rangeLabel }})</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="c in channelKpiCards"
        :key="c.label"
        class="rounded-xl border moh-border p-4 space-y-1.5"
      >
        <div class="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-tight">{{ c.label }}</div>
        <div class="text-2xl font-bold tabular-nums leading-none">{{ c.value }}</div>
        <div v-if="c.sub" class="text-xs text-gray-500 dark:text-gray-400 leading-tight">{{ c.sub }}</div>
      </div>
    </div>
    <AppAdminKitTableShell>
      <thead>
        <tr class="border-b moh-border text-left text-gray-500 dark:text-gray-400">
          <th class="px-4 py-3 font-medium">Channel</th>
          <th class="px-4 py-3 font-medium text-right">Messages</th>
          <th class="px-4 py-3 font-medium text-right">People</th>
        </tr>
      </thead>
      <tbody class="moh-divide">
        <tr
          v-for="ch in data.channels.topChannels"
          :key="ch.id"
          class="relative hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer"
          @click="onAnalyticsRowClick(`/groups/${encodeURIComponent(ch.groupSlug)}/channels/${encodeURIComponent(ch.id)}`, $event)"
          @auxclick="onAnalyticsRowAuxClick(`/groups/${encodeURIComponent(ch.groupSlug)}/channels/${encodeURIComponent(ch.id)}`, $event)"
        >
          <td class="px-4 py-3">
            <NuxtLink :to="`/groups/${encodeURIComponent(ch.groupSlug)}/channels/${encodeURIComponent(ch.id)}`" class="absolute inset-0 z-0" tabindex="-1" aria-hidden="true" />
            <div class="relative z-[1] font-medium">{{ ch.isPrivate ? '🔒 ' : '# ' }}{{ ch.channelName }}</div>
            <div class="relative z-[1] text-xs text-gray-400 dark:text-gray-500">{{ ch.groupName }}</div>
          </td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(ch.messagesInRange) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(ch.sendersInRange) }}</td>
        </tr>
        <tr v-if="!data.channels.topChannels.length">
          <td colspan="3" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">No channel messages in range</td>
        </tr>
      </tbody>
    </AppAdminKitTableShell>
  </div>
  </section>
</template>

<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import type { AdminAnalytics } from '~/types/api'
import { useAdminAnalyticsContext } from '~/composables/pages/admin/useAdminAnalyticsPage'

defineProps<{ data: AdminAnalytics }>()

const {
  rangeLabel,
  channelKpiCards,
  onAnalyticsRowClick,
  onAnalyticsRowAuxClick,
} = useAdminAnalyticsContext()
</script>


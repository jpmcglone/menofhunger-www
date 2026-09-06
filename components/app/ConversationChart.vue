<template>
  <div>
    <div class="flex h-24 items-end gap-1" role="group" aria-label="Daily conversation activity">
      <button
v-for="(day, index) in days" :key="day.date" type="button"
        class="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        :class="selected === index ? 'bg-sky-500/10' : 'hover:bg-sky-500/5'"
        :aria-label="`${day.date}: ${day.replies} replies, ${day.reposts} reposts, ${day.coins} coins, ${day.branches} new branches`"
        :aria-pressed="selected === index" @click="selected = index">
        <span v-if="day.branches" class="mb-1 text-[9px] text-sky-500" aria-hidden="true">◆</span>
        <span class="w-full rounded-t-sm bg-violet-400" :style="{ height: `${day.reposts / max * 65}px` }" />
        <span class="w-full bg-sky-500" :style="{ height: `${day.replies / max * 65}px`, minHeight: '2px' }" />
        <span class="mt-1 h-1 w-full rounded-full" :class="day.coins ? 'bg-amber-400' : 'bg-transparent'" />
      </button>
    </div>
    <div class="mt-1 flex justify-between text-[10px] moh-text-muted"><span>{{ days[0]?.date.slice(5) }}</span><span>{{ days.at(-1)?.date.slice(5) }} · UTC</span></div>
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs moh-text-muted" aria-live="polite">
      <span v-if="active" class="font-medium moh-text">{{ active.date.slice(5) }}</span>
      <span class="inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-sky-500" />{{ totals.replies }} replies</span>
      <span class="inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-violet-400" />{{ totals.reposts }} reposts</span>
      <span class="inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-amber-400" />{{ totals.coins }} coins</span>
      <span v-if="totals.branches" class="inline-flex items-center gap-1"><span class="text-sky-500">◆</span>{{ totals.branches }} branches</span>
      <button v-if="active" type="button" class="underline" @click="selected = null">All days</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { ConversationDay } from '~/types/api'
const props = defineProps<{ days: ConversationDay[] }>()
const selected = ref<number | null>(null)
const active = computed(() => selected.value === null ? null : props.days[selected.value])
const max = computed(() => Math.max(1, ...props.days.map(d => d.replies + d.reposts)))
const totals = computed(() => active.value ?? props.days.reduce((a, d) => ({ replies: a.replies + d.replies, reposts: a.reposts + d.reposts, coins: a.coins + d.coins, branches: a.branches + d.branches }), { replies: 0, reposts: 0, coins: 0, branches: 0 }))
</script>

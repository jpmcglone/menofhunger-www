<template>
  <ul>
    <li v-for="(item, index) in items" :key="index" class="border-b moh-border py-4">
      <div class="flex items-start gap-4">
        <h4 class="min-w-0 flex-1 text-[15px] font-semibold leading-[22px]">{{ splitRoadmapItem(item.text).title }}</h4>
        <span class="moh-meta w-[88px] shrink-0 pt-0.5 text-right">{{ item.done ? 'Done' : item.inProgress ? 'In progress' : 'Planned' }}</span>
      </div>
      <!-- HTML is escaped before authored bold markers are converted. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p v-if="splitRoadmapItem(item.text).description" class="mt-1.5 text-[15px] leading-[22px] moh-text-muted" v-html="formatRoadmapText(splitRoadmapItem(item.text).description)" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { RoadmapItem } from '~/config/roadmap.data'
import { splitRoadmapItem, formatRoadmapText } from '~/utils/roadmap'
defineProps<{ items: RoadmapItem[] }>()
</script>

<template>
  <div v-for="section in sections" :key="section.route" class="pt-2 border-t moh-border">
    <div class="font-semibold">{{ section.label }}</div>
    <div v-if="section.items.length === 0" class="moh-text-muted">None</div>
    <NuxtLink v-for="item in section.items" :key="item.id" :to="`/admin/${section.route}/${encodeURIComponent(item.id)}`" class="mt-1 block rounded-lg border moh-border px-2 py-2 moh-surface-hover" @click="$emit('navigate')">
      <div class="font-semibold">{{ item.title || 'Untitled' }}</div>
      <div class="text-xs moh-text-muted">{{ item.status }} · {{ item.isInline ? 'Body image' : 'Cover image' }}</div>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { AdminImageReviewDetailResponse } from '~/types/api'
const props = defineProps<{ references: AdminImageReviewDetailResponse['references'] }>()
defineEmits<{ navigate: [] }>()
const sections = computed(() => [
  { label: 'Announcements', route: 'announcements', items: props.references.announcements ?? [] },
  { label: 'Newsletters', route: 'newsletters', items: props.references.newsletters ?? [] },
])
</script>

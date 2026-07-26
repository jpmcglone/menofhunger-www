<template>
  <dl class="divide-y divide-[var(--moh-border-subtle)] overflow-hidden rounded-lg border border-[var(--moh-border-subtle)]">
    <div v-for="field in fields" :key="field.name" class="px-4 py-2.5">
      <div class="flex flex-wrap items-baseline gap-x-2.5">
        <dt class="font-mono text-sm font-medium text-gray-900 dark:text-gray-50">{{ field.name }}</dt>
        <dd class="font-mono text-xs text-gray-400 dark:text-zinc-500">{{ field.type }}</dd>
      </div>
      <dd v-if="field.note" class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ field.note }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import type { ApiDocsField } from '~/config/api-docs'

defineProps<{ fields: ApiDocsField[] }>()
</script>

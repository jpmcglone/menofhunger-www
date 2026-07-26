<template>
  <p class="flex flex-wrap items-baseline gap-x-2 font-mono text-sm">
    <span class="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
      GET
    </span>
    <span class="text-gray-400 dark:text-zinc-500">{{ apiBaseUrl }}</span><span class="font-medium text-gray-900 dark:text-gray-50">{{ path }}</span>
  </p>
</template>

<script setup lang="ts">
import { useApiDocsUrl } from '~/config/api-docs'

defineProps<{ path: string }>()

const { apiBaseUrl } = useApiDocsUrl()
</script>

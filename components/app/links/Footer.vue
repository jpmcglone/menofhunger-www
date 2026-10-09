<template>
  <footer class="pt-2 text-center" role="contentinfo">
    <NuxtLink
      :to="makeYourOwnTo"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-gray-900 hover:underline dark:text-gray-50"
    >
      Make your own links page
    </NuxtLink>
    <nav aria-label="Links page" class="flex flex-wrap items-center justify-center text-sm moh-text-muted">
      <NuxtLink to="/" class="inline-flex min-h-11 items-center px-2 hover:underline">{{ siteName }}</NuxtLink>
      <span aria-hidden="true">·</span>
      <button type="button" class="inline-flex min-h-11 cursor-pointer items-center px-2 hover:underline" @click="emit('report')">Report</button>
      <span aria-hidden="true">·</span>
      <NuxtLink to="/privacy" class="inline-flex min-h-11 items-center px-2 hover:underline">Privacy</NuxtLink>
    </nav>
  </footer>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'

const props = defineProps<{
  /** Signed-in visitors go straight to the editor; others sign in first. */
  isAuthed: boolean
}>()
const emit = defineEmits<{ (e: 'report'): void }>()

const siteName = siteConfig.name
const makeYourOwnTo = computed(() => (props.isAuthed ? '/settings/links' : '/login?src=links_page'))
</script>

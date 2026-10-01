<script setup lang="ts">
import { marked } from 'marked'
import guide from '~/content/developers/partner-guide.md?raw'

definePageMeta({ layout: 'default', title: 'Developers' })
usePageSeo({ title: 'Developers', description: 'Connect to Men of Hunger with OAuth, public reads and signed webhooks.', canonicalPath: '/developers', ogType: 'website' })
// Maintained repository documentation, never user-provided HTML.
const html = marked.parse(guide, { async: false })
</script>

<template>
  <AppPageContent top="standard" bottom="standard">
    <!-- Repository-owned Markdown only; no user HTML reaches this renderer. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <article class="prose dark:prose-invert mx-auto max-w-4xl px-5 py-6 prose-pre:overflow-x-auto prose-table:text-sm" v-html="html" />
  </AppPageContent>
</template>

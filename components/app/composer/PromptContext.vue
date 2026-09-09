<template>
  <section :aria-labelledby="headingId">
    <AppCheckinPromptContext :prompt="prompt" heading-tag="h2" :heading-id="headingId" metadata="Open until midnight ET · New prompt daily at 5pm ET" />
  </section>
</template>

<script setup lang="ts">
import AppCheckinPromptContext from '~/components/app/CheckinPromptContext.vue'
defineProps<{ prompt: string }>()
const headingId = useId()
</script>

<template>
  <section :aria-labelledby="headingId">
    <AppCheckinPromptContext :prompt="prompt" heading-tag="h2" :heading-id="headingId" metadata="The day here is Eastern. Open 5pm–midnight." />
  </section>
</template>

<script setup lang="ts">
import AppCheckinPromptContext from '~/components/app/dialogs/CheckinPromptContext.vue'
defineProps<{ prompt: string }>()
const headingId = useId()
</script>

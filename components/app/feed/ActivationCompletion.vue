<template>
  <!-- Shared Figma vector: Onboarding/Completion illustration, node 941:606. -->
  <div class="mx-auto max-w-[400px] space-y-6 text-center">
    <img :src="illustrationURL" width="240" height="144" alt="" class="mx-auto" aria-hidden="true">
    <p class="moh-text-muted">You’ve completed your getting-started steps. Keep the conversations going.</p>
    <p class="text-sm moh-text-muted">✓ 3 of 3 complete</p>
    <button type="button" class="min-h-11 w-full rounded-full px-5 py-3 font-semibold bg-[var(--moh-text)] text-[var(--moh-bg)]" @click="$emit('done')">Back to feed</button>
  </div>
</template>
<script setup lang="ts">
defineEmits<{ done: [] }>()
const illustrationURL = '/images/activation-completion.svg'
</script>

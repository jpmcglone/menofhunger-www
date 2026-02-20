<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Places',
})

// Backwards-compatible route: redirect to /spaces.
await navigateTo('/spaces', { redirectCode: 301 })
</script>


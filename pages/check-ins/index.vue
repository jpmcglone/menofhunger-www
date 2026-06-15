<script setup lang="ts">
definePageMeta({
  middleware: ['verified'],
})

await navigateTo('/check-ins/trending', { replace: true })
</script>

<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.tag ?? '').trim().toLowerCase())
await navigateTo(`/topics/${encodeURIComponent(slug.value)}`, { replace: true })
</script>

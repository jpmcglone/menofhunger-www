<template>
  <div class="space-y-4">
    <p class="moh-text-muted">Follow men whose conversations resonate with you.</p>
    <p v-if="loading" role="status">Loading suggestions…</p>
    <p v-if="error" role="alert">Couldn’t load suggestions. Try again.</p>
    <p v-else-if="!loading && !suggestions.length" class="moh-text-muted">No suggestions yet. Check back soon.</p>
    <AppFeedHomeWelcomePersonRow v-for="person in suggestions" :key="person.id" :user="person" :interactive="false" @followed="$emit('followed')" />
    <button type="button" class="min-h-11 w-full font-semibold" :disabled="loading" @click="refresh({ force: true })">{{ error ? 'Try again' : 'More suggestions' }}</button>
  </div>
</template>
<script setup lang="ts">
defineEmits<{ followed: [] }>()
const { users, loading, error, refresh } = useWhoToFollow({ defaultLimit: 12 })
const suggestions = computed(() => users.value.filter(person => !['john', 'menofhunger', 'marv'].includes(person.username?.toLowerCase() ?? '')))
</script>

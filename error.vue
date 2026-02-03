<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black px-4">
    <div class="max-w-md w-full text-center space-y-6">
      <h1 class="text-2xl font-bold tracking-tight moh-text">
        {{ error?.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}
      </h1>
      <p class="text-sm moh-text-muted">
        {{ error?.statusCode === 404 ? 'The page you’re looking for doesn’t exist or was moved.' : (error?.message || 'An unexpected error occurred. Please try again.') }}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium moh-text border border-[var(--moh-text)] hover:opacity-90"
        >
          Go home
        </NuxtLink>
        <NuxtLink
          to="/status"
          class="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium moh-text-muted hover:opacity-90 underline underline-offset-2"
        >
          Check status
        </NuxtLink>
        <button
          v-if="!is404"
          type="button"
          class="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium moh-text-muted hover:opacity-90 underline underline-offset-2"
          @click="handleTryAgain"
        >
          Try again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  error: { statusCode?: number; message?: string } | null
}>()

const is404 = computed(() => props.error?.statusCode === 404)

function handleTryAgain() {
  clearError({ redirect: '/' })
}
</script>

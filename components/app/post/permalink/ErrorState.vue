<template>
  <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
    <div class="text-lg font-semibold text-gray-900 dark:text-gray-50 text-balance">
      {{ errorTitle }}
    </div>
    <div class="mt-1 text-sm text-gray-700 dark:text-gray-300 text-pretty">
      {{ errorBody }}
    </div>

    <div v-if="showLoginCta" class="mt-4 flex flex-wrap items-center gap-2">
      <Button
        label="Log in"
        rounded
        @click="goToLogin"
      >
        <template #icon>
          <Icon name="tabler:door-enter" aria-hidden="true" />
        </template>
      </Button>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        You'll be returned here after logging in.
      </div>
    </div>
    <div v-else-if="showServerErrorCta" class="mt-4 flex flex-wrap items-center gap-3">
      <RouterLink to="/status" class="text-sm font-medium moh-text underline underline-offset-2">
        Check status
      </RouterLink>
      <button
        type="button"
        class="text-sm font-medium moh-text-muted hover:opacity-90 underline underline-offset-2"
        @click="reloadPage"
      >
        Try again
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePostPageContext } from '~/composables/pages/post/usePostPage'

const {
  errorTitle,
  errorBody,
  showLoginCta,
  goToLogin,
  showServerErrorCta,
  reloadPage,
} = usePostPageContext()
</script>


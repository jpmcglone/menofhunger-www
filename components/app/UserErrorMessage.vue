<template>
  <p
    v-if="message"
    class="text-sm moh-text-muted"
    :class="className"
  >
    {{ message }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getSafeUserErrorMessage } from '~/utils/api-error'

const props = withDefaults(
  defineProps<{
    /** Raw error (object, Error, string, etc.) or already-extracted message. Always sanitized for safety. */
    error: unknown | string | null
    /** Optional fallback shown when no clean message is available. */
    fallback?: string
    /** Extra classes (e.g. for spacing or color overrides). */
    class?: string
  }>(),
  {}
)

const message = computed(() =>
  getSafeUserErrorMessage(props.error, props.fallback)
)

const className = computed(() => props.class || '')
</script>

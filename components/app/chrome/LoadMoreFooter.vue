<template>
  <div class="moh-load-more" :aria-busy="state === 'loading' || undefined">
    <Transition name="moh-fade" mode="out-in">
      <span v-if="state === 'loading'" key="loading" class="moh-load-more__slot" role="status">
        <AppLogoLoader compact />
        <span class="sr-only">Loading more</span>
      </span>
      <span v-else-if="state === 'error'" key="error" class="moh-load-more__slot" role="alert">
        <span class="text-sm moh-text-muted">{{ errorLabel }}</span>
        <button type="button" class="moh-load-more__retry moh-focus moh-pressable" @click="emit('retry')">Retry</button>
      </span>
      <button
        v-else-if="state === 'idle' && manual"
        key="idle"
        type="button"
        class="moh-load-more__retry moh-focus moh-pressable"
        @click="emit('load')"
      >
        {{ loadLabel }}
      </button>
    </Transition>
  </div>
</template>

<script lang="ts">
export type LoadMoreFooterState = 'idle' | 'loading' | 'error' | 'end'
</script>

<script setup lang="ts">
// Figma brief 1 (list kit): idle (hidden unless manual), loading, error with retry, end (hidden); 44px tall.

withDefaults(defineProps<{
  state: LoadMoreFooterState
  /** Show a "Load more" button while idle instead of relying on an infinite-scroll sentinel. */
  manual?: boolean
  loadLabel?: string
  errorLabel?: string
}>(), { manual: false, loadLabel: 'Load more', errorLabel: 'Couldn’t load more.' })

const emit = defineEmits<{ retry: []; load: [] }>()
</script>

<style scoped>
.moh-load-more { display: flex; align-items: center; justify-content: center; min-height: 44px; padding: 8px 16px; }
.moh-load-more__slot { display: inline-flex; align-items: center; gap: 12px; min-height: 44px; }
.moh-load-more__retry {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: var(--moh-text);
}
</style>

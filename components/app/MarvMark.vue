<template>
  <!-- M.A.R.V glyph — bare icon, no box. Callers provide the accessible label. -->
  <Icon name="tabler:news" :class="['shrink-0', toneClass]" :style="iconStyle" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * M.A.R.V logo mark — the single glyph for "Catch me up", wherever it's triggered from.
 * Purely presentational; callers provide the accessible label.
 *
 * `tone`:
 *  - `muted` (default) — dim, for a resting affordance on a post row.
 *  - `active` — full contrast, signalling a summary is already waiting for this post.
 *  - `inherit` — takes the parent's colour, for use inside an already-coloured control.
 */
const props = withDefaults(
  defineProps<{ size?: number; tone?: 'muted' | 'active' | 'inherit' }>(),
  { size: 20, tone: 'muted' },
)

const toneClass = computed(() => {
  if (props.tone === 'active') return 'text-violet-500 dark:text-violet-400'
  if (props.tone === 'inherit') return ''
  return 'moh-text-muted'
})

const iconStyle = computed(() => ({ fontSize: `${props.size}px` }))
</script>

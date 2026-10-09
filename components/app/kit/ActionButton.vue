<template>
  <Button
    unstyled
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :aria-label="iconOnly ? label : undefined"
    class="moh-action-button"
    :class="[`moh-action-button--${kind}`, { 'moh-action-button--icon': iconOnly }]"
    :style="customFill"
  >
    <span class="moh-action-button__visual">
      <span class="inline-flex items-center justify-center gap-2" :class="{ invisible: loading }">
        <slot>{{ label }}</slot>
      </span>
      <span v-if="loading" class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <AppMarvMark v-if="marv" :size="20" loading />
        <AppIconGlyph v-else name="refresh" :size="20" class="motion-safe:animate-spin" />
      </span>
    </span>
  </Button>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { pickTextColorForBg } from '~/utils/color-contrast'
const props = withDefaults(defineProps<{
  label: string
  kind?: 'primary' | 'secondary' | 'brand' | 'danger' | 'outline' | 'ghost'
  /** Opaque hex background. Transparent surfaces use the outline/ghost variants. */
  fill?: string
  disabled?: boolean
  loading?: boolean
  iconOnly?: boolean
  marv?: boolean
}>(), { kind: 'primary', fill: undefined })
const customFill = computed(() => props.fill ? {
  '--moh-action-fill': props.fill,
  '--moh-action-label': pickTextColorForBg(props.fill),
} : undefined)
</script>

<style scoped>
.moh-action-button {
  --moh-action-fill: var(--moh-button-primary-fill);
  --moh-action-label: var(--moh-button-primary-label);
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0;
  border-radius: 999px;
  border: 0;
  background: transparent;
  color: var(--moh-action-label);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
/* Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=1387-48861
   Scale the visual surface; the button retains its full layout and hit area. */
.moh-action-button__visual {
  position: relative;
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 44px;
  padding: 11px 20px;
  border: 1px solid transparent;
  border-radius: inherit;
  background: var(--moh-action-fill);
  pointer-events: none;
  transform-origin: center;
  transition: box-shadow 150ms ease,
    transform var(--moh-duration-press) var(--moh-ease-standard);
}
.moh-action-button--secondary { --moh-action-fill: var(--moh-button-secondary-fill); --moh-action-label: var(--moh-button-secondary-label); }
.moh-action-button--brand { --moh-action-fill: var(--moh-marv); --moh-action-label: var(--moh-button-brand-label); }
.moh-action-button--danger { --moh-action-fill: var(--moh-button-danger-fill); --moh-action-label: var(--moh-button-danger-label); }
.moh-action-button--outline, .moh-action-button--ghost { --moh-action-fill: transparent; --moh-action-label: var(--moh-text); }
.moh-action-button--outline .moh-action-button__visual { border-color: var(--moh-border); }
.moh-action-button--icon { width: 44px; }
.moh-action-button--icon .moh-action-button__visual { width: 44px; padding: 10px; }
.moh-action-button:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
.moh-action-button:enabled:hover .moh-action-button__visual { box-shadow: 0 0 0 2px var(--moh-border); }
.moh-action-button:enabled:active .moh-action-button__visual { transform: scale(0.96); }
.moh-action-button:disabled { color: var(--moh-button-disabled-label); opacity: 1; cursor: default; }
.moh-action-button:disabled .moh-action-button__visual { background: var(--moh-button-disabled-fill); }
@media (prefers-reduced-motion: reduce) {
  .moh-action-button__visual { transition: none; }
  .moh-action-button:enabled:active .moh-action-button__visual { transform: none; opacity: 0.7; }
}
</style>

<template>
  <section class="moh-screen-state" :class="{ 'moh-screen-state--page': prominent }" :role="error ? 'alert' : 'status'" :aria-labelledby="titleId">
    <div class="moh-screen-state__content">
      <div class="moh-screen-state__symbol" aria-hidden="true">
        <AppIconGlyph :name="icon" :size="28" />
      </div>
      <div class="moh-screen-state__copy">
        <component :is="prominent ? 'h1' : 'h2'" :id="titleId">{{ title }}</component>
        <div v-if="description || $slots.default" class="moh-screen-state__description"><slot>{{ description }}</slot></div>
      </div>
      <div v-if="actionLabel || $slots.actions" class="moh-screen-state__actions">
        <AppActionButton v-if="actionLabel && actionTo" :as="NuxtLink" :to="actionTo" :label="actionLabel" />
        <AppActionButton v-else-if="actionLabel" :label="busy ? busyLabel : actionLabel" :disabled="busy" :aria-busy="busy || undefined" @click="emit('action')">
          <AppIconGlyph v-if="busy" name="refresh" :size="18" class="motion-safe:animate-spin" />
          {{ busy ? busyLabel : actionLabel }}
        </AppActionButton>
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import type catalog from '~/design/icon-catalog.json'

// Figma: UI Library / 27 · Recovery & empty states / Screen state (980:85).
withDefaults(defineProps<{
  title: string
  icon?: keyof typeof catalog
  description?: string | null
  prominent?: boolean
  error?: boolean
  actionLabel?: string
  actionTo?: string
  busy?: boolean
  busyLabel?: string
}>(), { icon: 'inbox', busyLabel: 'Trying again…', description: undefined, actionLabel: undefined, actionTo: undefined })
const emit = defineEmits<{ action: [] }>()
const titleId = useId()
</script>

<style scoped>
.moh-screen-state { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 280px; padding: 40px 24px; }
.moh-screen-state__content { display: flex; flex-direction: column; align-items: center; gap: 24px; width: 100%; max-width: 320px; text-align: center; }
.moh-screen-state__symbol { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px; background: var(--moh-surface-2); border: 1px solid var(--moh-border); color: var(--moh-text-muted); }
.moh-screen-state__copy { display: flex; flex-direction: column; gap: 12px; width: 100%; overflow-wrap: anywhere; }
.moh-screen-state h1, .moh-screen-state h2 { margin: 0; font-size: 20px; font-weight: 600; line-height: 1.25; letter-spacing: -0.025em; color: var(--moh-text); text-wrap: balance; }
.moh-screen-state--page h1 { font-size: 28px; }
.moh-screen-state__description { font-size: 15px; line-height: 23px; color: var(--moh-text-muted); text-wrap: pretty; }
.moh-screen-state__actions { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.moh-screen-state__actions :deep(a), .moh-screen-state__actions :deep(button) { min-height: 44px; justify-content: center; }
.moh-screen-state__actions :deep(a:focus-visible) { outline: 2px solid var(--moh-brass); outline-offset: 3px; border-radius: 999px; }
</style>

<template>
  <component :is="asLink ? NuxtLink : 'div'" :to="asLink ? to : undefined" :class="wrapperClass">
    <img
      class="moh-logo--light"
      :src="resolvedLightSrc"
      :alt="alt"
      :width="width"
      :height="height"
      :class="imgClass"
      :style="imgStyle"
      decoding="async"
      loading="eager"
      draggable="false"
    >
    <img
      class="moh-logo--dark"
      :src="resolvedDarkSrc"
      :alt="alt"
      :width="width"
      :height="height"
      :class="imgClass"
      :style="imgStyle"
      decoding="async"
      loading="eager"
      draggable="false"
    >
  </component>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import logoLightDefault from '~/assets/images/logo-white-bg-small.png'
import logoDarkDefault from '~/assets/images/logo-black-bg-small.png'

const props = withDefaults(
  defineProps<{
    alt: string
    /** Render as a link (NuxtLink) */
    asLink?: boolean
    to?: string
    /** Optional overrides (defaults come from ~/assets/images) */
    lightSrc?: string
    darkSrc?: string
    /** Explicit size to prevent "unstyled huge image" flash on hard reload */
    width?: number
    height?: number
    /** Optional class names */
    wrapperClass?: string
    imgClass?: string
  }>(),
  {
    asLink: false,
    to: '/',
    lightSrc: undefined,
    darkSrc: undefined,
    width: 400,
    height: 400,
    wrapperClass: '',
    imgClass: '',
  },
)

const NuxtLink = resolveComponent('NuxtLink')

const resolvedLightSrc = computed(() => props.lightSrc || logoLightDefault)
const resolvedDarkSrc = computed(() => props.darkSrc || logoDarkDefault)

// Inline styles apply even before Tailwind loads.
const imgStyle = computed(() => {
  return {
    maxWidth: '90vw',
    height: 'auto',
    userSelect: 'none',
    // Not part of standard CSSProperties in all TS lib versions.
    WebkitUserDrag: 'none',
  } as CSSProperties
})
</script>

<style>
/* Switch immediately based on Nuxt Color Mode's `.dark` class */
.moh-logo--dark { display: none; }
.dark .moh-logo--dark { display: block; }
.dark .moh-logo--light { display: none; }

/* Light mode: white in logo becomes transparent (multiply). Dark mode: black becomes transparent (screen). */
.moh-logo--light { mix-blend-mode: multiply; }
.moh-logo--dark { mix-blend-mode: screen; }
</style>

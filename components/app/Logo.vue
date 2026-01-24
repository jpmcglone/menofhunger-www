<template>
  <component :is="asLink ? NuxtLink : 'div'" :to="asLink ? to : undefined" :class="wrapperClass">
    <img
      class="moh-logo--light"
      :src="lightSrc"
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
      :src="darkSrc"
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

withDefaults(
  defineProps<{
    alt: string
    /** Render as a link (NuxtLink) */
    asLink?: boolean
    to?: string
    /** Image sources (from /public) */
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
    lightSrc: '/images/logo-white-bg-small.png',
    darkSrc: '/images/logo-black-bg-small.png',
    width: 400,
    height: 400,
    wrapperClass: '',
    imgClass: ''
  }
)

const NuxtLink = resolveComponent('NuxtLink')

// Inline styles apply even before Tailwind loads.
const imgStyle = computed(() => {
  return {
    maxWidth: '90vw',
    height: 'auto',
    userSelect: 'none',
    // Not part of standard CSSProperties in all TS lib versions.
    WebkitUserDrag: 'none'
  } as CSSProperties
})
</script>

<style>
/* Switch immediately based on Nuxt Color Mode's `.dark` class */
.moh-logo--dark { display: none; }
.dark .moh-logo--dark { display: block; }
.dark .moh-logo--light { display: none; }
</style>

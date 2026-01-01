<template>
  <component :is="asLink ? NuxtLink : 'div'" :to="asLink ? to : undefined" :class="wrapperClass">
    <!-- If user explicitly overrides (light/dark), render a single <img> to avoid any flash. -->
    <img
      v-if="preference !== 'system'"
      :src="preference === 'dark' ? darkSrc : lightSrc"
      :alt="alt"
      :width="width"
      :height="height"
      :class="imgClass"
      :style="imgStyle"
      decoding="async"
      loading="eager"
      draggable="false"
    >

    <!-- System: use <picture> so browser picks correct asset before JS/CSS (no hard-reload flash). -->
    <picture v-else>
      <source :srcset="darkSrc" media="(prefers-color-scheme: dark)">
      <img
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
    </picture>
  </component>
</template>

<script setup lang="ts">
type ModePreference = 'system' | 'light' | 'dark'

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
    lightSrc: '/images/logo-white-bg.png',
    darkSrc: '/images/logo-black-bg.png',
    width: 400,
    height: 400,
    wrapperClass: '',
    imgClass: ''
  }
)

const NuxtLink = resolveComponent('NuxtLink')
const colorMode = useColorMode()

const preference = computed<ModePreference>(() => (colorMode.preference as ModePreference) || 'system')

// Inline styles apply even before Tailwind loads.
const imgStyle = computed(() => ({
  maxWidth: '90vw',
  height: 'auto',
  userSelect: 'none',
  WebkitUserDrag: 'none'
}))
</script>


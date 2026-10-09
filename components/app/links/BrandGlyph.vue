<template>
  <Icon
    v-if="glyph.kind === 'iconify'"
    :name="glyph.name"
    :class="sizeClass"
    aria-hidden="true"
  />
  <img
    v-else-if="glyph.kind === 'image'"
    :src="glyph.src"
    alt=""
    aria-hidden="true"
    :class="[sizeClass, 'rounded-[4px] object-contain']"
    width="24"
    height="24"
    loading="lazy"
    decoding="async"
  >
  <svg
    v-else
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    :class="sizeClass"
  >
    <path :d="glyph.path" />
  </svg>
</template>

<script setup lang="ts">
import { profileLinkGlyph } from '~/utils/profile-link-icons'

const props = withDefaults(defineProps<{
  /** A ProfileLinkIcon from the API; unknown values render as a website. */
  icon?: string | null
  sizeClass?: string
}>(), { icon: null, sizeClass: 'size-6' })

const glyph = computed(() => profileLinkGlyph(props.icon))
</script>

<!-- Anchor shell shared by link-preview cards: external links open through the "leaving Men of Hunger"
     confirmation, Men of Hunger URLs become NuxtLinks, and preview-only mode renders the same card as a div. -->
<template>
  <component :is="tag" v-bind="shellAttrs" @click.stop="onClick">
    <slot />
  </component>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  href?: string | null
  /** In-app path; renders a NuxtLink and skips the external confirmation. */
  internalPath?: string | null
  /** Drafts and composers: same card, not a link. */
  previewOnly?: boolean
  rel?: string
}>(), {
  href: null,
  internalPath: null,
  previewOnly: false,
  rel: 'noopener noreferrer',
})

const { onClick: confirmExternal } = useExternalLinkConfirm()
const NuxtLink = resolveComponent('NuxtLink')

const linkHref = computed(() => {
  if (props.previewOnly || props.internalPath) return null
  return (props.href ?? '').trim() || null
})

const tag = computed(() => {
  if (props.internalPath) return NuxtLink
  return linkHref.value ? 'a' : 'div'
})

const shellAttrs = computed(() => {
  if (props.internalPath) return { to: props.internalPath }
  if (!linkHref.value) return {}
  return { href: linkHref.value, target: '_blank', rel: props.rel }
})

function onClick(event: MouseEvent) {
  if (linkHref.value) confirmExternal(event, linkHref.value)
}
</script>

<template>
  <NuxtLink
    v-if="shell"
    :to="`/g/${encodeURIComponent(shell.slug)}`"
    class="font-semibold text-[var(--moh-link)] no-underline hover:underline"
    @click.stop
    @mouseenter="onEnter"
    @mousemove="onMove"
    @mouseleave="onLeave"
  >{{ text }}</NuxtLink>
  <span v-else>{{ text }}</span>
</template>

<script setup lang="ts">
/** An `&slug` group shortcut: a link with a hover preview once the slug resolves to a group. */
const props = defineProps<{ slug: string; text: string }>()
const { resolve, shellFor } = useGroupMentionShells()
const shell = computed(() => shellFor(props.slug))
const { onEnter, onMove, onLeave } = useGroupPreviewTrigger({ shell })
onMounted(() => { void resolve(props.slug) })
</script>

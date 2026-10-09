<template>
  <NuxtLink
v-if="reference.accessible && reference.channelId && groupSlug" :to="channelLink(groupSlug, reference.channelId)"
    class="moh-channel-reference moh-focus hover:bg-[var(--moh-surface-3)]" :aria-label="`${reference.privacy === 'private' ? 'Private channel' : 'Channel'} ${label}`" @click.stop>
    <Icon :name="icon" class="size-3.5 shrink-0" aria-hidden="true" /><span class="moh-channel-reference-label">{{ label }}</span>
  </NuxtLink>
  <span v-else class="moh-channel-reference moh-text-muted" aria-label="Private channel"><Icon name="tabler:lock" class="size-3.5 shrink-0" aria-hidden="true" />Private</span>
</template>
<script setup lang="ts">
import type { ChannelReference } from '~/types/api'
import { channelReferenceLabel } from '~/utils/channels/references'
import { channelLink } from '~/utils/channels/reducer'
const props = defineProps<{ reference: ChannelReference; groupSlug?: string }>()
const label = computed(() => channelReferenceLabel(props.reference))
const icon = computed(() => props.reference.privacy === 'private' ? 'tabler:lock' : 'tabler:hash')
</script>

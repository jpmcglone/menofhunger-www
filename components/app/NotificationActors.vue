<template>
  <div class="flex flex-wrap items-center gap-1" @click.stop>
    <template v-for="actor in actors.slice(0, 4)" :key="actor.id">
      <NuxtLink v-if="actor.username" :to="`/u/${actor.username}`" :aria-label="actor.name || actor.username" class="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" @click.stop>
        <AppUserAvatar :user="actor" :size-class="size === 40 ? 'h-10 w-10' : 'h-8 w-8'" :show-status="false" />
      </NuxtLink>
      <AppUserAvatar v-else :user="actor" :size-class="size === 40 ? 'h-10 w-10' : 'h-8 w-8'" :show-status="false" />
    </template>
    <span v-if="overflow > 0" class="px-1 text-xs tabular-nums moh-text-muted">+{{ overflow }}</span>
  </div>
</template>

<script setup lang="ts">
import type { NotificationActor } from '~/types/api'
const props = defineProps<{ actors: NotificationActor[]; actorCount?: number; size?: 32 | 40 }>()
const overflow = computed(() => Math.max(0, (props.actorCount ?? props.actors.length) - Math.min(props.actors.length, 4)))
</script>

<template>
  <div class="flex h-10 w-8 shrink-0 items-center justify-center" aria-hidden="true">
    <AppMarvMark v-if="kind === 'marv_not_in_group'" :size="30" />
    <Icon v-else :name="presentation.icon" class="text-[30px]" :class="presentation.color" />
  </div>
</template>

<script setup lang="ts">
import { notificationPresentation } from '~/utils/notification-presentation'
import type { UserTierLike } from '~/utils/user-tier'
const props = defineProps<{ kind: string; actors?: UserTierLike[] }>()
const presentation = computed(() => notificationPresentation(props.kind, props.actors))
</script>

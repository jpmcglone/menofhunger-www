<template>
  <div>
    <Button
      v-if="showButton"
      :label="buttonLabel"
      :severity="buttonSeverity"
      :rounded="rounded"
      :text="text"
      :icon="buttonIcon"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
      @click="onClick"
    />

    <Dialog v-model:visible="confirmOpen" modal header="Unfollow?" :style="{ width: '26rem' }" :draggable="false">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        Unfollow <span class="font-semibold">@{{ username }}</span>?
      </p>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="confirmOpen = false" />
        <Button label="Unfollow" severity="danger" @click="confirmUnfollow" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { FollowRelationship } from '~/types/api'

const props = defineProps<{
  userId: string
  username: string | null
  initialRelationship?: FollowRelationship | null
  rounded?: boolean
  text?: boolean
}>()

const emit = defineEmits<{
  (e: 'followed'): void
  (e: 'unfollowed'): void
}>()

const rounded = computed(() => props.rounded !== false)
const text = computed(() => Boolean(props.text))

const { user: authUser } = useAuth()
const isAuthed = computed(() => Boolean(authUser.value?.id))
const route = useRoute()

const followState = useFollowState()

// Hydrate store if caller passed relationship.
watch(
  () => props.initialRelationship,
  (rel) => {
    if (!rel) return
    followState.set(props.userId, rel)
  },
  { immediate: true }
)

const relationship = computed(() => followState.get(props.userId) ?? props.initialRelationship ?? null)
const viewerFollowsUser = computed(() => Boolean(relationship.value?.viewerFollowsUser))
const userFollowsViewer = computed(() => Boolean(relationship.value?.userFollowsViewer))

const hovering = ref(false)
const confirmOpen = ref(false)

// When signed out, never show follow controls anywhere.
const showButton = computed(
  () => isAuthed.value && Boolean(props.username) && props.userId !== authUser.value?.id
)
const username = computed(() => props.username || '')

const buttonLabel = computed(() => {
  if (!viewerFollowsUser.value) return userFollowsViewer.value ? 'Follow Back' : 'Follow'
  if (hovering.value) return 'Unfollow'
  return 'Following'
})

const buttonSeverity = computed(() => {
  if (!viewerFollowsUser.value) return 'primary'
  if (hovering.value) return 'danger'
  return 'secondary'
})

const buttonIcon = computed(() => {
  if (!viewerFollowsUser.value) return 'pi pi-plus'
  if (hovering.value) return 'pi pi-times'
  return 'pi pi-check'
})

async function onClick() {
  if (!props.username) return
  if (!isAuthed.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
  }

  if (viewerFollowsUser.value) {
    confirmOpen.value = true
    return
  }

  await followState.follow({ userId: props.userId, username: props.username })
  emit('followed')
}

async function confirmUnfollow() {
  confirmOpen.value = false
  if (!props.username) return
  await followState.unfollow({ userId: props.userId, username: props.username })
  emit('unfollowed')
}
</script>


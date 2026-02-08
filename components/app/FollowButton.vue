<template>
  <div>
    <Button
      v-if="showButton"
      :label="buttonLabel"
      :severity="buttonSeverity"
      :rounded="rounded"
      :text="text"
      :size="props.size"
      :class="[
        '!rounded-full !font-semibold',
        // Dark mode: always show follow controls as a white pill with black text (even on hover/unfollow state).
        // Keep `!` so this wins over PrimeVue severity classes.
        'dark:!bg-white dark:!text-black dark:!border dark:!border-solid dark:!border-white dark:hover:!bg-white dark:hover:!text-black dark:hover:!border-white',
        props.buttonClass,
      ]"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
      @click="onClick"
    >
      <template v-if="props.showIcon !== false" #icon>
        <Icon :name="buttonIconName" aria-hidden="true" />
      </template>
    </Button>

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
  /** PrimeVue Button size (e.g. 'small'). */
  size?: 'small' | 'large' | undefined
  /** Optional class overrides for the underlying PrimeVue Button. */
  buttonClass?: string
  /** When false, hide the leading icon (e.g. compact rails). */
  showIcon?: boolean
}>()

const emit = defineEmits<{
  (e: 'followed'): void
  (e: 'unfollowed'): void
  (e: 'confirm-opened'): void
  (e: 'confirm-closed'): void
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

watch(
  confirmOpen,
  (open) => {
    if (open) emit('confirm-opened')
    else emit('confirm-closed')
  },
)

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

const buttonIconName = computed(() => {
  if (!viewerFollowsUser.value) return 'tabler:plus'
  if (hovering.value) return 'tabler:x'
  return 'tabler:check'
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


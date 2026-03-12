<template>
  <div>
    <!-- Following state: fixed-width pill with cross-fading "Following" ↔ "Unfollow" labels -->
    <button
      v-if="showButton && viewerFollowsUser"
      type="button"
      class="relative inline-flex items-center overflow-hidden rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      :class="hovering
        ? 'border-red-500 text-red-500 dark:border-red-400 dark:text-red-400'
        : 'border-gray-300 text-gray-900 dark:border-zinc-500 dark:text-white'"
      @mouseenter="onMouseEnter"
      @mouseleave="hovering = false"
      @click="onClick"
    >
      <!-- Invisible spacer — locks button width to "Following" size -->
      <span class="invisible flex items-center gap-1.5" aria-hidden="true">
        <Icon name="tabler:check" class="text-[14px]" aria-hidden="true" />
        Following
      </span>
      <!-- "Following" label — fades out on hover -->
      <span
        class="absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity duration-150"
        :class="hovering ? 'opacity-0' : 'opacity-100'"
        aria-hidden="true"
      >
        <Icon name="tabler:check" class="text-[14px]" aria-hidden="true" />
        <span>Following</span>
      </span>
      <!-- "Unfollow" label — fades in on hover -->
      <span
        class="absolute inset-0 flex items-center justify-center transition-opacity duration-150"
        :class="hovering ? 'opacity-100' : 'opacity-0'"
      >
        Unfollow
      </span>
    </button>

    <!-- Not-following state: standard PrimeVue follow button -->
    <Button
      v-else-if="showButton"
      :label="followLabel"
      severity="primary"
      :rounded="rounded"
      :text="text"
      :size="props.size"
      :class="[
        '!rounded-full !font-semibold',
        'dark:!bg-white dark:!text-black dark:!border dark:!border-solid dark:!border-white dark:hover:!bg-white dark:hover:!text-black dark:hover:!border-white',
        props.buttonClass,
      ]"
      @click="onClick"
    >
      <template v-if="props.showIcon !== false" #icon>
        <Icon name="tabler:plus" aria-hidden="true" />
      </template>
    </Button>

    <AppConfirmDialog
      v-model:visible="confirmOpen"
      header="Unfollow?"
      confirm-label="Unfollow"
      @confirm="confirmUnfollow"
    >
      Unfollow <span class="font-semibold">@{{ username }}</span>?
    </AppConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import type { FollowRelationship } from '~/types/api'
import { isRecentTouch } from '~/utils/recent-touch'

const props = defineProps<{
  userId: string
  username: string | null
  initialRelationship?: FollowRelationship | null
  /** When true, render the button even while logged out (click will route to login). */
  showWhenLoggedOut?: boolean
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

function onMouseEnter() {
  if (isRecentTouch()) return
  hovering.value = true
}

watch(
  confirmOpen,
  (open) => {
    if (open) emit('confirm-opened')
    else emit('confirm-closed')
  },
)

// When signed out, never show follow controls anywhere.
const showButton = computed(
  () => Boolean(props.username) && props.userId !== authUser.value?.id && (isAuthed.value || props.showWhenLoggedOut === true)
)
const username = computed(() => props.username || '')

const followLabel = computed(() => userFollowsViewer.value ? 'Follow Back' : 'Follow')

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


<template>
  <Teleport to="body">
    <Transition name="popover">
      <div
        v-if="open && target"
        ref="menuEl"
        class="fixed z-[9999] min-w-[200px] overflow-hidden rounded-xl border moh-border moh-surface shadow-lg"
        :style="style"
        role="menu"
        @click.stop
      >
        <!-- Header: who is this menu for -->
        <div class="flex items-center gap-2.5 px-3.5 py-2.5 border-b moh-border">
          <AppUserAvatar
            :user="target.user"
            size-class="h-8 w-8"
            :enable-preview="false"
          />
          <AppUserIdentityLine
            :user="target.user"
            name-class="text-sm"
            handle-class="text-[11px]"
            badge-size="xs"
            :interactive="false"
          >
            <template #after-name>
              <span
                v-if="target.kind === 'pendingInvite'"
                class="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-500/15 text-zinc-600 dark:text-zinc-300"
              >
                <Icon name="tabler:clock" class="text-[10px]" aria-hidden="true" />
                Pending
              </span>
              <span
                v-else-if="target.role === 'owner'"
                class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300"
              >
                Owner
              </span>
            </template>
          </AppUserIdentityLine>
        </div>

        <div class="py-1">
          <NuxtLink
            v-if="target.user.username"
            :to="`/u/${encodeURIComponent(target.user.username)}`"
            class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm moh-text hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            @click="close"
          >
            <Icon name="tabler:user" class="text-[15px] shrink-0" aria-hidden="true" />
            <span>View profile</span>
          </NuxtLink>

          <button
            v-if="target.kind === 'pendingInvite'"
            type="button"
            class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            @click="onCancelInvite"
          >
            <Icon name="tabler:user-x" class="text-[15px] shrink-0" aria-hidden="true" />
            <span>Cancel invite</span>
          </button>

          <button
            v-else-if="canRemoveMember"
            type="button"
            class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            @click="onRemoveMember"
          >
            <Icon name="tabler:user-minus" class="text-[15px] shrink-0" aria-hidden="true" />
            <span>Remove from crew</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { CrewMemberRole, CrewUserSummary } from '~/types/api'

export type CrewMemberActionTarget =
  | {
      kind: 'member'
      user: CrewUserSummary
      role: CrewMemberRole
    }
  | {
      kind: 'pendingInvite'
      user: CrewUserSummary
      inviteId: string
    }

const props = defineProps<{
  open: boolean
  target: CrewMemberActionTarget | null
  anchorEl: HTMLElement | null
  viewerIsOwner: boolean
  viewerUserId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'removeMember', userId: string): void
  (e: 'cancelInvite', inviteId: string): void
}>()

const { style, menuEl, place, reset } = useMenuPosition()

const canRemoveMember = computed(() => {
  if (!props.target || props.target.kind !== 'member') return false
  if (!props.viewerIsOwner) return false
  if (props.target.role === 'owner') return false
  if (props.viewerUserId && props.target.user.id === props.viewerUserId) return false
  return true
})

function close() {
  emit('update:open', false)
}

function onCancelInvite() {
  if (props.target?.kind === 'pendingInvite') {
    emit('cancelInvite', props.target.inviteId)
  }
  close()
}

function onRemoveMember() {
  if (props.target?.kind === 'member') {
    emit('removeMember', props.target.user.id)
  }
  close()
}

watch(
  () => [props.open, props.anchorEl] as const,
  ([open, anchor]) => {
    if (open && anchor) {
      nextTick(() => {
        place(anchor as HTMLElement, { align: 'start', menuWidth: 220, menuHeight: 160 })
      })
    } else if (!open) {
      reset()
    }
  },
  { immediate: true, flush: 'post' },
)

function onDocPointerDown(e: PointerEvent) {
  if (!props.open) return
  const target = e.target as Node | null
  if (!target) return
  if (menuEl.value?.contains(target)) return
  if (props.anchorEl?.contains(target)) return
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

function onResizeOrScroll() {
  if (props.open && props.anchorEl) {
    place(props.anchorEl, { align: 'start', menuWidth: 220, menuHeight: 160 })
  }
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('pointerdown', onDocPointerDown, true)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResizeOrScroll)
  window.addEventListener('scroll', onResizeOrScroll, true)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('pointerdown', onDocPointerDown, true)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResizeOrScroll)
  window.removeEventListener('scroll', onResizeOrScroll, true)
})
</script>

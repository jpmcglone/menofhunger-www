<template>
  <div>
    <button
      type="button"
      class="moh-focus flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
      :aria-label="currentGroup ? `${currentGroup.name} — switch group` : 'Switch group'"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <AppGroupsGroupAvatar v-if="currentGroup" :name="currentGroup.name" :src="currentGroup.avatarImageUrl" :size="40" />
      <AppLogo v-else :alt="siteConfig.name" :width="28" :height="28" img-class="h-7 w-7 rounded" />
    </button>
    <Popover ref="popoverRef" :pt="{ root: { class: 'shadow-xl border moh-border moh-popover rounded-2xl p-1 w-72' } }" @show="open = true" @hide="open = false">
      <div class="max-h-[60vh] overflow-y-auto" role="menu" aria-label="Switch group">
        <NuxtLink to="/home" role="menuitem" class="moh-focus moh-surface-hover flex min-h-12 items-center gap-3 rounded-xl px-3" @click="onHome">
          <AppLogo :alt="siteConfig.name" :width="24" :height="24" img-class="h-6 w-6 rounded" />
          <span class="min-w-0 flex-1 text-sm font-semibold">Men of Hunger</span>
          <Icon v-if="!currentGroup" name="tabler:check" class="moh-text-muted" aria-hidden="true" />
        </NuxtLink>
        <template v-if="groups.length">
          <div class="my-1 border-t moh-border" />
          <NuxtLink
            v-for="group in groups"
            :key="group.id"
            :to="lastDestination(group)"
            role="menuitem"
            class="moh-focus moh-surface-hover flex min-h-12 items-center gap-3 rounded-xl px-3"
            @click="hide"
          >
            <AppGroupsGroupAvatar :name="group.name" :src="group.avatarImageUrl" :size="28" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{{ group.name }}</span>
              <span v-if="groupsUnread.byGroupId[group.id]" class="block text-xs moh-text-muted">{{ groupsUnread.byGroupId[group.id] }} new</span>
            </span>
            <AppActivityBadge v-if="badgeFor(group.id).personalCount || badgeFor(group.id).hasUnread" :count="badgeFor(group.id).personalCount" :has-unread="badgeFor(group.id).hasUnread" count-label="channel mentions" unread-label="Unread channels" />
            <Icon v-if="currentGroup?.id === group.id" name="tabler:check" class="moh-text-muted" aria-hidden="true" />
          </NuxtLink>
        </template>
        <div class="my-1 border-t moh-border" />
        <NuxtLink to="/groups" role="menuitem" class="moh-focus moh-surface-hover flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm" @click="hide">
          <Icon name="tabler:users-group" class="size-7 p-1" />All group activity
        </NuxtLink>
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'

const emit = defineEmits<{ home: [event: MouseEvent] }>()
const { groups, load } = useMyGroups()
const { groupsUnread } = usePresence()
const { lastDestination } = useGroupDestinations()
const { badgeFor } = useGroupChannelBadges()
const popoverRef = ref<{ toggle: (e: Event) => void; hide: () => void } | null>(null)
const open = ref(false)

const currentGroup = useCurrentGroup()

function toggle(event: Event) {
  popoverRef.value?.toggle(event)
  if (!open.value) void load().catch(() => undefined)
}
function hide() { popoverRef.value?.hide() }
function onHome(event: MouseEvent) { hide(); emit('home', event) }
onMounted(() => { void load().catch(() => undefined) })
</script>

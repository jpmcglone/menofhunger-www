<template>
  <div class="sticky top-0 z-20 border-b moh-border moh-surface">
    <div class="flex min-h-12 items-center justify-between pr-2">
      <nav ref="navEl" class="relative flex gap-6 moh-gutter-x" aria-label="Group destinations">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.key"
          :ref="el => setTab(tab.key, el)"
          :to="tab.to"
          class="moh-focus relative flex min-h-12 items-center gap-1.5 text-[15px] transition-colors"
          :class="selected === tab.key ? 'font-semibold moh-text' : 'font-medium moh-text-soft hover:text-[var(--moh-text-muted)]'"
          :aria-current="selected === tab.key ? 'page' : undefined"
        >
          <AppChannelsGlyph :kind="tab.key === 'posts' ? 'posts' : 'hash'" :size="20" :stroke-width="selected === tab.key ? 2.3 : 2" />
          {{ tab.label }}
          <AppActivityBadge v-if="tab.key === 'channels' && (channelBadge.personalCount || channelBadge.hasUnread)" :count="channelBadge.personalCount" :has-unread="channelBadge.hasUnread" count-label="channel mentions" unread-label="Unread channels" />
          <AppActivityBadge v-else-if="tab.key === 'posts' && newPosts" :count="newPosts" count-label="new posts" />
        </NuxtLink>
        <span
          class="pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-full bg-[var(--moh-text)] transition-[transform,width] duration-200 ease-out motion-reduce:transition-none"
          :style="{ width: `${underline.width}px`, transform: `translateX(${underline.x}px)`, opacity: underline.ready ? 1 : 0 }"
          aria-hidden="true"
        />
      </nav>
      <NuxtLink :to="`/g/${encodeURIComponent(group.slug)}/settings`" class="moh-focus flex size-11 items-center justify-center" aria-label="Group settings"><Icon name="tabler:settings" /></NuxtLink>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
const props = defineProps<{ group: CommunityGroupShell; selected: 'posts' | 'channels' }>()
// Channels lead: it is where group conversation lives, and where entering a group lands.
const tabs = computed(() => [
  { key: 'channels' as const, label: 'Channels', to: `/groups/${encodeURIComponent(props.group.slug)}/channels` },
  { key: 'posts' as const, label: 'Posts', to: `/g/${encodeURIComponent(props.group.slug)}` },
])
// The tab bar remounts when switching pages; remember the previous tab so the underline slides.
const previousTab = useState<'posts' | 'channels' | null>('group-tab-previous', () => null)
const navEl = ref<HTMLElement | null>(null)
const tabEls = new Map<string, HTMLElement>()
const underline = reactive({ x: 0, width: 28, ready: false })
function setTab(key: string, el: unknown) {
  const node = (el as { $el?: HTMLElement } | null)?.$el ?? (el as HTMLElement | null)
  if (node) tabEls.set(key, node)
}
function placeUnderline(key: string) {
  const el = tabEls.get(key)
  if (!el) return
  underline.width = 28
  underline.x = el.offsetLeft + (el.offsetWidth - 28) / 2
  underline.ready = true
}
onMounted(async () => {
  await nextTick()
  const from = previousTab.value
  if (from && from !== props.selected) {
    placeUnderline(from)
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }
  placeUnderline(props.selected)
  previousTab.value = props.selected
})
watch(() => props.selected, key => { placeUnderline(key); previousTab.value = key })
const route = useRoute()
const { remember } = useGroupDestinations()
const { groupsUnread } = usePresence()
const { badgeFor } = useGroupChannelBadges()
// Live counts come from the shared stores the app layout keeps current; this bar only reads them.
const channelBadge = computed(() => badgeFor(props.group.id))
const newPosts = computed(() => groupsUnread.value.byGroupId[props.group.id] ?? 0)
onMounted(() => remember(props.group, route.fullPath))
watch(() => route.fullPath, path => remember(props.group, path))
</script>

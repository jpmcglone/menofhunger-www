<template>
  <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 1113:3097 (trigger), 481:2265 (dialog) -->
  <button type="button" class="inline-flex min-h-11 max-w-full items-center rounded-[10px] outline-none focus-visible:underline underline-offset-4" :aria-label="`Post to: ${selected?.name ?? visibilityLabel}`" aria-haspopup="dialog" :aria-expanded="open" @click="open = true">
    <span class="inline-flex min-w-0 items-center gap-1.5 rounded-[10px] border px-2.5 py-[5px] text-sm font-semibold leading-5" :class="chipClass">
      <span class="shrink-0">Post to:</span>
      <span class="max-w-48 truncate">{{ selected?.name ?? (modelValue ? 'Group' : visibilityLabel) }}</span>
      <Icon name="tabler:chevron-down" class="shrink-0 text-sm" aria-hidden="true" />
    </span>
  </button>
  <AppComposerSelectionDialog v-model="open" title="Post to" :description="activeTab === 'feed' ? 'Who can see your post in the feed.' : 'Visibility is set by the group.'">
    <div class="mx-3 mb-3 flex gap-1 rounded-xl bg-[var(--moh-surface-2)] p-1" role="tablist" aria-label="Post destination">
      <button v-for="tab in destinationTabs" :id="`${pickerId}-${tab.value}-tab`" :key="tab.value" type="button" role="tab" :aria-selected="activeTab === tab.value" :aria-controls="`${pickerId}-${tab.value}-panel`" :tabindex="activeTab === tab.value ? 0 : -1" class="moh-focus flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold" :class="activeTab === tab.value ? 'bg-[var(--moh-surface-hover)] moh-text' : 'moh-text-muted'" @click="activeTab = tab.value" @keydown="onTabKeydown($event, tab.value)">
        <AppIconGlyph :name="tab.icon" :size="18" aria-hidden="true" />{{ tab.label }}
      </button>
    </div>
    <div v-if="activeTab === 'feed'" :id="`${pickerId}-feed-panel`" role="tabpanel" :aria-labelledby="`${pickerId}-feed-tab`">
    <AppComposerSelectionRow v-for="option in visibilityOptions" :key="option.value" :label="option.label" :description="option.description" :icon="option.icon" :color="option.color" :selected="!modelValue && visibility === option.value" :locked="option.value === 'premiumOnly' && !isPremium" @select="selectVisibility(option.value)" />
    </div>
    <div v-else :id="`${pickerId}-group-panel`" role="tabpanel" :aria-labelledby="`${pickerId}-group-tab`">
    <InputText v-model="query" class="w-full" placeholder="Search your groups" aria-label="Search your groups" />
    <p class="px-3 pb-2 pt-4 text-xs font-semibold uppercase moh-text-muted">Your groups</p>
    <div v-if="loading && !groups.length" class="px-3 py-5 moh-meta" role="status">Loading your groups…</div>
    <div v-if="error" class="px-3 py-3" role="alert"><p class="moh-meta">{{ error }}</p><Button label="Try again" text @click="$emit('open')" /></div>
    <div class="max-h-[45vh] overflow-y-auto">
      <AppComposerSelectionRow v-for="group in filteredGroups" :key="group.id" :label="group.name" :description="group.joinPolicy === 'open' ? 'Verified members can read' : 'Members only'" :selected="modelValue === group.id" @select="select(group.id)">
        <template #icon><AppGroupsGroupAvatar :name="group.name" :src="group.avatarImageUrl" /></template>
      </AppComposerSelectionRow>
      <p v-if="!loading && !error && !filteredGroups.length" class="px-3 py-5 moh-meta">{{ query ? 'No groups match your search.' : 'You haven’t joined any groups yet.' }}</p>
    </div>
    <NuxtLink v-if="!loading && !groups.length" to="/groups/explore" class="moh-focus inline-flex min-h-11 items-center px-3 text-sm moh-text" @click="open = false">Explore groups</NuxtLink>
    </div>
    <template v-if="showsChat"><div class="my-3 border-t moh-border" /><AppComposerSelectionRow label="Chat" description="Send as a message" icon="tabler:messages" @select="open = false; emit('select-chat')" /></template>
  </AppComposerSelectionDialog>
</template>

<script setup lang="ts">
import type { PostVisibility } from '~/types/api'
const props = defineProps<{ groups: readonly { id: string; name: string; avatarImageUrl?: string | null; joinPolicy?: string }[]; modelValue: string | null; loading?: boolean; error?: string | null; showsChat?: boolean; visibility: PostVisibility; allowed: PostVisibility[]; isPremium: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [id: string | null]; open: []; 'select-chat': []; 'select-visibility': [visibility: PostVisibility] }>()
const pickerId = useId()
const destinationTabs = [
  { value: 'feed', label: 'Feed', icon: 'home' },
  { value: 'group', label: 'Group', icon: 'group' },
] as const
type DestinationTab = typeof destinationTabs[number]['value']
const activeTab = ref<DestinationTab>(props.modelValue ? 'group' : 'feed')
function onTabKeydown(event: KeyboardEvent, current: DestinationTab) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  activeTab.value = event.key === 'Home' ? 'feed' : event.key === 'End' ? 'group' : current === 'feed' ? 'group' : 'feed'
  document.getElementById(`${pickerId}-${activeTab.value}-tab`)?.focus()
}
const open = ref(false)
const query = ref('')
const selected = computed(() => props.groups.find(group => group.id === props.modelValue))
const filteredGroups = computed(() => props.groups.filter(group => group.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
watch(open, value => { if (value) { activeTab.value = props.modelValue ? 'group' : 'feed'; query.value = ''; emit('open') } })
function select(id: string | null) { emit('update:modelValue', id); open.value = false }

const choices: { value: PostVisibility; label: string; description: string; icon: string; color?: string }[] = [
  { value: 'public', label: 'Public', description: 'Everyone can see this post', icon: 'tabler:world' },
  { value: 'verifiedOnly', label: 'Verified', description: 'Verified members only', icon: 'tabler:circle-check-filled', color: 'var(--moh-verified)' },
  { value: 'premiumOnly', label: 'Premium', description: 'Premium members only', icon: 'tabler:rosette-discount-check-filled', color: 'var(--moh-premium)' },
  { value: 'onlyMe', label: 'Only me', description: 'Only visible to you', icon: 'tabler:lock', color: 'var(--moh-onlyme)' },
]
const visibilityOptions = computed(() => choices.filter(option => props.allowed.includes(option.value)))
const chipClass = computed(() => {
  if (props.modelValue || props.visibility === 'verifiedOnly') return 'border-transparent bg-[var(--moh-verified)] text-white'
  if (props.visibility === 'premiumOnly') return 'border-transparent bg-[var(--moh-premium)] text-white'
  if (props.visibility === 'onlyMe') return 'border-transparent bg-[var(--moh-onlyme)] text-white'
  return 'border-black text-black dark:border-white dark:text-white'
})
const visibilityLabel = computed(() => choices.find(option => option.value === props.visibility)?.label ?? 'Public')
function selectVisibility(value: PostVisibility) {
  if (!props.allowed.includes(value) || (value === 'premiumOnly' && !props.isPremium)) return
  emit('select-visibility', value)
  open.value = false
}
</script>

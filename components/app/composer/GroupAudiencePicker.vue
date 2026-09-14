<template>
  <button type="button" class="moh-focus moh-surface-hover inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border moh-border px-3 text-sm" :aria-label="selected ? `Posting to ${selected.name}. Change group` : 'Post to a group'" aria-haspopup="dialog" :aria-expanded="open" @click="open = true">
    <AppGroupsGroupAvatar v-if="selected" :name="selected.name" :src="selected.avatarImageUrl" :size="24" />
    <Icon v-else name="tabler:users-group" class="text-xl" aria-hidden="true" />
    <span class="max-w-48 truncate">{{ selected?.name ?? 'Group' }}</span>
    <Icon name="tabler:chevron-down" class="text-base moh-text-muted" aria-hidden="true" />
  </button>
  <AppComposerSelectionDialog v-model="open" title="Post to a group" description="Visibility is set by the group.">
    <AppComposerSelectionRow label="No group" description="Use your selected feed visibility" icon="tabler:world" :selected="!modelValue" @select="select(null)" />
    <div class="my-3 border-t moh-border" />
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
    <template v-if="showsChat"><div class="my-3 border-t moh-border" /><AppComposerSelectionRow label="Chat" description="Send as a message" icon="tabler:messages" @select="open = false; emit('select-chat')" /></template>
  </AppComposerSelectionDialog>
</template>

<script setup lang="ts">
const props = defineProps<{ groups: readonly { id: string; name: string; avatarImageUrl?: string | null; joinPolicy?: string }[]; modelValue: string | null; loading?: boolean; error?: string | null; showsChat?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [id: string | null]; open: []; 'select-chat': [] }>()
const open = ref(false)
const query = ref('')
const selected = computed(() => props.groups.find(group => group.id === props.modelValue))
const filteredGroups = computed(() => props.groups.filter(group => group.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
watch(open, value => { if (value) { query.value = ''; emit('open') } })
function select(id: string | null) { emit('update:modelValue', id); open.value = false }
</script>

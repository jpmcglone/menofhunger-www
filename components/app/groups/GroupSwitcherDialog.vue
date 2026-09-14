<template>
  <AppComposerSelectionDialog v-model="visible" :title="forPost ? 'Post to a group' : 'Your groups'" :description="forPost ? 'Choose where to start a conversation.' : 'Pick up a conversation or see all group activity.'">
    <InputText v-model="query" class="w-full mb-3" placeholder="Search your groups" aria-label="Search your groups" />
    <div v-if="error" role="alert" class="px-3 py-3"><p class="moh-meta">{{ error }}</p><Button text label="Try again" @click="refresh" /></div>
    <p v-if="loading && !groups.length" class="moh-meta p-3" role="status">Loading your groups…</p>
    <div class="max-h-[45vh] overflow-y-auto">
      <template v-for="group in filteredGroups" :key="group.id">
        <AppComposerSelectionRow v-if="forPost" :label="group.name" :description="group.joinPolicy === 'open' ? 'Verified members can read' : 'Members only'" @select="postTo(group)"><template #icon><AppGroupsGroupAvatar :name="group.name" :src="group.avatarImageUrl" /></template></AppComposerSelectionRow>
        <AppGroupsGroupRow v-else :group="group" :new-count="groupsUnread.byGroupId[group.id] ?? 0" :selected="currentGroupId === group.id" @navigate="visible = false" />
      </template>
      <p v-if="!loading && !error && !filteredGroups.length" class="moh-meta p-3">{{ query ? 'No groups match your search.' : 'You haven’t joined any groups yet.' }}</p>
    </div>
    <div class="moh-divide mt-3 border-t moh-border">
      <NuxtLink to="/groups" class="moh-focus flex min-h-11 items-center gap-3 px-3 text-sm" @click="visible = false"><Icon name="tabler:users-group" />All group activity</NuxtLink>
      <NuxtLink to="/groups/explore" class="moh-focus flex min-h-11 items-center gap-3 px-3 text-sm" @click="visible = false"><Icon name="tabler:search" />Explore groups</NuxtLink>
      <NuxtLink :to="canCreate ? '/groups/new' : '/tiers'" class="moh-focus flex min-h-11 items-center gap-3 px-3 text-sm" @click="visible = false"><Icon name="tabler:plus" />{{ canCreate ? 'Create group' : 'Upgrade to create a group' }}</NuxtLink>
    </div>
  </AppComposerSelectionDialog>
</template>
<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'
defineProps<{ currentGroupId?: string; forPost?: boolean }>()
const visible = defineModel<boolean>({ required: true })
const { groups, loading, error, load } = useMyGroups()
const { groupsUnread } = usePresence()
const { user } = useAuth()
const openComposer = inject(MOH_OPEN_COMPOSER_KEY, undefined)
const query = ref('')
const canCreate = computed(() => Boolean(user.value?.premium || user.value?.premiumPlus || user.value?.siteAdmin))
const filteredGroups = computed(() => groups.value.filter(group => group.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
async function refresh() { await load({ force: true }).catch(() => undefined) }
watch(visible, value => { if (value) { query.value = ''; void refresh() } })
function postTo(group: CommunityGroupShell) { visible.value = false; openComposer?.({ communityGroupId: group.id }) }
</script>

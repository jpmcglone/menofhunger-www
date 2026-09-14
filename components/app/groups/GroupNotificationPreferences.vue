<template>
  <AppComposerSelectionDialog v-model="visible" title="Notifications" :description="group.name" :busy="saving">
    <p v-if="loading" role="status" class="p-3 moh-meta">Loading preferences…</p>
    <AppInlineAlert v-if="error" severity="danger" class="mx-3 mb-3">{{ error }}<Button v-if="!loaded" label="Try again" text @click="load" /></AppInlineAlert>
    <template v-if="loaded">
      <AppComposerSelectionRow v-for="option in options" :key="option.value" :label="option.label" :description="option.description" :icon="option.icon" :selected="selected === option.value" :locked="saving" @select="selected = option.value" />
      <p class="px-3 pt-4 moh-meta">Posts from this group will still appear in your Groups feed. Membership and moderation updates are always available.</p>
    </template>
    <template #footer>
      <Button label="Cancel" text severity="secondary" :disabled="saving" @click="visible = false" />
      <Button label="Save preferences" :disabled="!loaded || loading" :loading="saving" @click="save" />
    </template>
  </AppComposerSelectionDialog>
</template>
<script setup lang="ts">
import type { CommunityGroupShell, GroupNotificationPreferences } from '~/types/api'
const props = defineProps<{ group: CommunityGroupShell }>()
const visible = defineModel<boolean>({ required: true })
const { apiFetchData } = useApiClient()
const selected = ref<GroupNotificationPreferences['preference']>('all')
const loading = ref(false)
const saving = ref(false)
const loaded = ref(false)
const error = ref<string | null>(null)
const options: { value: GroupNotificationPreferences['preference']; label: string; description: string; icon: string }[] = [
  { value: 'all', label: 'All activity', description: 'New posts, replies and mentions', icon: 'tabler:bell' },
  { value: 'repliesAndMentions', label: 'Replies and mentions', description: 'Conversations involving you', icon: 'tabler:message-circle' },
  { value: 'muted', label: 'Muted', description: 'No notifications for group conversations', icon: 'tabler:bell-off' },
]
// Modal-owned form: fetch on every open; do not overwrite unsaved choices with socket echoes.
async function load() {
  const groupId = props.group.id
  loading.value = true; loaded.value = false; error.value = null
  try {
    const value = await apiFetchData<GroupNotificationPreferences>(`/groups/${encodeURIComponent(groupId)}/notification-preferences`)
    if (props.group.id !== groupId) return
    selected.value = value.preference; loaded.value = true
  } catch (cause) { error.value = getApiErrorMessage(cause) || 'Couldn’t load notification preferences.' }
  finally { loading.value = false }
}
async function save() {
  if (saving.value || !loaded.value) return
  saving.value = true; error.value = null
  try {
    await apiFetchData<GroupNotificationPreferences>(`/groups/${encodeURIComponent(props.group.id)}/notification-preferences`, { method: 'PATCH', body: { preference: selected.value } })
    visible.value = false
  } catch (cause) { error.value = getApiErrorMessage(cause) || 'Couldn’t save preferences. Your selection is still here. Try again.' }
  finally { saving.value = false }
}
watch(visible, value => { if (value) void load() })
</script>

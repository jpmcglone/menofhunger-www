<template>
  <AppComposerSelectionDialog v-model="visible" title="Notifications" :description="`${person.name || person.username} · @${person.username}`" :busy="saving">
    <template #header>
      <div class="flex min-w-0 items-center gap-3">
        <AppUserAvatar :user="person" size-class="h-10 w-10" />
        <h2 class="text-xl font-semibold">Notifications</h2>
      </div>
    </template>
    <p v-if="loading" role="status" class="px-3 pb-3 moh-meta">Loading preferences…</p>
    <AppInlineAlert v-if="error" severity="danger" class="mx-3 mb-3">
      {{ error }} <Button v-if="!loaded" label="Try again" text @click="load" />
    </AppInlineAlert>
    <template v-if="loaded">
      <p class="px-3 pb-3 moh-meta">Choose what you’re notified about.</p>
      <div role="group" aria-label="Notification preference" class="space-y-3">
        <AppComposerSelectionRow v-for="option in userNotificationOptions" :key="option.value" :label="option.label" :description="option.description" :icon="option.icon" :selected="selected === option.value" :locked="saving" @select="selected = option.value" />
      </div>
      <p class="mx-3 mt-4 border-t moh-border pt-4 moh-meta">Their posts stay in your feed. Replies to you, mentions and messages follow your other notification settings.</p>
    </template>
    <template #footer>
      <Button label="Cancel" text severity="secondary" :disabled="saving" @click="visible = false" />
      <AppActionButton label="Save preferences" :disabled="!loaded || loading || saving" @click="save" />
    </template>
  </AppComposerSelectionDialog>
</template>
<script setup lang="ts">
import type { FollowRelationship, UserNotificationPreference } from '~/types/api'
import { userNotificationOptions, userNotificationPreference } from '~/utils/user-notification-preference'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const props = defineProps<{ person: { id: string; username: string; name?: string | null; avatarUrl?: string | null; isOrganization?: boolean } }>()
const visible = defineModel<boolean>({ required: true })
const { apiFetchData } = useApiClient()
const followState = useFollowState()
const toast = useAppToast()
const { user: viewer } = useAuth()
const selected = ref<UserNotificationPreference>('posts')
const loaded = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
let generation = 0
async function load() {
  const viewerId = viewer.value?.id
  const request = ++generation
  loading.value = true; loaded.value = false; error.value = null
  try {
    const relationship = await apiFetchData<FollowRelationship>(`/follows/status/${encodeURIComponent(props.person.username)}`)
    if (request !== generation || !visible.value || viewer.value?.id !== viewerId) return
    followState.set(props.person.id, relationship)
    if (!relationship.viewerFollowsUser) { visible.value = false; return }
    selected.value = userNotificationPreference(relationship)
    loaded.value = true
  } catch (cause) {
    if (request === generation) error.value = getSafeUserErrorMessage(cause, 'Couldn’t load notification preferences.')
  } finally { if (request === generation) loading.value = false }
}
async function save() {
  if (saving.value || !loaded.value) return
  const request = generation
  saving.value = true; error.value = null
  try {
    const result = await followState.setNotificationPreference({ userId: props.person.id, username: props.person.username, preference: selected.value })
    if (!result || request !== generation) return
    toast.push({ title: 'Notification preferences saved', tone: 'success' })
    visible.value = false
  } catch (cause) {
    if (request === generation) error.value = getSafeUserErrorMessage(cause, 'Couldn’t save preferences. Your selection is still here. Try again.')
  } finally { saving.value = false }
}
watch(visible, open => { if (open) void load(); else generation++ }, { immediate: true })
onBeforeUnmount(() => { generation++ })
</script>

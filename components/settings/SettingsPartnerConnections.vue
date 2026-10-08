<template>
  <section class="space-y-3 border-t moh-border pt-6">
    <h2 class="text-sm font-semibold moh-text">Connected apps</h2>
    <p class="text-sm moh-text-muted">Apps can read the information you allow. They cannot publish to Men of Hunger.</p>
    <p v-if="user?.username" class="text-sm moh-text-muted">Connected as @{{ user.username }}</p>
    <p v-if="loading" class="text-sm moh-text-muted">Loading…</p>
    <p v-else-if="!connections.length && !error" class="text-sm moh-text-muted">No connected apps</p>
    <div v-for="connection in connections" :key="connection.id" class="flex items-center justify-between gap-3 border-b moh-border py-3">
      <div class="min-w-0">
        <p class="font-medium moh-text">{{ connection.clientName }}</p>
        <p class="text-xs moh-text-muted">{{ connectionLabel(connection) }}</p>
        <p v-if="connection.status === 'needs_reauthorization'" class="text-xs moh-text-muted">A current page operator must reconnect this app.</p>
      </div>
      <Button label="Revoke access" severity="secondary" size="small" :disabled="Boolean(working)" @click="revoke(connection.id)" />
    </div>
    <h2 class="pt-4 text-sm font-semibold moh-text">Sharing activity</h2>
    <p v-if="!deliveries.length && !loading" class="text-sm moh-text-muted">No outward deliveries yet</p>
    <div v-for="delivery in deliveries" :key="delivery.id" class="space-y-1 border-b moh-border py-3">
      <p class="text-sm font-medium moh-text">{{ delivery.platform === 'x' ? 'X' : 'Pickax' }} · {{ deliveryLabel(delivery) }}</p>
      <p v-if="delivery.lastError" class="text-sm moh-text-muted">{{ delivery.lastError }}</p>
      <a v-if="delivery.remoteUrl" :href="delivery.remoteUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center text-sm underline">View remote copy</a>
    </div>
    <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>
    <Button v-if="error" label="Try again" severity="secondary" @click="refresh" />
  </section>
</template>

<script setup lang="ts">
import { formatLocaleDate } from '~/utils/time-format'
import type { PartnerConnection } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const connections = ref<PartnerConnection[]>([])
function connectionLabel(connection: PartnerConnection) {
  if (connection.status === 'needs_reauthorization') return 'Read access paused · Reconnect required'
  if (connection.status === 'suspended') return 'Read access suspended'
  if (connection.status === 'expired') return 'Read access expired · Reconnect required'
  return `Read access · Expires ${formatLocaleDate(new Date(connection.expiresAt))}`
}
type Delivery = { id: string; platform: string; status: string; action: string; lastError: string | null; remoteUrl: string | null }
const deliveries = ref<Delivery[]>([])
function deliveryLabel(row: Delivery) {
  if (row.action === 'remove' && !['removed', 'cancelled'].includes(row.status)) return 'Removal needs attention'
  return ({ pending: 'Waiting to share', sending: 'Sharing…', sent: 'Shared', removed: 'Remote copy removed', cancelled: 'Sharing stopped', needs_attention: 'Needs attention' } as Record<string, string>)[row.status] ?? 'Needs attention'
}
const loading = ref(true)
const working = ref<string | null>(null)
const error = ref('')
let generation = 0
async function refresh() {
  const current = ++generation
  loading.value = true
  try {
    const [rows, activity] = await Promise.all([apiFetchData<PartnerConnection[]>('/me/connections'), apiFetchData<Delivery[]>('/me/connections/deliveries')])
    if (current !== generation) return
    connections.value = rows
    deliveries.value = activity
    error.value = ''
  } catch (e) {
    if (current === generation) error.value = getApiErrorMessage(e) || 'Connected apps could not be loaded.'
  } finally { if (current === generation) loading.value = false }
}
async function revoke(id: string) {
  working.value = id
  try {
    await apiFetchData(`/me/connections/${encodeURIComponent(id)}`, { method: 'DELETE' })
    connections.value = connections.value.filter(c => c.id !== id)
  } catch (e) { error.value = getApiErrorMessage(e) || 'Access could not be revoked. Try again.' }
  finally { working.value = null }
}
watch(() => user.value?.id, () => { connections.value = []; deliveries.value = []; void refresh() })
onMounted(refresh)
onActivated(refresh)
onBeforeUnmount(() => { generation++ })
</script>

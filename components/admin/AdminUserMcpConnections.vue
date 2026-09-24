<template>
  <div class="px-4">
    <div class="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">AI connections</div>
        <div v-if="state?.usage" class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {{ state.usage.used.toLocaleString() }} of {{ state.usage.limit.toLocaleString() }} member calls today
        </div>
      </div>
      <div v-if="loading && !state" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      <AppInlineAlert v-else-if="error" severity="danger" class="text-xs">{{ error }}</AppInlineAlert>
      <div v-else-if="!state?.connections.length" class="text-sm text-gray-500 dark:text-gray-400">
        No AI apps connected.
      </div>
      <AppMcpConnectionList
        v-else
        :connections="state.connections"
        :revoking-id="revokingId"
        action-label="Revoke"
        show-audience
        @revoke="revoke"
      />
      <p class="text-xs text-gray-400 dark:text-gray-500">
        Revoking ends the app’s access and its session immediately. The member can reconnect if they remain eligible.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminMcpConnectionsDto, McpConnectionItemDto } from '~/types/api-contracts.gen'

const props = defineProps<{ userId: string }>()

const { apiFetchData } = useApiClient()

const state = ref<AdminMcpConnectionsDto | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const revokingId = ref<string | null>(null)

const base = computed(() => `/admin/users/${encodeURIComponent(props.userId)}/mcp-connections`)

// Connections change only when an outside AI client connects, so fetching when the
// page opens is enough; this admin card does not subscribe to a socket.
async function load() {
  loading.value = true
  error.value = null
  try {
    state.value = await apiFetchData<AdminMcpConnectionsDto>(base.value)
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load AI connections.'
  } finally {
    loading.value = false
  }
}

async function revoke(item: McpConnectionItemDto) {
  if (revokingId.value) return
  if (!window.confirm(`Revoke ${item.clientName}? It will lose access immediately.`)) return
  revokingId.value = item.id
  error.value = null
  try {
    await apiFetchData(`${base.value}/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
    if (state.value) {
      state.value = { ...state.value, connections: state.value.connections.filter((c) => c.id !== item.id) }
    }
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to revoke the connection.'
    await load()
  } finally {
    revokingId.value = null
  }
}

watch(() => props.userId, () => { state.value = null; void load() })
onMounted(load)
</script>

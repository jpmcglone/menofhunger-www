<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
        <AppIconGlyph name="link" :size="20" class="text-[var(--moh-text-muted)]" />
        Connect your AI
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Let ChatGPT, Claude, or Cursor read the lodge as you see it: the feed, threads, profiles,
        articles, your bookmarks, and your notifications. Ask it to catch you up, then show up yourself.
      </p>
    </div>

    <div v-if="loading && !connection" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>

    <p v-else-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

    <p v-else-if="delegated" class="text-sm text-gray-600 dark:text-gray-300">
      AI connections belong to the account owner. They can’t be viewed or changed while acting as this account.
    </p>

    <div
      v-else-if="connection && !connection.audience"
      class="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <p class="font-semibold moh-text">Connecting your AI is a Premium benefit.</p>
      <p class="mt-1 text-gray-700 dark:text-gray-300">
        Premium and Premium+ members can give their AI read-only access to Men of Hunger.
      </p>
      <Button as="NuxtLink" to="/tiers" label="See plans" size="small" class="mt-3" />
    </div>

    <template v-else-if="connection">
      <section class="space-y-2">
        <div class="text-sm font-semibold moh-text">Connection URL</div>
        <div class="flex items-center gap-2">
          <InputText
            :model-value="connection.url"
            readonly
            aria-label="Men of Hunger MCP URL"
            class="h-11 min-w-0 flex-1 font-mono text-sm"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <Button :label="copied ? 'Copied' : 'Copy'" severity="secondary" class="h-11 shrink-0" @click="copyUrl" />
        </div>
      </section>

      <section class="space-y-2">
        <div class="text-sm font-semibold moh-text">How to connect</div>
        <ol class="list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>In ChatGPT, Claude, or Cursor, add a custom connector (an MCP server) and paste the URL above.</li>
          <li>When it asks, sign in to Men of Hunger and choose <span class="font-semibold">Allow read-only access</span>.</li>
          <li>Ask something like “Catch me up on the lodge this week.”</li>
        </ol>
      </section>

      <section class="space-y-2">
        <div class="text-sm font-semibold moh-text">What it can and can’t do</div>
        <ul class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <li v-if="connection.audience === 'member'">
            It reads only. It cannot post, reply, react, follow, bookmark, or message for you.
          </li>
          <li v-else>
            Your administrator connection includes company tools and delegated actions.
          </li>
          <li>Direct messages and group conversations are never shared.</li>
          <li>Reading never marks your notifications seen or read.</li>
          <li>Disconnect below at any time, or remove Men of Hunger from your AI app’s connector settings.</li>
        </ul>
      </section>

      <section v-if="connection.usage" class="space-y-2">
        <div class="text-sm font-semibold moh-text">Today’s requests</div>
        <div class="flex items-center justify-between rounded-xl border moh-border px-4 py-3">
          <div>
            <div class="text-2xl font-bold tabular-nums">{{ connection.usage.remaining.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              of {{ connection.usage.limit.toLocaleString() }} left today
            </div>
          </div>
          <div class="text-right text-xs text-gray-500 dark:text-gray-400">Resets at midnight UTC</div>
        </div>
      </section>
    </template>

    <section v-if="!delegated && connection?.connections.length" class="space-y-2">
      <div class="text-sm font-semibold moh-text">Connected AI apps</div>
      <AppMcpConnectionList
        :connections="connection.connections"
        :revoking-id="revokingId"
        @revoke="disconnect"
      />
      <p v-if="revokeError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ revokeError }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { McpConnectionDto, McpConnectionItemDto } from '~/types/api-contracts.gen'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

const { apiFetch } = useApiClient()
const { copyText } = useCopyToClipboard()
const { user } = useAuth()
const delegated = computed(() => Boolean(user.value?.impersonation || user.value?.accountSwitch))

const connection = ref<McpConnectionDto | null>(null)
const loading = ref(false)
const error = ref('')
const copied = ref(false)
const revokingId = ref<string | null>(null)
const revokeError = ref('')

// Usage and connections only change when an outside AI client calls the connector,
// so a fetch on mount/activation is enough; a live socket here is not worth its cost.
async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await apiFetch<McpConnectionDto>('/mcp/connection', { method: 'GET' })
    connection.value = res?.data ?? null
  } catch {
    error.value = 'Connection details could not be loaded. Please try again.'
  } finally {
    loading.value = false
  }
}

async function disconnect(item: McpConnectionItemDto) {
  if (revokingId.value) return
  if (!window.confirm(`Disconnect ${item.clientName}? It will lose access immediately.`)) return
  revokingId.value = item.id
  revokeError.value = ''
  try {
    await apiFetch(`/mcp/connections/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
    if (connection.value) {
      connection.value = {
        ...connection.value,
        connections: connection.value.connections.filter((c) => c.id !== item.id),
      }
    }
  } catch {
    revokeError.value = 'That connection could not be removed. Please try again.'
    await load()
  } finally {
    revokingId.value = null
  }
}

async function copyUrl() {
  if (!connection.value) return
  await copyText(connection.value.url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1600)
}

onMounted(load)
onActivated(load)
</script>

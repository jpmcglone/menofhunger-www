<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
        <AppIconGlyph name="link" :size="20" class="text-[var(--moh-text-muted)]" />
        Pickax
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Create here, then choose what to share to Pickax. Connecting never turns sharing on.
        Verification is required to share. Removals need attention until Pickax confirms them.
      </p>
    </div>

    <div v-if="!status" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>

    <p v-else-if="!status.available" class="text-sm text-gray-600 dark:text-gray-300">
      Pickax connections are not available right now.
    </p>

    <section v-else-if="status.connected" class="space-y-3">
      <div class="flex items-center justify-between gap-3 rounded-xl border moh-border px-4 py-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold moh-text truncate">@{{ status.username }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">Verified Pickax account</div>
        </div>
        <Button
          label="Reconnect"
          severity="secondary"
          size="small"
          class="shrink-0"
          :loading="busy"
          @click="onReconnect"
        />
      </div>
      <p
        v-if="status.needsAttention"
        role="alert"
        class="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        {{ status.lastError || 'Reconnect Pickax before sharing new content.' }}
      </p>
      <p
        v-else-if="status.lastError"
        role="alert"
        class="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        Pickax rejected the last cross-post: {{ status.lastError }}
      </p>
      <p class="text-sm moh-text-muted">Reconnect uses your saved Client ID and secret.</p>
      <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>
      <Button label="Disconnect" severity="secondary" text :disabled="busy" @click="onDisconnect" />
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Your Pickax profile link on Men of Hunger comes from this connection. Disconnecting stops future
        cross-posts and updates and keeps what is already on Pickax.
      </p>
    </section>

    <section v-else-if="status.oauthAvailable" class="space-y-3">
      <NuxtLink to="/connect/pickax" class="inline-flex min-h-11 items-center font-semibold underline">Connect Pickax</NuxtLink>
      <p class="text-sm moh-text-muted">You will authorize on Pickax. Your password stays there.</p>
    </section>
    <form v-else class="space-y-4" @submit.prevent="onConnect">
      <ol class="list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
        <li>In Pickax, create an API key for a third-party app.</li>
        <li>Paste its Client ID and Client Secret below.</li>
        <li>We check the key and confirm it belongs to your Pickax account before connecting.</li>
      </ol>

      <AppFormField label="Client ID">
        <InputText v-model="clientId" class="w-full" :maxlength="200" autocomplete="off" />
      </AppFormField>
      <AppFormField label="Client secret">
        <InputText v-model="clientSecret" class="w-full" type="password" :maxlength="500" autocomplete="off" />
      </AppFormField>
      <AppFormField v-if="needsUsername" label="Pickax username">
        <InputText v-model="username" class="w-full" :maxlength="200" placeholder="@yourhandle" autocomplete="off" />
        <template #helper>
          Your key does not name your account, so enter your Pickax username and we will confirm it is yours.
        </template>
      </AppFormField>
      <div v-if="verificationCode" class="space-y-2 rounded-xl border moh-border p-3 text-sm">
        <p class="text-gray-700 dark:text-gray-300">
          To prove this account is yours, paste this code anywhere in your Pickax bio, save it, then press Verify.
          You can remove it afterward.
        </p>
        <code class="block select-all rounded-lg bg-gray-100 px-3 py-2 font-mono text-sm dark:bg-white/10">{{ verificationCode }}</code>
      </div>

      <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>

      <Button
        type="submit"
        :label="verificationCode ? 'Verify and connect' : 'Connect Pickax'"
        :loading="busy"
        :disabled="!clientId.trim() || !clientSecret.trim() || (needsUsername && !username.trim())"
      />
    </form>

    <section class="space-y-3 border-t moh-border pt-6">
      <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
        <Icon name="tabler:brand-x" class="h-5 w-5 text-[var(--moh-text-muted)]" />
        X
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Connecting is free. Choose X for each public post. Available formats depend on your connection. Premium+ links use the shared high-cost allowance when enabled.
      </p>
      <div v-if="!xStatus" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      <p v-else-if="!xStatus.available" class="text-sm text-gray-600 dark:text-gray-300">
        X connections are not available right now.
      </p>
      <div v-else-if="xStatus.connected" class="space-y-3">
        <div class="flex items-center justify-between gap-3 rounded-xl border moh-border px-4 py-3">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold moh-text">@{{ xStatus.username }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ xStatus.canPost ? `${xStatus.allowance.totalRemaining ?? xStatus.allowance.nativePostsLeft} posts left this month` : 'Verify your MOH account to post to X' }}
            </div>
          </div>
          <Button label="Disconnect" severity="secondary" size="small" class="shrink-0" :loading="xBusy" @click="onDisconnectX" />
        </div>
        <div v-if="xStatus.integrationAllowance" class="space-y-2 text-sm moh-text">
          <p>Regular actions: {{ (xStatus.integrationAllowance.regular.remainingMicros / 1000000).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }} remaining</p>
          <p v-if="xStatus.integrationAllowance.expensive.limitMicros">High-cost actions: {{ (xStatus.integrationAllowance.expensive.remainingMicros / 1000000).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }} remaining</p>
          <p class="text-xs moh-text-muted">Shared across connected platforms. Pending requests count toward your allowance.</p>
        </div>
        <p v-if="xStatus.allowance.resetsAt" class="text-xs moh-text-muted">
          Resets {{ new Date(xStatus.allowance.resetsAt).toLocaleString() }}
        </p>
        <Button label="Reconnect X" severity="secondary" :loading="xBusy" @click="onConnectX" />
        <p v-if="xStatus.needsAttention" role="alert" class="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          X needs to be connected again before new posts can be shared.
        </p>
        <NuxtLink v-if="!xStatus.canPost" to="/settings/verification" class="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2">
          Verify your account
        </NuxtLink>
      </div>
      <div v-else class="space-y-3">
        <Button label="Connect X" :loading="xBusy" @click="onConnectX" />
        <AppInlineAlert v-if="xError" severity="danger">{{ xError }}</AppInlineAlert>
      </div>
    </section>
    <SettingsPartnerConnections />
  </div>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

const { status, refresh, connect, reconnect, disconnect } = usePickaxIntegration()
const { status: xStatus, refresh: refreshX, authorize, connect: connectX, disconnect: disconnectX } = useXIntegration()
const route = useRoute()
const toast = useAppToast()

const clientId = ref('')
const clientSecret = ref('')
const username = ref('')
const needsUsername = ref(false)
const verificationCode = ref<string | null>(null)
const busy = ref(false)
const error = ref('')
const xBusy = ref(false)
const xError = ref('')

async function onReconnect() {
  if (busy.value) return
  if (status.value?.oauthAvailable) {
    await navigateTo('/connect/pickax')
    return
  }
  busy.value = true
  error.value = ''
  try {
    await reconnect()
    toast.push({ title: 'Pickax reconnected.', tone: 'success' })
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Pickax could not be reconnected. Try again.'
  } finally {
    busy.value = false
  }
}

async function onConnect() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await connect({
      clientId: clientId.value.trim(),
      clientSecret: clientSecret.value.trim(),
      ...(needsUsername.value ? { username: username.value.trim() } : {}),
    })
    needsUsername.value = result.needsUsername
    verificationCode.value = result.verificationCode
    if (result.connected && !result.needsAttention && !result.needsUsername) {
      clientId.value = ''
      clientSecret.value = ''
      username.value = ''
    }
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Pickax could not be connected. Check the key and try again.'
  } finally {
    busy.value = false
  }
}

async function onDisconnect() {
  if (busy.value) return
  if (!window.confirm('Disconnect Pickax? Future sharing stops. Copies already on Pickax remain.')) return
  busy.value = true
  error.value = ''
  try {
    await disconnect()
    needsUsername.value = false
    verificationCode.value = null
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Pickax could not be disconnected. Please try again.'
  } finally {
    busy.value = false
  }
}

async function onConnectX() {
  if (xBusy.value) return
  xBusy.value = true
  xError.value = ''
  try {
    window.location.href = await authorize()
  } catch (e) {
    xError.value = getApiErrorMessage(e) || 'Could not start the X connection.'
    xBusy.value = false
  }
}

async function onDisconnectX() {
  if (xBusy.value) return
  if (!window.confirm('Disconnect X? Future sharing stops. Copies already on X remain.')) return
  xBusy.value = true
  xError.value = ''
  try {
    await disconnectX()
  } catch (e) {
    xError.value = getApiErrorMessage(e) || 'X could not be disconnected. Please try again.'
  } finally {
    xBusy.value = false
  }
}

async function finishXCallback() {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  if (!code || !state) return
  // Drop the code from the address bar before exchanging it, so a refresh cannot replay it.
  await navigateTo('/settings/integrations', { replace: true })
  xBusy.value = true
  try {
    await connectX({ code, state })
    toast.push({ title: 'X connected.', tone: 'success' })
  } catch (e) {
    xError.value = getApiErrorMessage(e) || 'X could not be connected. Try again.'
  } finally {
    xBusy.value = false
  }
}

onMounted(() => {
  void refresh()
  void refreshX()
  void finishXCallback()
})
onActivated(() => {
  void refresh()
  void refreshX()
})
</script>

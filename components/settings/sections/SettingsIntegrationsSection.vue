<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
        <AppIconGlyph name="link" :size="20" class="text-[var(--moh-text-muted)]" />
        Pickax
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Cross-post new public feed posts and articles to your Pickax account. Posts you edit here update on
        Pickax. Deleting on Men of Hunger leaves the Pickax copy in place.
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
          label="Disconnect"
          severity="secondary"
          size="small"
          class="shrink-0"
          :loading="busy"
          @click="onDisconnect"
        />
      </div>
      <p
        v-if="status.needsAttention"
        role="alert"
        class="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        Pickax stopped accepting this key, so cross-posting is paused. Disconnect and connect again with a new key.
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Your Pickax profile link on Men of Hunger comes from this connection. Disconnecting stops future
        cross-posts and updates and keeps what is already on Pickax.
      </p>
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
  </div>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

const { status, refresh, connect, disconnect } = usePickaxIntegration()

const clientId = ref('')
const clientSecret = ref('')
const username = ref('')
const needsUsername = ref(false)
const verificationCode = ref<string | null>(null)
const busy = ref(false)
const error = ref('')

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
    if (result.connected) {
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
  if (!window.confirm('Disconnect Pickax? New posts and edits will no longer be cross-posted.')) return
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

onMounted(refresh)
onActivated(refresh)
</script>

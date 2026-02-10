<script setup lang="ts">
defineProps<{
  pushVapidConfigured: boolean
  pushIsSupported: boolean
  pushRequiresInstall: boolean
  pushInitialStateChecked: boolean
  pushIsSubscribed: boolean
  pushPermission: string | null
  pushIsRegistering: boolean
  pushSubscribe: () => void
  pushUnsubscribe: () => void
  pushTestSending: boolean
  sendPushTest: () => void
  pushErrorMessage: string | null
  pushTestMessage: string | null
}>()
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Browser notifications</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Get notified when you're not on the site (e.g. tab closed or in the background).
      </div>
    </div>

    <div v-if="!pushVapidConfigured" class="space-y-2">
      <p class="text-sm text-amber-700 dark:text-amber-300">
        Push notifications are not configured. To enable them (e.g. on localhost), add the same VAPID public key used by the API to the www app.
      </p>
      <p class="text-xs text-gray-600 dark:text-gray-400">
        In <code class="rounded bg-gray-200 px-1 dark:bg-gray-700">menofhunger-www/.env</code> set <code class="rounded bg-gray-200 px-1 dark:bg-gray-700">NUXT_PUBLIC_VAPID_PUBLIC_KEY</code> to the value of <code class="rounded bg-gray-200 px-1 dark:bg-gray-700">VAPID_PUBLIC_KEY</code> from <code class="rounded bg-gray-200 px-1 dark:bg-gray-700">menofhunger-api/.env</code>, then restart the dev server.
      </p>
    </div>
    <div v-else-if="!pushIsSupported" class="text-sm text-gray-600 dark:text-gray-400">
      Push notifications are not supported in this browser.
    </div>
    <div v-else class="flex flex-col items-start gap-3">
      <div v-if="pushRequiresInstall" class="text-sm text-gray-600 dark:text-gray-400">
        On iOS Safari, install this site to your Home Screen to enable notifications. Tap Share → Add to Home Screen, then reopen the app.
      </div>
      <div v-if="pushInitialStateChecked" class="flex flex-wrap items-center gap-3">
        <Button
          v-if="!pushIsSubscribed && pushPermission !== 'denied'"
          label="Enable browser notifications"
          :loading="pushIsRegistering"
          :disabled="pushIsRegistering || pushRequiresInstall"
          @click="pushSubscribe"
        >
          <template #icon>
            <Icon name="tabler:bell" aria-hidden="true" />
          </template>
        </Button>
        <Button
          v-else-if="pushIsSubscribed"
          label="Disable browser notifications"
          severity="secondary"
          @click="pushUnsubscribe"
        >
          <template #icon>
            <Icon name="tabler:bell-off" aria-hidden="true" />
          </template>
        </Button>
        <Button
          v-if="pushIsSubscribed"
          label="Send test notification"
          severity="secondary"
          :loading="pushTestSending"
          :disabled="pushTestSending"
          @click="sendPushTest"
        >
          <template #icon>
            <Icon name="tabler:send" aria-hidden="true" />
          </template>
        </Button>
        <span v-else-if="pushPermission === 'denied'" class="text-sm text-gray-600 dark:text-gray-400">
          Notifications were denied. Enable them in your browser settings for this site to try again.
        </span>
        <span v-if="pushErrorMessage" class="text-sm text-red-700 dark:text-red-300">
          {{ pushErrorMessage }}
        </span>
        <span v-if="pushTestMessage" class="text-sm text-gray-600 dark:text-gray-400">
          {{ pushTestMessage }}
        </span>
      </div>
      <div v-else class="text-sm text-gray-600 dark:text-gray-400">
        Checking notification settings…
      </div>
    </div>
  </div>
</template>


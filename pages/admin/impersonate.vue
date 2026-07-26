<template>
  <AppPageContent bottom="standard">
    <AppPageHeader
      sticky
      class="px-4 pt-4 pb-3"
      title="Log in as user"
      description="Sign in as another member to see exactly what they see."
    >
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
    </AppPageHeader>

    <div class="px-4 py-4 space-y-5">
      <!-- Already impersonating: offer the exit instead of a second hop. -->
      <div
        v-if="isImpersonating"
        class="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        <div class="flex items-start gap-3">
          <Icon
            name="tabler:eye"
            class="mt-0.5 shrink-0 text-lg text-amber-700 dark:text-amber-300"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              You are already signed in as @{{ user?.username }}
            </div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Exit first, then you can sign in as someone else.
            </p>
            <Button
              class="mt-3 rounded-full"
              severity="secondary"
              :loading="exiting"
              label="Return to my admin account"
              @click="onExit"
            />
          </div>
        </div>
      </div>

      <template v-else>
        <div class="rounded-xl border moh-border p-4 space-y-3">
          <label
            for="impersonate-username"
            class="block text-sm font-semibold text-gray-900 dark:text-gray-50"
          >
            Username
          </label>
          <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="onSubmit">
            <IconField iconPosition="left" class="flex-1">
              <InputIcon>
                <span class="text-sm font-semibold moh-text-muted">@</span>
              </InputIcon>
              <InputText
                id="impersonate-username"
                v-model="username"
                class="w-full"
                placeholder="username"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                :disabled="submitting"
              />
            </IconField>
            <Button
              type="submit"
              class="rounded-full sm:w-auto"
              :loading="submitting"
              :disabled="!username.trim()"
              label="Log in as user"
            />
          </form>

          <AppInlineAlert v-if="errorMessage" severity="danger">
            {{ errorMessage }}
          </AppInlineAlert>

          <p class="text-xs moh-text-muted">
            Your admin session is kept. You can return to your own account at any time from the
            banner at the top of the screen.
          </p>
        </div>

        <div class="rounded-xl border moh-border p-4">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">What to expect</div>
          <ul class="mt-2 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <li class="flex gap-2">
              <Icon name="tabler:check" class="mt-0.5 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
              <span>No login code is required — you are signed in immediately.</span>
            </li>
            <li class="flex gap-2">
              <Icon name="tabler:check" class="mt-0.5 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
              <span>Admin pages are hidden while you are signed in as someone else.</span>
            </li>
            <li class="flex gap-2">
              <Icon name="tabler:check" class="mt-0.5 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
              <span>Deleting the account and signing it out everywhere are blocked.</span>
            </li>
            <li class="flex gap-2">
              <Icon name="tabler:alert-triangle" class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>Anything else you do is recorded as that user. Every session is audit-logged.</span>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { getSafeUserErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Log in as user',
  middleware: 'admin',
  ssr: false,
})

usePageSeo({
  title: 'Log in as user',
  description: 'Admin tool to sign in as another member.',
  canonicalPath: '/admin/impersonate',
  noindex: true,
})

const { user, isImpersonating, startImpersonation, stopImpersonation } = useAuth()
const { push: pushToast } = useAppToast()

const username = ref('')
const submitting = ref(false)
const exiting = ref(false)
const errorMessage = ref<string | null>(null)

async function onSubmit() {
  const cleaned = username.value.trim().replace(/^@/, '')
  if (!cleaned || submitting.value) return

  submitting.value = true
  errorMessage.value = null
  try {
    const target = await startImpersonation(cleaned)
    pushToast({ title: `Signed in as @${target?.username ?? cleaned}`, tone: 'success' })
    await navigateTo('/home', { replace: true })
  } catch (e) {
    errorMessage.value = getSafeUserErrorMessage(e, 'Could not sign in as that user.')
  } finally {
    submitting.value = false
  }
}

async function onExit() {
  if (exiting.value) return
  exiting.value = true
  try {
    await stopImpersonation()
    pushToast({ title: 'Back to your admin account', tone: 'success' })
    await navigateTo('/admin', { replace: true })
  } catch (e) {
    errorMessage.value = getSafeUserErrorMessage(e, 'Could not exit impersonation.')
  } finally {
    exiting.value = false
  }
}
</script>

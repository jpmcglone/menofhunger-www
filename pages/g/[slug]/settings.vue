<template>
  <AppPageContent bottom="standard">
    <div class="w-full max-w-lg mx-auto px-3 py-4 sm:px-4 space-y-6">
      <div class="flex items-center gap-2">
        <NuxtLink
          :to="`/g/${encodeURIComponent(slug)}`"
          class="moh-tap flex h-9 w-9 items-center justify-center rounded-full moh-surface-hover"
          aria-label="Back to group"
        >
          <Icon name="tabler:chevron-left" class="text-lg" aria-hidden="true" />
        </NuxtLink>
        <h1 class="text-lg font-bold moh-text truncate">
          Group settings
        </h1>
      </div>

      <AppInlineAlert v-if="loadError" severity="danger">
        {{ loadError }}
      </AppInlineAlert>

      <div v-if="shellLoading" class="flex justify-center py-12">
        <AppLogoLoader />
      </div>

      <template v-else-if="shell">
        <section class="rounded-xl border moh-border moh-surface p-4 space-y-2">
          <h2 class="text-sm font-semibold moh-text">
            Notifications
          </h2>
          <p class="text-sm moh-text-muted">
            Per-group notification preferences are not available yet. Global settings are under
            <NuxtLink to="/settings/notifications" class="font-medium moh-text hover:underline">Settings → Notifications</NuxtLink>.
          </p>
        </section>

        <section
          v-if="isMod && shell.joinPolicy === 'approval'"
          class="rounded-xl border moh-border moh-surface p-4"
        >
          <NuxtLink
            :to="`/g/${encodeURIComponent(slug)}/pending`"
            class="text-sm font-semibold moh-text hover:underline inline-flex items-center gap-1"
          >
            Review pending requests
            <Icon name="tabler:chevron-right" class="text-base opacity-70" aria-hidden="true" />
          </NuxtLink>
        </section>

        <section v-if="canLeave" class="rounded-xl border border-red-200 dark:border-red-900/50 moh-surface p-4 space-y-3">
          <h2 class="text-sm font-semibold moh-text">
            Leave group
          </h2>
          <p class="text-sm moh-text-muted">
            You will stop seeing this group in your list and lose access to its posts.
          </p>
          <Button
            label="Leave group"
            rounded
            severity="danger"
            :loading="leaveBusy"
            @click="doLeave"
          />
        </section>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const { apiFetchData } = useApiClient()

definePageMeta({ layout: 'app', title: 'Group settings', hideTopBar: true, ssr: false })

const shell = ref<CommunityGroupShell | null>(null)
const shellLoading = ref(true)
const loadError = ref<string | null>(null)
const leaveBusy = ref(false)

const isMod = computed(() => {
  const m = shell.value?.viewerMembership
  if (!m || m.status !== 'active') return false
  return m.role === 'owner' || m.role === 'moderator'
})

const canLeave = computed(() => {
  const m = shell.value?.viewerMembership
  if (!m || m.status !== 'active') return false
  return m.role !== 'owner'
})

async function loadShell() {
  shellLoading.value = true
  loadError.value = null
  try {
    const s = await apiFetchData<CommunityGroupShell>(`/groups/by-slug/${encodeURIComponent(slug.value)}`)
    shell.value = s
    if (!s.viewerMembership || s.viewerMembership.status !== 'active') {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
  } catch (e: unknown) {
    shell.value = null
    const err = e as { statusCode?: number; status?: number; response?: { status?: number } }
    const status = Number(err?.statusCode ?? err?.status ?? err?.response?.status ?? 0) || null
    if (status === 404 || status === 403) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    loadError.value = getApiErrorMessage(e) || 'Group not found.'
  } finally {
    shellLoading.value = false
  }
}

async function doLeave() {
  const s = shell.value
  if (!s || leaveBusy.value) return
  leaveBusy.value = true
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/leave`, { method: 'POST', body: {} })
    await navigateTo('/groups')
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Could not leave.'
  } finally {
    leaveBusy.value = false
  }
}

onMounted(() => {
  void loadShell()
})
</script>

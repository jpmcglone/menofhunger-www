<template>
  <AppPageContent bottom="standard">
    <div class="moh-gutter-x pt-4 pb-10 max-w-xl mx-auto space-y-6">
      <div class="flex items-center gap-2">
        <Button as="NuxtLink" to="/groups" text rounded severity="secondary" aria-label="Back">
          <template #icon>
            <Icon name="tabler:chevron-left" aria-hidden="true" />
          </template>
        </Button>
        <h1 class="moh-h1">Create a group</h1>
      </div>

      <div v-if="!authReady" class="flex justify-center py-16">
        <AppLogoLoader />
      </div>

      <div v-else-if="!canCreate" class="rounded-xl border moh-border p-4 space-y-3">
        <p class="text-sm moh-text-muted">Only premium members can create groups.</p>
        <Button as="NuxtLink" to="/tiers" label="View plans" rounded />
      </div>

      <template v-else>
        <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label for="g-name" class="block text-sm font-medium moh-text mb-1">Name</label>
            <InputText
              id="g-name"
              v-model="name"
              class="w-full"
              maxlength="120"
              autocomplete="off"
              placeholder="Short, memorable name"
            />
          </div>
          <div>
            <label for="g-desc" class="block text-sm font-medium moh-text mb-1">Description</label>
            <Textarea
              id="g-desc"
              v-model="description"
              class="w-full min-h-[120px]"
              auto-resize
              placeholder="What is this group for?"
            />
          </div>
          <div>
            <label for="g-rules" class="block text-sm font-medium moh-text mb-1">Rules <span class="font-normal moh-text-muted">(optional)</span></label>
            <Textarea
              id="g-rules"
              v-model="rules"
              class="w-full min-h-[80px]"
              auto-resize
              placeholder="Be specific — helps moderation later."
            />
          </div>
          <div>
            <span class="block text-sm font-medium moh-text mb-2">Who can join?</span>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                label="Open"
                rounded
                size="small"
                :severity="joinPolicy === 'open' ? 'primary' : 'secondary'"
                @click="joinPolicy = 'open'"
              />
              <Button
                type="button"
                label="Approval"
                rounded
                size="small"
                :severity="joinPolicy === 'approval' ? 'primary' : 'secondary'"
                @click="joinPolicy = 'approval'"
              />
            </div>
            <p class="mt-2 text-xs moh-text-muted">
              {{ joinPolicy === 'open' ? 'Anyone can join this group immediately.' : 'New members wait for a moderator or you to approve.' }}
            </p>
          </div>
          <Button
            type="submit"
            label="Create group"
            rounded
            :loading="submitting"
            :disabled="!name.trim() || !description.trim()"
          />
        </form>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'New group',
  hideTopBar: true,
  ssr: false,
})

usePageSeo({
  title: 'Create group',
  description: 'Start a new community group on Men of Hunger.',
  canonicalPath: '/groups/new',
  noindex: true,
})

const { user, ensureLoaded } = useAuth()
const { apiFetchData } = useApiClient()

const authReady = ref(false)

const name = ref('')
const description = ref('')
const rules = ref('')
const joinPolicy = ref<'open' | 'approval'>('open')
const submitting = ref(false)
const error = ref<string | null>(null)

const canCreate = computed(() => {
  const u = user.value
  if (!u) return false
  return Boolean(u.premium || u.premiumPlus || u.siteAdmin)
})

onMounted(async () => {
  await ensureLoaded()
  if (!user.value) {
    const redirect = encodeURIComponent('/groups/new')
    await navigateTo(`/login?redirect=${redirect}`)
    return
  }
  authReady.value = true
})

async function submit() {
  if (!canCreate.value || submitting.value) return
  const n = name.value.trim()
  const d = description.value.trim()
  if (!n || !d) return
  submitting.value = true
  error.value = null
  try {
    const created = await apiFetchData<CommunityGroupShell>('/groups', {
      method: 'POST',
      body: {
        name: n,
        description: d,
        rules: rules.value.trim() || null,
        joinPolicy: joinPolicy.value,
      },
    })
    await navigateTo(`/g/${encodeURIComponent(created.slug)}`)
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Could not create group.'
  } finally {
    submitting.value = false
  }
}
</script>

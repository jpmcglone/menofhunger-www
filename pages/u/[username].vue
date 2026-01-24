<template>
  <section class="w-full max-w-2xl space-y-6">
    <Card>
      <template #content>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex items-start gap-4">
            <div class="h-20 w-20 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />

            <div class="min-w-0">
              <div class="text-xl font-bold text-gray-900 dark:text-gray-50">
                {{ profileName }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                @{{ profile?.username }}
              </div>
            </div>
          </div>

          <div v-if="isSelf" class="flex justify-end">
            <Button label="Edit profile" icon="pi pi-pencil" severity="secondary" @click="editOpen = true" />
          </div>
        </div>

        <div v-if="profile?.bio" class="mt-4 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {{ profile.bio }}
        </div>
        <div v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No bio yet.
        </div>
      </template>
    </Card>

    <Dialog v-model:visible="editOpen" modal header="Edit profile" :draggable="false" :style="{ width: '32rem' }">
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
          <InputText v-model="editName" class="w-full" :maxlength="50" />
          <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-end">
            {{ editName.trim().length }}/50
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Bio</label>
          <Textarea v-model="editBio" class="w-full" rows="4" autoResize :maxlength="160" />
          <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-end">
            {{ editBio.trim().length }}/160
          </div>
        </div>

        <AppInlineAlert v-if="editError" severity="danger">
          {{ editError }}
        </AppInlineAlert>
      </div>

      <template #footer>
        <Button label="Cancel" text severity="secondary" :disabled="saving" @click="editOpen = false" />
        <Button label="Save" icon="pi pi-check" :loading="saving" :disabled="saving" @click="saveProfile" />
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Profile'
})

usePageSeo({
  title: 'Profile',
  description: 'User profile.',
  noindex: true
})

type PublicProfile = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
}

const route = useRoute()
const usernameParam = computed(() => String(route.params.username || ''))
const normalizedUsername = computed(() => usernameParam.value.trim().toLowerCase())

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'

const { data, error } = await useAsyncData(`public-profile:${normalizedUsername.value}`, async () => {
  const result = await apiFetchData<{ user: PublicProfile }>(
    `/users/${encodeURIComponent(normalizedUsername.value)}`,
    { method: 'GET' }
  )
  return result.user
})

const profile = computed(() => data.value ?? null)

const { user: authUser } = useAuth()

const isSelf = computed(() => Boolean(authUser.value?.id && profile.value?.id && authUser.value.id === profile.value.id))

const profileName = computed(() => profile.value?.name || profile.value?.username || 'User')

const editOpen = ref(false)
const editName = ref('')
const editBio = ref('')
const editError = ref<string | null>(null)
const saving = ref(false)

watch(
  () => editOpen.value,
  (open) => {
    if (!open) return
    editError.value = null
    editName.value = profile.value?.name || ''
    editBio.value = profile.value?.bio || ''
  }
)

async function saveProfile() {
  if (!isSelf.value) return
  editError.value = null
  saving.value = true
  try {
    const result = await apiFetchData<{ user: any }>('/users/me/profile', {
      method: 'PATCH',
      body: {
        name: editName.value,
        bio: editBio.value
      }
    })

    // Update profile state (public view) and auth user state (self).
    data.value = {
      ...(data.value as PublicProfile),
      name: result.user?.name ?? null,
      bio: result.user?.bio ?? null
    }
    authUser.value = result.user ?? authUser.value
    editOpen.value = false
  } catch (e: unknown) {
    editError.value = getApiErrorMessage(e) || 'Failed to save profile.'
  } finally {
    saving.value = false
  }
}
</script>


<template>
  <AppPageContent bottom="standard">
    <div v-if="loading" class="flex justify-center py-16">
      <AppLogoLoader />
    </div>

    <div v-else-if="notFound" class="moh-gutter-x pt-10 pb-16 max-w-xl mx-auto text-center space-y-3">
      <Icon name="tabler:shield-off" class="text-3xl opacity-60" aria-hidden="true" />
      <h1 class="moh-h1">Crew not found</h1>
      <Button as="NuxtLink" to="/" label="Back home" rounded />
    </div>

    <div v-else-if="crew" class="moh-gutter-x pt-6 pb-10 max-w-3xl mx-auto space-y-5">
      <div class="flex items-center gap-3">
        <NuxtLink
          :to="`/c/${encodeURIComponent(crew.slug)}`"
          class="inline-flex items-center gap-1 text-sm moh-text-muted hover:moh-text"
          :aria-label="`Back to ${crewName}`"
        >
          <Icon name="tabler:arrow-left" aria-hidden="true" />
          <span class="hidden sm:inline">Back to {{ crewName }}</span>
        </NuxtLink>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="h-10 w-10 overflow-hidden bg-gray-200 dark:bg-zinc-800 shrink-0"
          :class="crewAvatarRound"
        >
          <img
            v-if="crew.avatarUrl"
            :src="crew.avatarUrl"
            alt=""
            class="h-full w-full object-cover"
          >
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-semibold moh-text truncate">{{ crewName }}</h1>
          <p class="text-xs moh-text-muted tabular-nums">
            {{ crew.memberCount }} / 5 members · max 5
          </p>
        </div>
      </div>

      <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>

      <ul class="divide-y divide-gray-100 dark:divide-white/5 rounded-xl border moh-border">
        <li v-for="m in crew.members" :key="m.user.id" class="p-3 flex items-center gap-3">
          <NuxtLink
            v-if="m.user.username"
            :to="`/u/${encodeURIComponent(m.user.username)}`"
            class="shrink-0"
          >
            <AppUserAvatar :user="m.user" size-class="h-10 w-10" />
          </NuxtLink>
          <AppUserAvatar v-else :user="m.user" size-class="h-10 w-10" />
          <div class="flex-1 min-w-0">
            <AppUserIdentityLine :user="m.user">
              <template #after-name>
                <span
                  v-if="m.role === 'owner'"
                  class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300"
                >
                  Owner
                </span>
                <span
                  v-if="m.isDesignatedSuccessor"
                  class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                >
                  Successor
                </span>
              </template>
            </AppUserIdentityLine>
            <div class="text-[11px] moh-text-muted">Joined {{ formatDate(m.joinedAt) }}</div>
          </div>
          <!-- Owner controls: kick anyone but yourself; Owner role isn't kickable. -->
          <div v-if="isOwner && m.role !== 'owner'" class="shrink-0">
            <Button
              size="small"
              severity="secondary"
              rounded
              label="Remove"
              :loading="removingMemberId === m.user.id"
              @click="remove(m.user.id)"
            />
          </div>
        </li>
      </ul>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CrewBySlugViewerMembership, CrewPublic } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { crewAvatarRoundClass } from '~/utils/avatar-rounding'

const crewAvatarRound = crewAvatarRoundClass()

definePageMeta({
  layout: 'app',
  title: 'Crew members',
  hideTopBar: true,
})

const route = useRoute()

const loading = ref(true)
const notFound = ref(false)
const error = ref<string | null>(null)
const crew = ref<CrewPublic | null>(null)
const viewerMembership = ref<CrewBySlugViewerMembership | null>(null)
const removingMemberId = ref<string | null>(null)

const crewApi = useCrew()
const { addCrewCallback, removeCrewCallback } = usePresence()
const { markReadBySubject } = useNotifications()

const crewName = computed(() => {
  const n = (crew.value?.name ?? '').trim()
  return n.length > 0 ? n : 'Untitled Crew'
})

const isOwner = computed(() => viewerMembership.value?.role === 'owner')

usePageSeo({
  title: computed(() => `${crewName.value} — members`),
  noindex: true,
})

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return ''
  }
}

async function load() {
  const slug = String(route.params.slug || '').toLowerCase()
  if (!slug) {
    notFound.value = true
    loading.value = false
    return
  }
  loading.value = true
  notFound.value = false
  try {
    const res = await crewApi.getCrewBySlug(slug)
    crew.value = res.crew
    viewerMembership.value = res.viewerMembership
    if (import.meta.client && res.viewerMembership && res.crew.id) {
      void markReadBySubject({ crew_id: res.crew.id })
    }
    if (import.meta.client && res.crew.slug && res.crew.slug !== slug) {
      void navigateTo(`/c/${encodeURIComponent(res.crew.slug)}/members`, { replace: true })
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

async function remove(userId: string) {
  if (!confirm('Remove this member from your Crew?')) return
  removingMemberId.value = userId
  error.value = null
  try {
    await crewApi.kickMember(userId)
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Could not remove that member.'
  } finally {
    removingMemberId.value = null
  }
}

watch(() => route.params.slug, () => {
  void load()
})

const realtimeCb = {
  onMembersChanged() {
    void load()
  },
  onOwnerChanged() {
    void load()
  },
  onUpdated() {
    void load()
  },
  onDisbanded() {
    notFound.value = true
  },
}
onMounted(() => addCrewCallback(realtimeCb))
onBeforeUnmount(() => removeCrewCallback(realtimeCb))

void load()
</script>

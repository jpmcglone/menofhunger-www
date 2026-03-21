<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="moh-gutter-x border-b moh-border pb-4 pt-4 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="moh-h1">Groups</h1>
            <p class="mt-1 moh-meta max-w-xl">
              Discover communities or open a group you’re in. Posts from all your groups live on the feed.
            </p>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0">
            <Button
              v-if="isAuthed && canCreateGroup"
              label="Create group"
              rounded
              @click="navigateTo('/groups/new')"
            >
              <template #icon>
                <Icon name="tabler:plus" aria-hidden="true" />
              </template>
            </Button>
            <Button
              v-else-if="isAuthed"
              label="Upgrade to create"
              rounded
              severity="secondary"
              @click="navigateTo('/tiers')"
            >
              <template #icon>
                <Icon name="tabler:sparkles" aria-hidden="true" />
              </template>
            </Button>
            <Button
              v-if="isAuthed && pickTarget"
              label="Pick a group for me"
              rounded
              severity="secondary"
              :loading="pickLoading"
              @click="pickForMe"
            >
              <template #icon>
                <Icon name="tabler:hand-finger" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="flex gap-1 rounded-full border moh-border p-0.5 bg-[var(--moh-surface)]">
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              :class="tab === 'explore' ? 'bg-[color:rgba(var(--moh-group-rgb),0.2)] text-[color:var(--moh-group)]' : 'moh-text-muted'"
              @click="setTab('explore')"
            >
              Explore groups
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              :class="tab === 'my' ? 'bg-[color:rgba(var(--moh-group-rgb),0.2)] text-[color:var(--moh-group)]' : 'moh-text-muted'"
              @click="setTab('my')"
            >
              My groups
            </button>
          </div>
          <NuxtLink
            v-if="isAuthed && mine.length > 0"
            to="/groups/feed"
            class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors moh-border hover:bg-[color:rgba(var(--moh-group-rgb),0.08)]"
            style="border-color: rgba(var(--moh-group-rgb), 0.35); color: var(--moh-group)"
          >
            <Icon name="tabler:layout-list" class="text-sm opacity-90" aria-hidden="true" />
            Groups feed
          </NuxtLink>
        </div>

        <AppInlineAlert v-if="error" severity="danger">
          {{ error }}
        </AppInlineAlert>

        <div v-if="metaLoading" class="flex justify-center py-8">
          <AppLogoLoader />
        </div>
      </div>

      <template v-if="!metaLoading">
        <!-- Explore -->
        <section v-if="tab === 'explore'" class="moh-gutter-x pb-10 pt-6">
          <div class="rounded-xl border moh-border overflow-hidden">
            <div
              class="flex flex-wrap items-center justify-between gap-2 border-b moh-border px-4 py-3"
            >
              <h2 class="m-0 text-sm font-semibold moh-text">
                Discover
              </h2>
              <NuxtLink
                to="/explore"
                class="text-xs font-medium hover:underline moh-text-muted shrink-0"
              >
                Site explore →
              </NuxtLink>
            </div>
            <div
              v-if="!exploreGroups.length"
              class="p-6 text-sm moh-text-muted text-center"
            >
              No groups to show yet.
            </div>
            <div v-else class="divide-y divide-gray-100 dark:divide-white/5">
              <NuxtLink
                v-for="g in exploreGroups"
                :key="g.id"
                :to="`/g/${encodeURIComponent(g.slug)}`"
                class="relative flex items-center gap-3 p-4 overflow-hidden hover:bg-gray-50/60 dark:hover:bg-zinc-900/40 transition-colors"
              >
                <div
                  v-if="g.coverImageUrl"
                  class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.03]"
                  :style="{ backgroundImage: `url(${g.coverImageUrl})` }"
                  aria-hidden="true"
                />
                <div
                  class="relative h-12 w-12 shrink-0 overflow-hidden bg-gray-200 dark:bg-zinc-800"
                  :class="avatarRoundClass"
                >
                  <img
                    v-if="g.avatarImageUrl"
                    :src="g.avatarImageUrl"
                    alt=""
                    class="h-full w-full object-cover"
                    loading="lazy"
                  >
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-sm font-bold moh-text"
                  >
                    {{ initials(g.name) }}
                  </div>
                </div>
                <div class="relative min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium moh-text">{{ g.name }}</span>
                    <span
                      v-if="g.joinPolicy === 'approval'"
                      class="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded border moh-border moh-text-muted"
                    >
                      Approval
                    </span>
                    <span
                      v-else
                      class="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    >
                      Open
                    </span>
                  </div>
                  <p class="mt-0.5 text-sm moh-text-muted line-clamp-2">{{ g.description }}</p>
                  <div class="mt-1 text-xs moh-text-muted tabular-nums">{{ g.memberCount.toLocaleString() }} members</div>
                </div>
                <Icon name="tabler:chevron-right" class="relative text-lg opacity-50 shrink-0" aria-hidden="true" />
              </NuxtLink>
            </div>
          </div>
        </section>

        <!-- My groups -->
        <section v-else class="relative overflow-hidden">
          <div
            class="pointer-events-none absolute inset-0 opacity-[0.08]"
            style="background: radial-gradient(120% 80% at 10% 0%, rgba(var(--moh-group-rgb), 0.55), transparent 55%), radial-gradient(90% 60% at 90% 20%, rgba(var(--moh-group-rgb), 0.25), transparent 50%)"
            aria-hidden="true"
          />
          <div class="relative moh-gutter-x pb-10 pt-2 space-y-6">
            <template v-if="!isAuthed">
              <p class="text-sm moh-text-muted text-center py-8">
                Log in to see groups you belong to.
              </p>
            </template>
            <template v-else-if="!mine.length">
              <div class="rounded-2xl border moh-border p-8 text-center">
                <p class="text-sm moh-text-muted">
                  You’re not in any groups yet.
                </p>
                <Button label="Explore groups" class="mt-4" rounded @click="setTab('explore')" />
              </div>
            </template>
            <template v-else>
              <IconField icon-position="left" class="w-full max-w-md">
                <InputIcon>
                  <Icon name="tabler:search" class="text-lg opacity-70" aria-hidden="true" />
                </InputIcon>
                <InputText
                  v-model="search"
                  class="w-full"
                  placeholder="Search your groups…"
                />
              </IconField>

              <div class="grid gap-3 sm:grid-cols-2">
                <button
                  v-for="g in filteredMine"
                  :key="g.id"
                  type="button"
                  class="relative text-left rounded-2xl border moh-border p-4 overflow-hidden transition-all hover:border-[color:rgba(var(--moh-group-rgb),0.4)] hover:shadow-sm dark:hover:shadow-none moh-surface"
                  @click="selectGroup(g)"
                >
                  <div
                    v-if="g.coverImageUrl"
                    class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.03]"
                    :style="{ backgroundImage: `url(${g.coverImageUrl})` }"
                    aria-hidden="true"
                  />
                  <div class="relative flex gap-3">
                    <div
                      class="h-14 w-14 shrink-0 overflow-hidden bg-gray-200 ring-2 ring-[color:rgba(var(--moh-group-rgb),0.25)] dark:bg-zinc-800"
                      :class="avatarRoundClass"
                    >
                      <img
                        v-if="g.avatarImageUrl"
                        :src="g.avatarImageUrl"
                        alt=""
                        class="h-full w-full object-cover"
                        loading="lazy"
                      >
                      <div
                        v-else
                        class="flex h-full w-full items-center justify-center text-lg font-bold moh-text"
                      >
                        {{ initials(g.name) }}
                      </div>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-start justify-between gap-2">
                        <span class="font-semibold moh-text line-clamp-2 leading-snug">{{ g.name }}</span>
                        <Icon name="tabler:chevron-right" class="text-lg shrink-0 opacity-35 mt-0.5" aria-hidden="true" />
                      </div>
                      <p class="mt-1 text-xs moh-text-muted line-clamp-2">
                        {{ g.description }}
                      </p>
                      <div class="mt-2 flex flex-wrap items-center gap-2">
                        <span class="text-[11px] tabular-nums moh-text-muted">
                          {{ g.memberCount.toLocaleString() }} members
                        </span>
                        <span
                          class="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          :class="roleBadgeClass(g)"
                        >
                          {{ roleLabel(g) }}
                        </span>
                      </div>
                      <p class="mt-2 text-[11px] font-medium text-[color:var(--moh-group)]">
                        Open group →
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </template>
          </div>
        </section>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Groups',
  hideTopBar: true,
})

usePageSeo({
  title: 'Groups',
  description: 'Explore community groups and manage groups you’re in.',
  canonicalPath: '/groups',
  noindex: true,
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const { user, isAuthed } = useAuth()

const tab = computed<'explore' | 'my'>(() => (route.query.tab === 'my' ? 'my' : 'explore'))

function setTab(t: 'explore' | 'my') {
  if (t === 'my') {
    void navigateTo({ path: '/groups', query: { tab: 'my' } })
    return
  }
  void navigateTo({ path: '/groups' })
}

const metaLoading = ref(true)
const error = ref<string | null>(null)
const exploreGroups = ref<CommunityGroupShell[]>([])
const mine = ref<CommunityGroupShell[]>([])
const search = ref('')
const pickLoading = ref(false)
const avatarRoundClass = groupAvatarRoundClass()

const canCreateGroup = computed(() => {
  const u = user.value
  if (!u) return false
  return Boolean(u.premium || u.premiumPlus || u.siteAdmin)
})

const pickTarget = computed(() => {
  for (const g of exploreGroups.value) {
    if (g.joinPolicy !== 'open') continue
    if (g.viewerMembership?.status === 'active') continue
    return g
  }
  return null
})

const filteredMine = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return mine.value
  return mine.value.filter((g) => {
    const name = (g.name ?? '').toLowerCase()
    const desc = (g.description ?? '').toLowerCase()
    return name.includes(q) || desc.includes(q)
  })
})

function initials(name: string) {
  const n = (name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

function roleLabel(g: CommunityGroupShell) {
  const r = g.viewerMembership?.role
  if (r === 'owner') return 'Owner'
  if (r === 'moderator') return 'Moderator'
  return 'Member'
}

function roleBadgeClass(g: CommunityGroupShell) {
  const r = g.viewerMembership?.role
  if (r === 'owner') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  if (r === 'moderator') return 'bg-[color:var(--moh-group-soft)] text-[color:var(--moh-group)]'
  return 'bg-gray-200/80 text-gray-700 dark:bg-zinc-800 dark:text-zinc-200'
}

function selectGroup(g: CommunityGroupShell) {
  void navigateTo(`/g/${encodeURIComponent(g.slug)}`)
}

/** Legacy `/groups?group=<id>` → canonical `/g/:slug`. */
async function redirectIfLegacyGroupQuery(): Promise<boolean> {
  if (!isAuthed.value || metaLoading.value) return false
  const raw = route.query.group
  const gid = typeof raw === 'string' && raw.trim() ? raw.trim() : null
  if (!gid) return false
  const shell = mine.value.find((g) => g.id === gid)
  if (shell) {
    await navigateTo(`/g/${encodeURIComponent(shell.slug)}`, { replace: true })
    return true
  }
  await navigateTo({ path: '/groups', query: {}, replace: true })
  return true
}

async function loadMeta() {
  metaLoading.value = true
  error.value = null
  try {
    const expl = await apiFetchData<CommunityGroupShell[]>('/groups/explore')
    exploreGroups.value = Array.isArray(expl) ? expl : []
    if (isAuthed.value) {
      const m = await apiFetchData<CommunityGroupShell[]>('/groups/me')
      mine.value = Array.isArray(m) ? m : []
    } else {
      mine.value = []
    }
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load groups.'
    exploreGroups.value = []
    mine.value = []
  } finally {
    metaLoading.value = false
  }
}

async function pickForMe() {
  const g = pickTarget.value
  if (!g || pickLoading.value) return
  pickLoading.value = true
  try {
    await apiFetchData(`/groups/${encodeURIComponent(g.id)}/join`, { method: 'POST', body: {} })
    await navigateTo(`/g/${encodeURIComponent(g.slug)}`)
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Could not join that group.'
  } finally {
    pickLoading.value = false
  }
}

watch(
  [isAuthed],
  async () => {
    await loadMeta()
    if (isAuthed.value && (await redirectIfLegacyGroupQuery())) return
  },
  { immediate: true },
)

watch(
  () => route.query.group,
  async () => {
    if (!isAuthed.value || metaLoading.value) return
    if (await redirectIfLegacyGroupQuery()) return
  },
)
</script>

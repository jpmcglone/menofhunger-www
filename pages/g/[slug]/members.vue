<template>
  <AppPageContent bottom="standard">
    <div class="w-full py-4">
      <div class="flex items-center gap-2 mb-4 px-3 sm:px-4">
        <NuxtLink
          :to="`/g/${encodeURIComponent(slug)}`"
          class="moh-tap flex h-9 w-9 items-center justify-center rounded-full moh-surface-hover"
          aria-label="Back to group"
        >
          <Icon name="tabler:chevron-left" class="text-lg" aria-hidden="true" />
        </NuxtLink>
        <h1 class="text-lg font-bold moh-text truncate">
          Members
        </h1>
      </div>

      <AppInlineAlert v-if="shellError" severity="danger" class="mb-3 mx-3 sm:mx-4">
        {{ shellError }}
      </AppInlineAlert>

      <!--
        Non-members hit the API-gated /groups/:id/members endpoint as a 403, so render a
        graceful CTA instead of throwing. Throwing createError from onMounted produced
        unhandled Vue async errors that surfaced in Sentry (auto.function.nuxt.vue-error).
      -->
      <div
        v-else-if="shell && !isMember"
        class="mx-3 sm:mx-4 mt-2 rounded-xl border moh-border bg-[var(--moh-surface-2)] px-5 py-8 text-center"
      >
        <p class="text-sm font-medium moh-text mb-1">
          Members are visible to people who have joined this group.
        </p>
        <p class="text-xs moh-text-muted mb-4">
          {{ pendingCopy }}
        </p>
        <NuxtLink
          :to="`/g/${encodeURIComponent(slug)}`"
          class="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--moh-group)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
        >
          Back to group
        </NuxtLink>
      </div>

      <template v-else-if="shell && isMember">
        <div class="px-3 sm:px-4 mb-3">
          <IconField icon-position="left" class="w-full">
            <InputIcon>
              <Icon name="tabler:search" class="text-lg opacity-70" aria-hidden="true" />
            </InputIcon>
            <InputText
              v-model="searchInput"
              class="w-full"
              placeholder="Search members…"
              @keydown.enter.prevent="flushSearch"
            />
          </IconField>
        </div>

        <AppInlineAlert v-if="error" severity="danger" class="mb-3 mx-3 sm:mx-4">
          {{ error }}
        </AppInlineAlert>

        <AppSubtleSectionLoader :loading="loading && !rows.length" min-height-class="min-h-[120px]">
          <ul v-if="filteredRows.length">
            <li
              v-for="m in filteredRows"
              :key="m.userId"
              class="flex items-center gap-3 px-3 py-2.5 sm:px-4 border-b border-gray-100 dark:border-zinc-900 last:border-b-0 hover:bg-black/[.03] dark:hover:bg-white/[.03] transition-colors"
            >
              <NuxtLink :to="m.username ? `/u/${encodeURIComponent(m.username)}` : '#'" class="shrink-0" @click.prevent="goProfile(m)">
                <AppUserAvatar
                  :user="{ id: m.userId, username: m.username, name: m.name, avatarUrl: m.avatarUrl, isOrganization: false }"
                  size-class="h-10 w-10"
                />
              </NuxtLink>
              <div class="min-w-0 flex-1">
                <NuxtLink
                  :to="m.username ? `/u/${encodeURIComponent(m.username)}` : '#'"
                  class="font-semibold text-sm moh-text truncate hover:underline"
                  @click.prevent="goProfile(m)"
                >
                  {{ m.name || m.username || 'Member' }}
                </NuxtLink>
                <div v-if="m.username" class="text-xs moh-text-muted truncate">
                  @{{ m.username }}
                </div>
              </div>
              <span
                class="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="roleBadgeClass(m.role)"
              >
                {{ roleLabel(m.role) }}
              </span>
            </li>
          </ul>
          <p v-else-if="!loading" class="text-sm moh-text-muted py-6 text-center">
            No members match.
          </p>
        </AppSubtleSectionLoader>

        <div v-if="nextCursor" class="flex justify-center py-4">
          <Button label="Load more" rounded severity="secondary" :loading="loadingMore" @click="loadMore" />
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CommunityGroupMemberListItem, CommunityGroupShell } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())

definePageMeta({ layout: 'app', title: 'Members', hideTopBar: true })

const { apiFetch, apiFetchData } = useApiClient()
const { markReadBySubject } = useNotifications()

// SSR-friendly shell fetch mirrors pages/g/[slug]/index.vue. We never throw
// createError from setup/onMounted: a missing or forbidden group renders inline
// (and the parent /g/[slug] route handles the real 404 for unknown slugs).
const {
  data: shell,
  error: shellFetchError,
} = await useAsyncData<CommunityGroupShell | null>(
  () => `group-shell-members-${slug.value}`,
  async () => {
    if (!slug.value) return null
    return await apiFetchData<CommunityGroupShell>(`/groups/by-slug/${encodeURIComponent(slug.value)}`)
  },
)

const shellError = computed(() =>
  shellFetchError.value ? getApiErrorMessage(shellFetchError.value) || 'Could not load group.' : null,
)

const isMember = computed(() => shell.value?.viewerMembership?.status === 'active')

const pendingCopy = computed(() => {
  const status = shell.value?.viewerMembership?.status
  if (status === 'pending') return 'Your join request is still pending approval.'
  return 'Join the group to see who else is in it.'
})

const rows = ref<CommunityGroupMemberListItem[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const searchInput = ref('')
const debouncedQ = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (v) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQ.value = (v ?? '').trim()
    debounceTimer = null
  }, 350)
})

watch(debouncedQ, async () => {
  if (isMember.value) await reloadFromServer()
})

const filteredRows = computed(() => {
  const q = (searchInput.value ?? '').trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((m) => {
    const u = (m.username ?? '').toLowerCase()
    const n = (m.name ?? '').toLowerCase()
    return u.includes(q) || n.includes(q)
  })
})

function roleLabel(role: CommunityGroupMemberListItem['role']) {
  if (role === 'owner') return 'Owner'
  if (role === 'moderator') return 'Mod'
  return 'Member'
}

function roleBadgeClass(role: CommunityGroupMemberListItem['role']) {
  if (role === 'owner') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  if (role === 'moderator') return 'bg-[color:var(--moh-group-soft)] text-[color:var(--moh-group)]'
  return 'bg-gray-200/80 text-gray-700 dark:bg-zinc-800 dark:text-zinc-200'
}

async function reloadFromServer() {
  const s = shell.value
  if (!s) return
  loading.value = true
  error.value = null
  nextCursor.value = null
  rows.value = []
  try {
    const res = await apiFetch<CommunityGroupMemberListItem[]>(
      `/groups/${encodeURIComponent(s.id)}/members`,
      { query: { limit: 50, ...(debouncedQ.value ? { q: debouncedQ.value } : {}) } },
    )
    rows.value = res.data ?? []
    nextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load members.'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  const s = shell.value
  if (!s || !nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const res = await apiFetch<CommunityGroupMemberListItem[]>(
      `/groups/${encodeURIComponent(s.id)}/members`,
      {
        query: {
          limit: 50,
          cursor: nextCursor.value,
          ...(debouncedQ.value ? { q: debouncedQ.value } : {}),
        },
      },
    )
    const chunk = res.data ?? []
    const seen = new Set(rows.value.map((r) => r.userId))
    for (const r of chunk) {
      if (!seen.has(r.userId)) {
        seen.add(r.userId)
        rows.value.push(r)
      }
    }
    nextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load more.'
  } finally {
    loadingMore.value = false
  }
}

function flushSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  debouncedQ.value = (searchInput.value ?? '').trim()
}

function goProfile(m: CommunityGroupMemberListItem) {
  if (m.username) void navigateTo(`/u/${encodeURIComponent(m.username)}`)
}

onMounted(async () => {
  if (!shell.value || !isMember.value) return
  void markReadBySubject({ group_id: shell.value.id })
  await reloadFromServer()
})
</script>

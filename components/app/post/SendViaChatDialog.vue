<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          role="presentation"
          @click.self="close"
        >
          <Transition
            appear
            enter-active-class="transition-[opacity,transform] duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="transition-[opacity,transform] duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-95"
          >
            <section
              v-if="open"
              class="relative w-full max-w-[min(28rem,calc(100vw-0px))] sm:max-w-[28rem] rounded-t-3xl bg-white text-left shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10 sm:rounded-3xl dark:bg-[color:var(--moh-surface-2)] dark:ring-white/15"
              :style="{ paddingBottom: `calc(var(--moh-safe-bottom, 0px) + 0.5rem)` }"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
              @click.stop
            >
              <!-- Header -->
              <header class="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                <h2 :id="titleId" class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                  Share
                </h2>
                <button
                  type="button"
                  class="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                  aria-label="Close"
                  @click="close"
                >
                  <Icon name="tabler:x" aria-hidden="true" />
                </button>
              </header>

              <!-- Search input -->
              <div class="px-4 pb-3">
                <div class="relative">
                  <Icon
                    name="tabler:search"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-zinc-500 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    ref="searchInputRef"
                    v-model="query"
                    type="search"
                    class="w-full rounded-2xl border moh-border bg-gray-50 dark:bg-zinc-800/60 pl-9 pr-4 py-2.5 text-sm moh-text placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-[color:var(--p-primary-color)]/40"
                    placeholder="Search"
                    autocomplete="off"
                    autocorrect="off"
                    @keydown.escape.prevent="close"
                  />
                </div>
              </div>

              <!-- Recipient list -->
              <div class="overflow-y-auto max-h-[55vh]">
                <!-- Loading skeleton -->
                <div v-if="defaultLoading && !query.trim()" class="px-4 py-2 space-y-1">
                  <div v-for="i in 5" :key="i" class="flex items-center gap-3 py-2">
                    <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-700 animate-pulse shrink-0" />
                    <div class="flex-1 space-y-1.5">
                      <div class="h-3 w-28 rounded bg-gray-200 dark:bg-zinc-700 animate-pulse" />
                      <div class="h-2.5 w-20 rounded bg-gray-200 dark:bg-zinc-700 animate-pulse" />
                    </div>
                  </div>
                </div>

                <!-- Search loading -->
                <div v-else-if="searchLoading && query.trim()" class="px-5 py-3 text-sm moh-text-muted">
                  Searching…
                </div>

                <!-- No results -->
                <div
                  v-else-if="displayList.length === 0 && query.trim() && !searchLoading"
                  class="px-5 py-6 text-sm moh-text-muted text-center"
                >
                  No users found.
                </div>

                <!-- User rows -->
                <template v-else>
                  <button
                    v-for="u in displayList"
                    :key="u.id"
                    type="button"
                    class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                    :class="isSelectable(u)
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04] active:bg-gray-100 dark:active:bg-white/[0.07]'
                      : 'cursor-default opacity-50'"
                    :disabled="sending || !isSelectable(u)"
                    :title="!isSelectable(u) ? 'Only verified men can receive messages.' : undefined"
                    @click="onPickUser(u)"
                  >
                    <AppUserAvatar :user="u" size-class="h-10 w-10" :show-status="false" />
                    <div class="min-w-0 flex-1">
                      <AppUserIdentityLine :user="u" class="min-w-0" />
                      <p v-if="!isSelectable(u)" class="text-[11px] moh-text-muted mt-0.5">
                        Only verified men can receive messages.
                      </p>
                    </div>
                    <Icon
                      v-if="sendingUserId === u.id"
                      name="tabler:loader-2"
                      class="text-base shrink-0 animate-spin moh-text-muted"
                      aria-hidden="true"
                    />
                  </button>
                </template>
              </div>
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { FollowListUser, GetFollowsListData, MessageConversation } from '~/types/api'
import { rankRecipients, dedupeRecipients, type RankableRecipient } from '~/utils/recipient-ranking'

const { open, post, send, sending } = useSendViaChat()
const { user } = useAuth()
const { apiFetchData } = useApiClient()

const titleId = `moh-send-via-chat-${useId()}`

const query = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const sendingUserId = ref<string | null>(null)

// ─── Default list: recent DM conversations + following ────────────────────────

const defaultList = ref<RankableRecipient[]>([])
const defaultLoading = ref(false)

async function loadDefaultList() {
  if (!import.meta.client || !user.value?.username) return
  defaultLoading.value = true
  try {
    const [convRes, followRes] = await Promise.allSettled([
      apiFetchData<MessageConversation[]>('/messages/conversations', {
        query: { tab: 'primary', limit: 20 },
      }),
      apiFetchData<GetFollowsListData>(`/follows/${encodeURIComponent(user.value.username)}/following`, {
        query: { limit: 40 },
      }),
    ])

    const myId = user.value?.id

    // Map recent direct-convo participants to RankableRecipient.
    const fromConvos: RankableRecipient[] = []
    if (convRes.status === 'fulfilled') {
      const convos = (convRes.value as unknown as { data?: MessageConversation[] })?.data
        ?? (Array.isArray(convRes.value) ? (convRes.value as MessageConversation[]) : [])
      let index = 0
      for (const convo of convos) {
        if (convo.type !== 'direct') continue
        const other = convo.participants.find((p) => p.user.id !== myId)
        if (!other) continue
        fromConvos.push({
          id: other.user.id,
          username: other.user.username,
          name: other.user.name,
          premium: other.user.premium,
          premiumPlus: other.user.premiumPlus,
          isOrganization: other.user.isOrganization,
          stewardBadgeEnabled: other.user.stewardBadgeEnabled,
          verifiedStatus: other.user.verifiedStatus,
          avatarUrl: other.user.avatarUrl,
          relationship: { viewerFollowsUser: false, userFollowsViewer: false, viewerPostNotificationsEnabled: false },
          recentDmIndex: index++,
        })
      }
    }

    // Following list.
    const fromFollowing: RankableRecipient[] = []
    if (followRes.status === 'fulfilled') {
      const list = (followRes.value as unknown as { data?: FollowListUser[] })?.data
        ?? (Array.isArray(followRes.value) ? (followRes.value as FollowListUser[]) : [])
      for (const u of list) {
        fromFollowing.push({ ...u })
      }
    }

    const merged = dedupeRecipients(rankRecipients([...fromConvos, ...fromFollowing]))
    defaultList.value = merged.filter((u) => u.id !== myId)
  } catch {
    // Silently ignore — search still works
  } finally {
    defaultLoading.value = false
  }
}

// ─── Live search ──────────────────────────────────────────────────────────────

const searchResults = ref<RankableRecipient[]>([])
const searchLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  const q = val.trim().replace(/^@+/, '')
  if (!q) {
    searchResults.value = []
    return
  }
  searchLoading.value = true
  searchTimer = setTimeout(async () => {
    try {
      const res = await apiFetchData<FollowListUser[]>('/search', {
        query: { type: 'users', q, limit: 12 },
      })
      const myId = user.value?.id
      const raw: RankableRecipient[] = (Array.isArray(res) ? res : []).filter((u) => u.id !== myId)
      // Merge with default list so recent-DM users keep their tier boost in search.
      const defaultById = new Map(defaultList.value.map((u) => [u.id, u]))
      searchResults.value = rankRecipients(
        raw.map((u) => ({ ...u, recentDmIndex: defaultById.get(u.id)?.recentDmIndex })),
      )
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, 250)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

const displayList = computed<RankableRecipient[]>(() =>
  query.value.trim() ? searchResults.value : defaultList.value,
)

function isSelectable(u: RankableRecipient): boolean {
  return (u.verifiedStatus ?? 'none') !== 'none'
}

// ─── Actions ──────────────────────────────────────────────────────────────────

async function onPickUser(u: RankableRecipient) {
  if (!isSelectable(u) || sending.value || sendingUserId.value) return
  sendingUserId.value = u.id
  try {
    await send(u as FollowListUser)
  } finally {
    sendingUserId.value = null
  }
}

function close() {
  useSendViaChat().close()
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

useModalEscape(open, close)

watch(open, async (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) {
    document.documentElement.style.overflow = 'hidden'
    query.value = ''
    searchResults.value = []
    sendingUserId.value = null
    await nextTick()
    searchInputRef.value?.focus()
    void loadDefaultList()
  } else {
    document.documentElement.style.overflow = ''
  }
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <AppPageContent bottom="standard">
  <div class="relative">
    <!-- Content (blurred until revealed) -->
    <div :class="revealed ? '' : 'blur-md pointer-events-none select-none'">
      <!-- Tabs -->
      <div class="border-b moh-border px-4 py-3 flex items-center gap-2">
        <button
          type="button"
          class="h-9 px-3 rounded-full border text-sm font-semibold transition-colors"
          :class="tab === 'notes' ? 'bg-white dark:bg-zinc-900 moh-border' : 'bg-transparent border-transparent moh-text-muted hover:bg-gray-50 dark:hover:bg-zinc-900/50'"
          @click="tab = 'notes'"
        >
          Notes
        </button>
        <button
          type="button"
          class="h-9 px-3 rounded-full border text-sm font-semibold transition-colors"
          :class="tab === 'drafts' ? 'bg-white dark:bg-zinc-900 moh-border' : 'bg-transparent border-transparent moh-text-muted hover:bg-gray-50 dark:hover:bg-zinc-900/50'"
          @click="tab = 'drafts'"
        >
          Drafts
        </button>
      </div>

      <!-- Notes -->
      <template v-if="tab === 'notes'">
        <div v-if="canPost" class="border-b moh-border">
          <AppPostComposer
            :show-divider="false"
            :locked-visibility="'onlyMe'"
            hide-visibility-picker
            @posted="onPosted"
          />
        </div>

        <div v-if="notesError" class="px-4 mt-4">
          <AppInlineAlert severity="danger">
            {{ notesError }}
          </AppInlineAlert>
        </div>

        <div v-if="notesLoading && notes.length === 0" class="flex justify-center pt-12 pb-8">
          <AppLogoLoader />
        </div>

        <div v-else-if="!notesLoading && notes.length === 0" class="px-4 py-6 text-sm moh-text-muted">
          No “Only me” notes yet.
        </div>

        <div v-else class="relative mt-2">
          <div v-for="p in notes" :key="p.id">
            <AppPostRow :post="p" @deleted="removeNote" />
          </div>
        </div>

        <div v-if="notesNextCursor" class="px-4 pt-6 pb-0 sm:pb-6 flex justify-center">
          <Button label="Load more" severity="secondary" :loading="notesLoading" :disabled="notesLoading" @click="loadMoreNotes" />
        </div>
      </template>

      <!-- Drafts -->
      <template v-else>
        <div class="border-b moh-border px-4 py-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold moh-text">Draft editor</div>
            <div class="flex items-center gap-2">
              <Button label="New draft" severity="secondary" text @click="startNewDraft" />
              <Button
                label="Save"
                severity="secondary"
                :disabled="draftSaving || !draftDirty"
                :loading="draftSaving"
                @click="saveDraftNow"
              />
            </div>
          </div>
          <textarea
            v-model="draftEditorText"
            class="w-full rounded-xl border moh-border bg-white/70 dark:bg-zinc-900/40 px-3 py-2 text-sm moh-text focus:outline-none focus:ring-2 focus:ring-[var(--moh-premium)]/30"
            rows="4"
            placeholder="Start typing…"
            @input="onDraftEditorInput"
          />
          <div class="flex items-center justify-between gap-3 text-xs">
            <div class="moh-text-muted">
              <template v-if="draftSaveError">{{ draftSaveError }}</template>
              <template v-else-if="draftSaving">Saving…</template>
              <template v-else-if="draftSavedAt">Saved</template>
              <template v-else-if="draftDirty">Unsaved</template>
              <template v-else>—</template>
            </div>
            <div v-if="draftEditorId" class="moh-text-muted font-mono">
              Draft: {{ draftEditorId.slice(0, 6) }}
            </div>
          </div>
        </div>

        <div v-if="draftsError" class="px-4 mt-4">
          <AppInlineAlert severity="danger">
            {{ draftsError }}
          </AppInlineAlert>
        </div>

        <div v-if="draftsLoading && drafts.length === 0" class="flex justify-center pt-12 pb-8">
          <AppLogoLoader />
        </div>

        <div v-else-if="!draftsLoading && drafts.length === 0" class="px-4 py-6 text-sm moh-text-muted">
          No drafts yet.
        </div>

        <div v-else class="relative mt-2 space-y-2">
          <div v-for="d in drafts" :key="d.id">
            <div class="px-4 flex justify-end gap-2">
              <Button label="Post…" severity="secondary" text @click="postDraft(d)" />
              <Button label="Open in editor" severity="secondary" text @click="openDraftInEditor(d)" />
            </div>
            <AppPostRow :post="d" :clickable="false" @deleted="removeDraft" />
          </div>
        </div>

        <div v-if="draftsNextCursor" class="px-4 pt-6 pb-0 sm:pb-6 flex justify-center">
          <Button label="Load more" severity="secondary" :loading="draftsLoading" :disabled="draftsLoading" @click="loadMoreDrafts" />
        </div>
      </template>
    </div>

    <!-- Privacy gate (resets every visit) -->
    <div
      v-if="!revealed"
      class="absolute inset-0 z-10 flex items-start justify-center bg-white/55 dark:bg-black/55"
    >
      <div class="w-full max-w-md px-4 pt-10 sm:pt-14">
        <div class="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-black/70">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center moh-onlyme-icon">
              <Icon name="tabler:eye-off" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <div class="text-lg font-semibold text-gray-900 dark:text-gray-50">These posts are only for you</div>
              <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                For privacy, we hide them by default each time you visit this page.
              </div>
            </div>
          </div>

          <div class="mt-5">
            <AppSlideToReveal
              label="Slide to unhide"
              completedLabel="Unhidden"
              hint="Drag the handle all the way to the right"
              @revealed="revealed = true"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { MOH_OPEN_COMPOSER_FROM_ONLYME_KEY } from '~/utils/injection-keys'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Only me',
})

usePageSeo({
  title: 'Only me',
  description: 'Private posts only you can see.',
  canonicalPath: '/only-me',
  noindex: true,
})

const revealed = ref(false)
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const canPost = computed(() => {
  const u = user.value
  if (!u?.id) return false
  return Boolean(u.usernameIsSet && u.birthdate && u.menOnlyConfirmed && Array.isArray(u.interests) && u.interests.length >= 1)
})

const route = useRoute()
const tab = ref<'notes' | 'drafts'>('notes')
const openComposerFromOnlyMe = inject(MOH_OPEN_COMPOSER_FROM_ONLYME_KEY, null)

const notesFeed = useOnlyMePosts()
const notes = notesFeed.posts
const notesNextCursor = notesFeed.nextCursor
const notesLoading = notesFeed.loading
const notesError = notesFeed.error
const refreshNotes = notesFeed.refresh
const loadMoreNotes = notesFeed.loadMore
const removeNote = notesFeed.removePost
const prependNote = notesFeed.prependPost

const draftsFeed = useDraftPosts()
const drafts = draftsFeed.drafts
const draftsNextCursor = draftsFeed.nextCursor
const draftsLoading = draftsFeed.loading
const draftsError = draftsFeed.error
const refreshDrafts = draftsFeed.refresh
const loadMoreDrafts = draftsFeed.loadMore
const removeDraft = draftsFeed.removeDraft
const upsertDraft = draftsFeed.upsertDraft

const draftsLoadedOnce = ref(false)
watch(
  tab,
  (t) => {
    if (t === 'drafts' && !draftsLoadedOnce.value) {
      draftsLoadedOnce.value = true
      void refreshDrafts()
    }
  },
)

function onPosted(payload: { id: string; visibility: import('~/types/api').PostVisibility; post?: import('~/types/api').FeedPost }) {
  // In locked mode, this should always be onlyMe, but keep it defensive.
  if (payload.visibility === 'onlyMe' && payload.post) {
    prependNote(payload.post)
  }
}

if (import.meta.server) {
  await refreshNotes()
} else {
  onMounted(() => {
    // After posting only-me from another page we navigate here with ?posted=1 and prepend; skip refresh to avoid flash.
    if (route.query.posted === '1') {
      navigateTo('/only-me', { replace: true })
      return
    }
    void refreshNotes()
  })
}

// Draft editor (manual save; no autosave)
const draftEditorText = ref('')
const draftEditorId = ref<string | null>(null)
const draftSaving = ref(false)
const draftSavedAt = ref<Date | null>(null)
const draftSaveError = ref<string | null>(null)
const draftDirty = ref(false)

// Register this manual draft editor with the global unsaved-draft guard so route changes can prompt save/discard.
let unregisterDraftEditorGuard: (() => void) | null = null
onMounted(() => {
  if (!import.meta.client) return
  const { register } = useUnsavedDraftGuard()
  unregisterDraftEditorGuard = register({
    id: 'only-me:draft-editor',
    hasUnsaved: () => tab.value === 'drafts' && Boolean(draftDirty.value && (draftEditorText.value ?? '').trim()),
    snapshot: () => ({
      body: String(draftEditorText.value ?? ''),
      media: [],
      draftId: draftEditorId.value,
    }),
    clear: () => {
      draftEditorText.value = ''
      draftEditorId.value = null
      draftSavedAt.value = null
      draftSaveError.value = null
      draftDirty.value = false
    },
  })
})
onBeforeUnmount(() => {
  unregisterDraftEditorGuard?.()
  unregisterDraftEditorGuard = null
})

function startNewDraft() {
  draftEditorText.value = ''
  draftEditorId.value = null
  draftSavedAt.value = null
  draftSaveError.value = null
  draftDirty.value = false
}

function openDraftInEditor(d: FeedPost) {
  tab.value = 'drafts'
  draftEditorId.value = d.id
  draftEditorText.value = d.body ?? ''
  draftSavedAt.value = null
  draftSaveError.value = null
  draftDirty.value = false
}

function postDraft(d: FeedPost) {
  // Uses the main composer modal so visibility + cookie behavior match the Post button.
  openComposerFromOnlyMe?.(d)
}

function onDraftEditorInput() {
  draftDirty.value = true
}

async function saveDraftNow() {
  const body = (draftEditorText.value ?? '').trim()
  if (!draftEditorId.value && !body) return
  draftSaving.value = true
  draftSaveError.value = null
  try {
    if (!draftEditorId.value) {
      const created = await apiFetchData<FeedPost>('/drafts', { method: 'POST', body: { body } })
      draftEditorId.value = created.id
      upsertDraft(created)
    } else {
      const updated = await apiFetchData<FeedPost>(`/drafts/${encodeURIComponent(draftEditorId.value)}`, { method: 'PATCH', body: { body } })
      upsertDraft(updated)
    }
    draftSavedAt.value = new Date()
    draftDirty.value = false
  } catch (e: unknown) {
    draftSaveError.value = getApiErrorMessage(e) || 'Save failed.'
  } finally {
    draftSaving.value = false
  }
}

onMounted(() => {
  revealed.value = false
})

onActivated(() => {
  // If this page is ever cached/kept-alive, still require reveal each time it becomes active.
  revealed.value = false
})
</script>


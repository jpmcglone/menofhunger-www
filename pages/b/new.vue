<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=890-4577 -->
<template>
  <AppPageContent bottom="standard">
    <div class="flex items-center justify-between gap-3 moh-gutter-x pt-3 pb-3 border-b moh-border">
      <div class="flex items-center gap-3">
        <NuxtLink to="/b" class="moh-tap moh-focus inline-flex size-11 items-center justify-center rounded-full moh-surface-hover" aria-label="Back to the Board">
          <AppIconGlyph name="back" :size="20" />
        </NuxtLink>
        <h1 class="text-lg font-bold moh-text">New post</h1>
      </div>
      <ClientOnly>
        <AppComposerVisibilityPicker
          v-if="isVerifiedMember"
          :model-value="visibility"
          :allowed="allowedVisibilities"
          :viewer-is-verified="isVerifiedMember"
          :is-premium="isPremium"
          @update:model-value="setVisibility"
        />
      </ClientOnly>
    </div>

    <ClientOnly>
      <div v-if="!isAuthed || !isVerifiedMember" class="moh-gutter-x py-10">
        <AppAccessGateCard kind="verify" :cta-label="isAuthed ? 'Get verified' : 'Sign in'" :cta-to="isAuthed ? '/settings/verification' : '/login?redirect=/b/new'" />
      </div>

      <form v-else class="moh-gutter-x space-y-4 py-5" @submit.prevent="submit">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium moh-text-muted">Title</span>
          <input
            v-model="title"
            maxlength="80"
            required
            placeholder="Keep it plain and specific"
            class="w-full rounded-xl border moh-border bg-transparent px-3 py-2.5 text-[15px] moh-text outline-none focus:border-[var(--moh-text-muted)]"
          >
          <span class="mt-1 block text-right text-xs moh-text-soft tabular-nums">{{ title.length }} / 80</span>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium moh-text-muted">Link <span class="moh-text-soft">(optional)</span></span>
          <input
            v-model="url"
            type="url"
            inputmode="url"
            placeholder="https://…"
            class="w-full rounded-xl border moh-border bg-transparent px-3 py-2.5 text-[15px] moh-text outline-none focus:border-[var(--moh-text-muted)]"
            @blur="checkDuplicate"
          >
        </label>

        <div v-if="duplicate" class="rounded-xl border moh-border p-4">
          <p class="text-sm font-semibold moh-text">Already on the Board</p>
          <p class="mt-1 text-sm moh-text-muted">Someone posted this link {{ duplicateAge }}. Join that discussion instead?</p>
          <NuxtLink :to="boardThreadHref(duplicate)" class="mt-3 block rounded-lg border moh-border p-3 hover:bg-[var(--moh-surface-hover)]">
            <span class="block text-sm font-semibold moh-text">{{ duplicate.title }}</span>
            <span class="text-xs moh-text-soft">{{ duplicate.points }} points · {{ duplicate.commentCount }} comments</span>
          </NuxtLink>
          <div class="mt-3 flex justify-end gap-2">
            <button type="button" class="moh-tap px-3 text-sm moh-text-muted hover:text-[var(--moh-text)]" @click="duplicate = null">Post anyway</button>
            <Button as="NuxtLink" :to="boardThreadHref(duplicate)" label="Join discussion" rounded size="small" />
          </div>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium moh-text-muted">Text <span class="moh-text-soft">(optional if you add a link)</span></span>
          <textarea
            v-model="body"
            rows="5"
            :maxlength="bodyMax"
            placeholder="Add context, or ask your question"
            class="w-full rounded-xl border moh-border bg-transparent px-3 py-2.5 text-[15px] moh-text outline-none focus:border-[var(--moh-text-muted)]"
          />
          <span class="mt-1 block text-right text-xs moh-text-soft tabular-nums">{{ body.length }} / {{ bodyMax }}</span>
        </label>

        <div class="flex flex-wrap items-start gap-3">
          <div>
            <button
              v-if="!upload.previewUrl.value"
              type="button"
              class="moh-focus inline-flex min-h-11 items-center gap-2 rounded-full border moh-border px-4 text-sm moh-text-muted hover:text-[var(--moh-text)]"
              @click="fileEl?.click()"
            >
              <AppIconGlyph name="image" :size="18" />
              Image
            </button>
            <div v-else class="relative">
              <img :src="upload.previewUrl.value" alt="" class="h-24 w-24 rounded-xl border moh-border object-cover" :class="upload.uploading.value ? 'opacity-60' : ''">
              <button type="button" class="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full moh-surface border moh-border" aria-label="Remove image" @click="upload.clear()">
                <Icon name="tabler:x" class="text-sm" aria-hidden="true" />
              </button>
            </div>
            <p v-if="upload.error.value" class="mt-1 text-xs text-red-500">{{ upload.error.value }}</p>
            <input ref="fileEl" type="file" accept="image/png,image/jpeg,image/webp,image/avif" class="hidden" tabindex="-1" aria-hidden="true" @change="onFile">
          </div>
          <div class="min-w-[14rem] flex-1">
            <AppBoardTagPicker v-model="tags" placeholder="Add up to 3 tags (ask, show, hiring…)" />
          </div>
        </div>

        <div class="flex min-h-11 items-center justify-between gap-3 border-t moh-border pt-4">
          <label for="board-share-to-feed" class="flex-1 cursor-pointer">
            <span class="block text-sm font-semibold moh-text">Also post to feed</span>
            <span class="block text-xs moh-text-muted">Shows as a post your followers can see. Replies open here on the Board.</span>
          </label>
          <ToggleSwitch v-model="showInFeed" input-id="board-share-to-feed" />
        </div>

        <p v-if="submitError" class="text-sm text-red-500">{{ submitError }}</p>

        <div class="flex items-center justify-between gap-3">
          <p class="text-xs moh-text-soft">{{ audienceHint }}</p>
          <AppActionButton label="Post" kind="brand" type="submit" :loading="submitting" :disabled="!canSubmit" />
        </div>
      </form>
      <template #fallback><div class="py-16 text-center moh-meta">Loading…</div></template>
    </ClientOnly>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { BoardThread, BoardVisibility, PostVisibility } from '~/types/api'
import { formatListTime } from '~/utils/time-format'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'app', title: 'New Board post', hideTopBar: true })
usePageSeo({ title: 'New Board post', noindex: true })

const api = useBoardApi()
const { isAuthed, isVerifiedMember, isPremium } = useAuth()
const memory = useVisibilityMemory('board')

const title = ref('')
const url = ref('')
const body = ref('')
const tags = ref<string[]>([])
const showInFeed = ref(true)
const visibility = ref<BoardVisibility>('public')
const submitting = ref(false)
const submitError = ref<string | null>(null)
const duplicate = ref<BoardThread | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)
const upload = useSingleImageUpload()

const bodyMax = computed(() => (isPremium.value ? 1000 : 500))
const allowedVisibilities = computed<PostVisibility[]>(() => (isPremium.value ? ['public', 'verifiedOnly', 'premiumOnly'] : ['public', 'verifiedOnly']))
const canSubmit = computed(() => title.value.trim().length >= 3 && !upload.uploading.value && !submitting.value)
const duplicateAge = computed(() => (duplicate.value ? `${formatListTime(duplicate.value.createdAt)} ago` : ''))
const audienceHint = computed(() => {
  if (visibility.value === 'premiumOnly') return 'Premium members can read and reply.'
  if (visibility.value === 'verifiedOnly') return 'Verified members can read and reply.'
  return 'Anyone can read. Verified members can reply.'
})

function setVisibility(next: PostVisibility) {
  if (next === 'onlyMe') return
  visibility.value = next as BoardVisibility
  memory.remember(next)
}

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) void upload.upload(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function checkDuplicate() {
  const link = url.value.trim()
  if (!link) {
    duplicate.value = null
    return
  }
  try {
    duplicate.value = await api.findDuplicate(link)
  } catch {
    duplicate.value = null
  }
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  submitError.value = null
  try {
    const created = await api.createThread({
      title: title.value.trim(),
      url: url.value.trim() || null,
      body: body.value.trim() || null,
      image: upload.image.value,
      tags: tags.value,
      visibility: visibility.value,
      showInFeed: showInFeed.value,
    })
    memory.remember(visibility.value)
    await navigateTo(boardThreadHref(created))
  } catch (e) {
    submitError.value = getApiErrorMessage(e) || 'Couldn’t publish your post.'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const remembered = memory.hydrate()
  visibility.value = remembered === 'premiumOnly' && !isPremium.value ? 'public' : remembered
  if (!isAuthed.value) return
  try {
    const prefs = await api.getPreferences()
    showInFeed.value = prefs.shareToFeedDefault
  } catch {
    // Keep the default (on).
  }
})
</script>

<template>
  <div class="-mx-4">
    <!-- Composer -->
    <div class="border-b border-gray-200 px-4 py-4 dark:border-zinc-800">
      <div v-if="canPost" class="flex gap-3">
        <NuxtLink
          v-if="myProfilePath"
          :to="myProfilePath"
          class="group h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800 relative"
          aria-label="View your profile"
        >
          <img
            v-if="meAvatarUrl"
            :src="meAvatarUrl"
            alt=""
            class="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
            loading="lazy"
            decoding="async"
          >
          <div v-else class="h-full w-full" aria-hidden="true" />
        </NuxtLink>
        <div
          v-else
          class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800"
          aria-hidden="true"
        >
          <img
            v-if="meAvatarUrl"
            :src="meAvatarUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          >
        </div>
        <div class="min-w-0 flex-1">
          <Textarea
            v-model="draft"
            autoResize
            rows="3"
            class="w-full"
            placeholder="What’s happening?"
            :maxlength="postMaxLen"
          />
          <div class="mt-3 flex items-center justify-between">
            <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Button icon="pi pi-image" text rounded severity="secondary" aria-label="Media" />
              <Button icon="pi pi-face-smile" text rounded severity="secondary" aria-label="Emoji" />
              <Button icon="pi pi-map-marker" text rounded severity="secondary" aria-label="Location" />
            </div>
            <div class="flex items-center gap-2">
              <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {{ postCharCount }}/{{ postMaxLen }}
              </div>
              <Select
                v-model="visibility"
                :options="visibilityOptions"
                optionLabel="label"
                optionValue="value"
                class="w-44"
              />
              <Button
                label="Post"
                rounded
                :disabled="submitting || !draft.trim() || postCharCount > postMaxLen"
                :loading="submitting"
                @click="submit"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="isAuthed" class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div class="font-semibold text-gray-900 dark:text-gray-50">Verified members only</div>
        <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          You’ll be able to post once your account is verified.
        </div>
      </div>

      <button
        v-else
        type="button"
        class="w-full text-left rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40"
        @click="goLogin"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="font-semibold text-gray-900 dark:text-gray-50">Log in to post</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
              Join the conversation and share updates with the brotherhood.
            </div>
          </div>
          <i class="pi pi-angle-right text-gray-500 dark:text-gray-400" aria-hidden="true" />
        </div>
      </button>
    </div>

    <!-- Posts -->
    <div>
      <AppInlineAlert v-if="error" class="mx-4 mt-4" severity="danger">
        {{ error }}
      </AppInlineAlert>

      <div
        v-for="p in posts"
        :key="p.id"
      >
        <AppPostRow :post="p" />
      </div>

      <div v-if="nextCursor" class="px-4 py-6 flex justify-center">
        <Button
          label="Load more"
          severity="secondary"
          rounded
          :loading="loading"
          :disabled="loading"
          @click="loadMore"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PostVisibility } from '~/types/api'

definePageMeta({
  layout: 'app',
  title: 'Home'
})

usePageSeo({
  title: 'Home',
  description: 'Your Men of Hunger feed — posts are shown in simple chronological order.'
})

const { posts, nextCursor, loading, error, refresh, loadMore, addPost } = useWallPosts()
const draft = ref('')
const { user } = useAuth()
const { assetUrl } = useAssets()
const isAuthed = computed(() => Boolean(user.value?.id))
const isVerified = computed(() => user.value?.verifiedStatus && user.value.verifiedStatus !== 'none')
const canPost = computed(() => Boolean(isAuthed.value && isVerified.value))
const isPremium = computed(() => Boolean(user.value?.premium))

const myProfilePath = computed(() => {
  const username = (user.value?.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const postMaxLen = computed(() => (isPremium.value ? 500 : 200))
const postCharCount = computed(() => draft.value.length)

const meAvatarUrl = computed(() => {
  const base = assetUrl(user.value?.avatarKey)
  if (!base) return null
  const v = user.value?.avatarUpdatedAt || ''
  return v ? `${base}?v=${encodeURIComponent(v)}` : base
})

const visibility = ref<PostVisibility>('public')
const visibilityOptions = computed(() => {
  const canUsePremium = Boolean(user.value?.premium)
  const base: Array<{ label: string; value: PostVisibility }> = [
    { label: 'Public', value: 'public' },
    { label: 'Verified only', value: 'verifiedOnly' }
  ]
  if (canUsePremium) base.push({ label: 'Premium only', value: 'premiumOnly' })
  return base
})

watch(
  visibilityOptions,
  (opts) => {
    const allowed = new Set(opts.map((x) => x.value))
    if (!allowed.has(visibility.value)) visibility.value = 'public'
  },
  { immediate: true }
)

const submitting = ref(false)

if (import.meta.server) {
  await refresh()
} else {
  onMounted(() => void refresh())
}

const submit = async () => {
  if (!canPost.value) return
  if (submitting.value) return
  if (postCharCount.value > postMaxLen.value) return
  submitting.value = true
  try {
    await addPost(draft.value, visibility.value)
    draft.value = ''
    visibility.value = 'public'
  } finally {
    submitting.value = false
  }
}

const goLogin = () => {
  const redirect = encodeURIComponent('/home')
  return navigateTo(`/login?redirect=${redirect}`)
}
</script>


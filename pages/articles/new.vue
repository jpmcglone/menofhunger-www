<template>
  <div>
    <div v-if="checkingAccess" class="flex min-h-screen items-center justify-center">
      <Icon name="tabler:loader-2" class="animate-spin text-2xl text-gray-400" aria-hidden="true" />
    </div>
    <AppArticleEditorPage v-else :article="null" @created="onDraftCreated" />
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'

definePageMeta({ layout: 'app', title: 'New Article', hideTopBar: true, ssr: false })

usePageSeo({ title: 'New Article', noindex: true })

const { isVerifiedMember, ensureLoaded } = useAuth()

const checkingAccess = ref(true)

onMounted(async () => {
  await ensureLoaded()
  if (!isVerifiedMember.value) {
    await navigateTo('/articles', { replace: true })
    return
  }
  checkingAccess.value = false
})

// The editor creates the draft row on its first real content, not on mount. Swap the URL
// in place so a refresh lands on the saved article; a router navigation would remount the
// editor and drop the caret mid-sentence.
function onDraftCreated(article: Article) {
  window.history.replaceState(window.history.state, '', `/articles/edit/${article.id}`)
}
</script>

<template>
  <AppPageContent bottom="standard">
    <p class="moh-gutter-x py-6 text-sm moh-text-muted">
      Opening Men of Hunger…
    </p>
  </AppPageContent>
</template>

<script setup lang="ts">
import { composeShareText } from '~/utils/share-text'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'

definePageMeta({
  layout: 'app',
  ssr: false,
  title: 'Share',
  hideTopBar: true,
})

usePageSeo({
  title: 'Share',
  description: 'Share into Men of Hunger.',
  canonicalPath: '/share',
  noindex: true,
})

const route = useRoute()
const openComposer = inject(MOH_OPEN_COMPOSER_KEY, null)
const sendViaChat = useSendViaChat()
const { load } = useShareDestination()

function queryValue(name: string): string {
  const raw = route.query[name]
  return typeof raw === 'string' ? raw : ''
}

function filesFromInbox(files: Array<{ name: string; type: string; data: string }>): File[] {
  return files.flatMap((file) => {
    try {
      const binary = atob(file.data)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      return [new File([bytes], file.name || 'image.jpg', { type: file.type || 'image/jpeg' })]
    } catch {
      return []
    }
  })
}

onMounted(async () => {
  const title = queryValue('title')
  const text = queryValue('text')
  const url = queryValue('url')
  let files: File[] = []
  const inboxId = queryValue('inbox')
  if (inboxId) {
    try {
      const inbox = await $fetch<{
        files?: Array<{ name: string; type: string; data: string }>
      }>(`/api/share-inbox/${encodeURIComponent(inboxId)}`)
      files = filesFromInbox(inbox?.files ?? [])
    } catch {
      files = []
    }
  }

  const initialText = composeShareText({ title, text, url })
  const destination = load()
  if (destination.kind === 'chat') {
    sendViaChat.openShare({ body: initialText, files })
  } else {
    openComposer?.({
      initialText,
      initialFiles: files,
      communityGroupId: destination.kind === 'group' ? destination.groupId : undefined,
      visibility: destination.kind === 'feed' ? destination.visibility : undefined,
    })
  }
  await navigateTo('/home', { replace: true })
})
</script>

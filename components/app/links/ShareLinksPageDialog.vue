<template>
  <AppModal
    :model-value="modelValue"
    title="Share your links page"
    subtitle="Anyone can open it. No sign-in needed."
    max-width-class="max-w-[28rem]"
    body-class="p-4"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <div class="mx-auto w-[220px] rounded-3xl bg-[#FBFAF7] p-4 text-center shadow-sm ring-1 ring-black/5">
        <svg
          v-if="qr"
          :viewBox="`0 0 ${qr.size} ${qr.size}`"
          class="block h-auto w-full text-[#0F1113]"
          role="img"
          :aria-label="`QR code for ${displayUrl}`"
          shape-rendering="crispEdges"
        >
          <path :d="qr.path" fill="currentColor" />
        </svg>
        <p class="mt-2 truncate text-xs font-semibold text-[#0F1113]">@{{ username }} · {{ siteName }}</p>
      </div>

      <div class="flex min-h-11 items-center gap-2 rounded-xl border moh-border bg-[var(--moh-surface)] pl-3 pr-1">
        <span class="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-900 dark:text-gray-50">{{ displayUrl }}</span>
        <Button
          type="button"
          text
          rounded
          severity="secondary"
          class="!size-11 shrink-0"
          aria-label="Copy link"
          @click="copyLink"
        >
          <Icon :name="copied ? 'tabler:check' : 'tabler:copy'" class="text-xl" aria-hidden="true" />
        </Button>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <Button label="Save QR code" severity="secondary" rounded class="min-h-11" :disabled="!qr" @click="saveQr" />
        <Button label="Share…" rounded class="min-h-11" @click="shareLink" />
      </div>

      <div>
        <p class="mb-2 text-sm font-semibold moh-text-muted">When shared on X, iMessage or Instagram</p>
        <div class="overflow-hidden rounded-xl border moh-border bg-[var(--moh-surface)]">
          <img
            v-if="!previewFailed"
            :src="ogImagePath"
            alt=""
            class="aspect-[1200/630] w-full bg-black/5 object-cover dark:bg-white/5"
            loading="lazy"
            decoding="async"
            @error="previewFailed = true"
          >
          <div class="space-y-0.5 px-3 py-2.5">
            <p class="text-xs moh-text-muted">{{ host }}</p>
            <p class="truncate text-[15px] font-semibold text-gray-900 dark:text-gray-50">{{ previewTitle }}</p>
            <p class="line-clamp-2 text-sm moh-text-muted">{{ previewDescription }}</p>
          </div>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { encode } from 'uqr'
import { siteConfig } from '~/config/site'
import { buildQrPath, renderQrPng } from '~/utils/qr-code'
import { linksPageOgImagePath, linksPagePath } from '~/utils/profile-link-icons'

const props = defineProps<{
  modelValue: boolean
  username: string
  name?: string | null
  bio?: string | null
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const toast = useAppToast()
const { copyText } = useCopyToClipboard()
const { share } = useWebShare()

const siteName = siteConfig.name
const host = new URL(siteConfig.url).host
const path = computed(() => linksPagePath(props.username))
const url = computed(() => `${siteConfig.url}${path.value}`)
const displayUrl = computed(() => `${host}${path.value}`)
const ogImagePath = computed(() => linksPageOgImagePath(props.username))

const previewFailed = ref(false)
watch(() => props.username, () => { previewFailed.value = false })

const previewTitle = computed(() => `${props.name?.trim() || `@${props.username}`} (@${props.username}) · Links`)
const previewDescription = computed(() => props.bio?.trim() || `Links from @${props.username} on ${siteName}.`)

const qr = computed(() => {
  const { data, size } = encode(url.value, { ecc: 'M', border: 0 })
  return { size, path: buildQrPath(data), data }
})

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null
async function copyLink() {
  try {
    await copyText(url.value)
    copied.value = true
    toast.push({ title: 'Link copied', tone: 'success', durationMs: 1400 })
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 1600)
  } catch (e) {
    toast.pushError(e, 'Could not copy link.')
  }
}
onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})

async function shareLink() {
  await share({ title: previewTitle.value, text: `My links on ${siteName}`, url: url.value })
}

async function saveQr() {
  const current = qr.value
  if (!current) return
  try {
    const blob = await renderQrPng({ data: current.data, caption: `@${props.username} · ${siteName}` })
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `${props.username}-links-qr.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
  } catch (e) {
    toast.pushError(e, 'Could not save the QR code.')
  }
}
</script>

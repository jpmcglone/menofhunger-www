<template>
  <AppPageContent bottom="standard">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" :title="headerTitle">
      <template #leading>
        <Button as="NuxtLink" to="/admin/newsletters" text severity="secondary" aria-label="Back">
          <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
        </Button>
      </template>
    </AppPageHeader>

    <div v-if="error" class="px-4 pt-4">
      <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
    </div>

    <div class="px-4 py-4 space-y-6">
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-4 min-w-0">
          <div class="space-y-2">
            <label class="text-sm font-medium moh-text" for="newsletter-subject">Subject</label>
            <InputText id="newsletter-subject" v-model="subject" class="w-full" maxlength="200" :disabled="locked" />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium moh-text" for="newsletter-preheader">Preheader</label>
            <InputText
              id="newsletter-preheader"
              v-model="preheader"
              class="w-full"
              maxlength="200"
              placeholder="Optional inbox preview"
              :disabled="locked"
            />
          </div>

          <div class="space-y-2">
            <div class="text-sm font-medium moh-text">Body</div>
            <AdminNewsletterEditor v-model="bodyJson" :disabled="locked" />
          </div>

          <div class="space-y-2">
            <div class="text-sm font-medium moh-text">Hero image</div>
            <p class="text-xs moh-text-muted">Optional banner at the top. Use the photo button in the body for inline images.</p>
            <div v-if="imagePreviewUrl" class="overflow-hidden rounded-xl border moh-border">
              <img :src="imagePreviewUrl" alt="" class="aspect-video w-full object-cover">
            </div>
            <div v-if="!locked" class="flex flex-wrap gap-2">
              <Button label="Upload 16:9" size="small" severity="secondary" :loading="uploading" @click="openFilePicker" />
              <Button v-if="imageKey || imagePreviewUrl" label="Remove" size="small" text severity="danger" @click="clearImage" />
            </div>
            <input
              ref="fileInputEl"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="onFileChange"
            >
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-2">
              <label class="text-sm font-medium moh-text" for="newsletter-cta-label">Button label</label>
              <InputText id="newsletter-cta-label" v-model="ctaLabel" class="w-full" maxlength="40" placeholder="Optional" :disabled="locked" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium moh-text" for="newsletter-cta-href">Button link</label>
              <InputText id="newsletter-cta-href" v-model="ctaHref" class="w-full" maxlength="500" placeholder="/path or https://" :disabled="locked" />
            </div>
          </div>

          <div v-if="!locked" class="space-y-2">
            <label class="text-sm font-medium moh-text" for="newsletter-schedule">Schedule</label>
            <InputText id="newsletter-schedule" v-model="scheduledAtLocal" type="datetime-local" class="w-full" />
          </div>
        </div>

        <div class="space-y-2 min-w-0">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-sm font-medium moh-text">Preview</div>
            <Button
              label="Email this to me"
              size="small"
              severity="secondary"
              :loading="previewSending"
              :disabled="!saved || previewSending"
              @click="sendPreview"
            />
          </div>
          <p class="text-xs moh-text-muted">Sends only to your inbox. Subject starts with Preview —</p>
          <div class="rounded-xl border moh-border overflow-hidden moh-bg min-h-[20rem]">
            <iframe
              v-if="previewHtml"
              title="Newsletter preview"
              class="w-full h-[32rem] border-0 moh-bg"
              sandbox="allow-same-origin"
              :srcdoc="previewHtml"
            />
            <div v-else class="px-4 py-8 text-sm moh-text-muted">Preview will appear here.</div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <div class="text-sm font-medium moh-text">Who gets this</div>
          <div class="text-xs moh-text-muted">Always requires a confirmed email. Filters stack.</div>
        </div>
        <AdminNewsletterAudienceFilters v-model:filters="audienceFilters" :locked="locked" />
        <div class="moh-meta tabular-nums">{{ audienceLine }}</div>
      </div>

      <div v-if="saved?.status === 'scheduled' && saved.scheduledAt" class="text-sm moh-text-muted">
        Scheduled for {{ formatWhen(saved.scheduledAt) }}.
      </div>

      <div class="flex flex-wrap gap-2">
        <template v-if="!locked">
          <Button label="Save" :loading="saving" :disabled="saving" @click="save" />
          <Button label="Schedule" severity="secondary" :loading="scheduling" :disabled="!saved || !scheduledAtLocal" @click="schedule" />
          <Button v-if="saved?.status === 'scheduled'" label="Unschedule" text severity="secondary" :loading="scheduling" @click="unschedule" />
          <Button label="Send now" :disabled="!saved" @click="confirmSendOpen = true" />
        </template>
        <Button v-else label="Duplicate as draft" severity="secondary" :loading="duplicating" @click="duplicate" />
      </div>
    </div>

    <AppConfirmDialog
      v-model:visible="confirmSendOpen"
      header="Send this letter?"
      :message="sendConfirmMessage"
      cancel-label="Not now"
      confirm-label="Send now"
      confirm-severity="danger"
      :loading="sending"
      @confirm="sendNow"
    />

    <AppArticleThumbnailCropDialog
      v-model="cropOpen"
      header="Crop hero image"
      :file="cropFile"
      :disabled="uploading"
      @cancel="cropOpen = false"
      @cropped="onCropped"
    />
  </AppPageContent>
</template>

<script setup lang="ts">
import type { NewsletterAdmin, NewsletterAudienceCount, NewsletterAudienceFilter, NewsletterPreview } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
import { summarizeAudienceFilters } from '~/utils/newsletter-audience'

definePageMeta({
  layout: 'app',
  middleware: 'admin',
  ssr: false,
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const toast = useAppToast()

const subject = ref('')
const preheader = ref('')
const bodyJson = ref('')
const ctaLabel = ref('')
const ctaHref = ref('')
const imageKey = ref<string | null>(null)
const imagePreviewUrl = ref<string | null>(null)
const saved = ref<NewsletterAdmin | null>(null)
const previewHtml = ref('')
const error = ref('')
const saving = ref(false)
const sending = ref(false)
const scheduling = ref(false)
const previewSending = ref(false)
const duplicating = ref(false)
const uploading = ref(false)
const confirmSendOpen = ref(false)
const scheduledAtLocal = ref('')
const audienceFilters = ref<NewsletterAudienceFilter[]>([])
const liveEligibleCount = ref<number | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)
const cropOpen = ref(false)
const cropFile = ref<File | null>(null)

const locked = computed(() => saved.value?.status === 'sending' || saved.value?.status === 'sent')
const headerTitle = computed(() => subject.value.trim() || 'Newsletter')
const confirmedCount = computed(() => saved.value?.confirmedEmailCount ?? 0)
const audienceCount = computed(() => {
  if (!saved.value) return liveEligibleCount.value ?? 0
  if (saved.value.status === 'sending' || saved.value.status === 'sent') return saved.value.eligibleCount
  return liveEligibleCount.value ?? saved.value.eligibleCount
})
const audienceSummary = computed(() => summarizeAudienceFilters(audienceFilters.value))

const audienceLine = computed(() => {
  const count = audienceCount.value
  const of = confirmedCount.value
  const extra = audienceFilters.value.length ? ` · ${audienceSummary.value}` : ''
  if (saved.value?.status === 'sent') return `Sent to ${saved.value.sentCount} of ${count} members with a confirmed email.${extra}`
  if (saved.value?.status === 'sending') return `Sending to ${count} of ${of} members with a confirmed email · ${saved.value.sentCount} sent.${extra}`
  return `Sends to ${count} of ${of} members with a confirmed email.${extra}`
})

const sendConfirmMessage = computed(() => {
  const count = audienceCount.value
  const extra = audienceFilters.value.length ? ` (${audienceSummary.value})` : ''
  const base = `Send to ${count} members with a confirmed email${extra}? This cannot be undone.`
  if (count < 250) return base
  return `${base} Large first blasts can land in spam. If this domain is new to newsletters, send a smaller test first.`
})

usePageSeo({
  title: 'Admin Newsletter',
  description: 'Write and send the lodge letter.',
  canonicalPath: `/admin/newsletters/${String(route.params.id)}`,
  noindex: true,
})

function formatWhen(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function apply(row: NewsletterAdmin) {
  saved.value = row
  subject.value = row.subject
  preheader.value = row.preheader
  bodyJson.value = row.bodyJson
  ctaLabel.value = row.ctaLabel ?? ''
  ctaHref.value = row.ctaHref ?? ''
  imageKey.value = row.imageKey
  imagePreviewUrl.value = row.imageUrl
  scheduledAtLocal.value = toLocalInput(row.scheduledAt)
  audienceFilters.value = row.audienceFilters ?? []
  liveEligibleCount.value = row.eligibleCount
}

function writeBody() {
  return {
    subject: subject.value.trim(),
    preheader: preheader.value.trim(),
    bodyJson: bodyJson.value,
    ctaLabel: ctaLabel.value.trim() || null,
    ctaHref: ctaHref.value.trim() || null,
    imageKey: imageKey.value,
    audienceFilters: audienceFilters.value,
  }
}

async function load() {
  error.value = ''
  try {
    apply(await apiFetchData<NewsletterAdmin>(`/admin/newsletters/${route.params.id}`))
    await refreshPreview()
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to load newsletter.')
  }
}

async function save(): Promise<boolean> {
  if (!saved.value) return false
  if (locked.value) return true
  saving.value = true
  error.value = ''
  try {
    apply(await apiFetchData<NewsletterAdmin>(`/admin/newsletters/${saved.value.id}`, {
      method: 'PATCH',
      body: writeBody(),
    }))
    return true
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to save newsletter.')
    return false
  } finally {
    saving.value = false
  }
}

async function refreshPreview() {
  try {
    const preview = await apiFetchData<NewsletterPreview>('/admin/newsletters/preview', {
      method: 'POST',
      body: writeBody(),
    })
    previewHtml.value = preview.html
  } catch {
    // Keep the last good preview; the save/send paths surface errors.
  }
}

async function sendPreview() {
  if (!saved.value) return
  if (!(await save())) return
  previewSending.value = true
  error.value = ''
  try {
    await apiFetchData<{ sent: boolean; reason: string | null }>(`/admin/newsletters/${saved.value.id}/preview-send`, {
      method: 'POST',
    })
    toast.push({ title: 'Sent to your inbox.', tone: 'success', durationMs: 2800 })
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to send preview.')
  } finally {
    previewSending.value = false
  }
}

async function sendNow() {
  if (!saved.value) return
  if (!(await save())) return
  sending.value = true
  error.value = ''
  try {
    apply(await apiFetchData<NewsletterAdmin>(`/admin/newsletters/${saved.value.id}/send`, { method: 'POST' }))
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to send newsletter.')
  } finally {
    sending.value = false
  }
}

async function schedule() {
  if (!saved.value || !scheduledAtLocal.value) return
  if (!(await save())) return
  scheduling.value = true
  error.value = ''
  try {
    apply(await apiFetchData<NewsletterAdmin>(`/admin/newsletters/${saved.value.id}/schedule`, {
      method: 'POST',
      body: { scheduledAt: new Date(scheduledAtLocal.value).toISOString() },
    }))
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to schedule newsletter.')
  } finally {
    scheduling.value = false
  }
}

async function unschedule() {
  if (!saved.value) return
  scheduling.value = true
  error.value = ''
  try {
    apply(await apiFetchData<NewsletterAdmin>(`/admin/newsletters/${saved.value.id}/unschedule`, { method: 'POST' }))
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to unschedule.')
  } finally {
    scheduling.value = false
  }
}

async function duplicate() {
  if (!saved.value) return
  duplicating.value = true
  error.value = ''
  try {
    const copy = await apiFetchData<NewsletterAdmin>(`/admin/newsletters/${saved.value.id}/duplicate`, { method: 'POST' })
    await navigateTo(`/admin/newsletters/${copy.id}`)
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to duplicate.')
  } finally {
    duplicating.value = false
  }
}

function openFilePicker() {
  fileInputEl.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  cropFile.value = file
  cropOpen.value = true
}

function clearImage() {
  imageKey.value = null
  imagePreviewUrl.value = null
}

async function onCropped(file: File) {
  cropOpen.value = false
  uploading.value = true
  error.value = ''
  try {
    const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string> }>(
      '/uploads/announcement-image/init',
      { method: 'POST', body: { contentType: file.type || 'image/jpeg' } },
    )
    const uploadRes = await fetch(init.uploadUrl, { method: 'PUT', body: file, headers: init.headers ?? {} })
    if (!uploadRes.ok) throw new Error('Upload failed.')
    const commit = await apiFetchData<{ key: string }>('/uploads/announcement-image/commit', {
      method: 'POST',
      body: { key: init.key },
    })
    imageKey.value = commit.key
    imagePreviewUrl.value = URL.createObjectURL(file)
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Image upload failed.')
  } finally {
    uploading.value = false
    cropFile.value = null
  }
}

let previewTimer: ReturnType<typeof setTimeout> | null = null
watch([subject, preheader, bodyJson, ctaLabel, ctaHref, imageKey], () => {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    void refreshPreview()
  }, 400)
})

let countTimer: ReturnType<typeof setTimeout> | null = null
async function refreshAudienceCount() {
  if (locked.value) return
  try {
    const counts = await apiFetchData<NewsletterAudienceCount>('/admin/newsletters/audience-count', {
      method: 'POST',
      body: { audienceFilters: audienceFilters.value },
    })
    liveEligibleCount.value = counts.eligibleCount
    if (saved.value) saved.value = { ...saved.value, confirmedEmailCount: counts.confirmedEmailCount }
  } catch {
    // Keep the last saved count; send/save surfaces errors.
  }
}

watch(audienceFilters, () => {
  if (countTimer) clearTimeout(countTimer)
  countTimer = setTimeout(() => {
    void refreshAudienceCount()
  }, 300)
}, { deep: true })

onMounted(() => {
  void load()
})
</script>

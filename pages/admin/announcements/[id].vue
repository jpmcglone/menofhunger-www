<template>
  <AppPageContent bottom="standard">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" :title="isNew ? 'New announcement' : 'Edit announcement'">
      <template #leading>
        <Button as="NuxtLink" to="/admin/announcements" text severity="secondary" aria-label="Back">
          <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
        </Button>
      </template>
    </AppPageHeader>

    <div v-if="error" class="px-4 py-4">
      <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
    </div>

    <div v-else class="px-4 py-4 space-y-6 max-w-xl">
      <div class="space-y-2">
        <label class="text-sm font-medium moh-text" for="announcement-title">Title</label>
        <InputText id="announcement-title" v-model="title" class="w-full" maxlength="120" />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium moh-text" for="announcement-body">Body</label>
        <Textarea id="announcement-body" v-model="body" class="w-full" rows="4" maxlength="2000" auto-resize />
      </div>

      <div class="space-y-2">
        <div class="text-sm font-medium moh-text">Hero image</div>
        <div v-if="imagePreviewUrl" class="overflow-hidden rounded-xl border moh-border">
          <img :src="imagePreviewUrl" alt="" class="aspect-video w-full object-cover">
        </div>
        <div class="flex flex-wrap gap-2">
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
          <label class="text-sm font-medium moh-text" for="announcement-cta-label">Button label</label>
          <InputText id="announcement-cta-label" v-model="ctaLabel" class="w-full" maxlength="40" placeholder="Optional" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium moh-text" for="announcement-cta-href">Button link</label>
          <InputText id="announcement-cta-href" v-model="ctaHref" class="w-full" maxlength="500" placeholder="/path or https://" />
        </div>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-semibold moh-text">This is an ad</div>
          <div class="text-xs moh-text-muted">Each lodge notice shows once a day. Each ad shows once every 12 hours. Premium members never see ads.</div>
        </div>
        <Checkbox v-model="isAd" binary />
      </div>

      <div class="space-y-2">
        <div class="text-sm font-medium moh-text">Placement</div>
        <div class="flex flex-col gap-2">
          <label class="flex items-start gap-2 text-sm moh-text">
            <input v-model="placement" type="radio" value="overlay" class="mt-1">
            <span>
              <span class="font-medium">Overlay</span>
              <span class="block text-xs moh-text-muted">Modal over the app.</span>
            </span>
          </label>
          <label class="flex items-start gap-2 text-sm moh-text">
            <input v-model="placement" type="radio" value="inline" class="mt-1">
            <span>
              <span class="font-medium">Inline</span>
              <span class="block text-xs moh-text-muted">Card at the top of Home.</span>
            </span>
          </label>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium moh-text" for="announcement-ends">Ends</label>
        <InputText id="announcement-ends" v-model="endsAtLocal" type="datetime-local" class="w-full" />
      </div>

      <div v-if="saved" class="rounded-xl border moh-border p-3 moh-meta space-y-1">
        <div>{{ saved.stats.uniquePeople }} unique people</div>
        <div>{{ saved.stats.totalViews }} views · {{ saved.stats.clicks }} clicks · {{ saved.stats.abandoned }} abandoned</div>
        <div>Reset views makes this new again for everyone.</div>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button label="Save" :loading="saving" :disabled="saving || !canSave" @click="save" />
        <Button label="Preview" severity="secondary" :disabled="!canSave" @click="preview" />
        <Button
          v-if="saved"
          label="Reset views"
          text
          severity="secondary"
          :loading="resetting"
          @click="resetViews"
        />
        <Button
          v-if="saved && saved.status !== 'published'"
          label="Publish"
          severity="secondary"
          :loading="publishing"
          @click="publish"
        />
        <Button
          v-if="saved?.status === 'published'"
          label="Unpublish"
          text
          severity="secondary"
          :loading="publishing"
          @click="unpublish"
        />
      </div>
    </div>

    <AppArticleThumbnailCropDialog
      v-model="cropOpen"
      :file="cropFile"
      :disabled="uploading"
      @cancel="cropOpen = false"
      @cropped="onCropped"
    />
  </AppPageContent>
</template>

<script setup lang="ts">
import type { Announcement, AnnouncementAdmin, AnnouncementPlacement } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  middleware: 'admin',
  ssr: false,
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const { showPreview } = useAnnouncements()

const isNew = computed(() => route.params.id === 'new')
const title = ref('')
const body = ref('')
const isAd = ref(false)
const placement = ref<AnnouncementPlacement>('overlay')
const ctaLabel = ref('')
const ctaHref = ref('')
const endsAtLocal = ref('')
const imageKey = ref<string | null>(null)
const imagePreviewUrl = ref<string | null>(null)
const saved = ref<AnnouncementAdmin | null>(null)
const error = ref('')
const saving = ref(false)
const publishing = ref(false)
const resetting = ref(false)
const canSave = computed(() => Boolean(title.value.trim() || body.value.trim() || imageKey.value || imagePreviewUrl.value))
const uploading = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)
const cropOpen = ref(false)
const cropFile = ref<File | null>(null)

usePageSeo({
  title: 'Admin Announcement',
  description: 'Edit a lodge announcement.',
  canonicalPath: `/admin/announcements/${String(route.params.id)}`,
  noindex: true,
})

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function apply(row: AnnouncementAdmin) {
  saved.value = row
  title.value = row.title
  body.value = row.body ?? ''
  isAd.value = row.isAd
  placement.value = row.placement ?? 'overlay'
  ctaLabel.value = row.ctaLabel ?? ''
  ctaHref.value = row.ctaHref ?? ''
  endsAtLocal.value = toLocalInput(row.endsAt)
  imageKey.value = row.imageKey
  imagePreviewUrl.value = row.imageUrl
}

function draftAnnouncement(): Announcement {
  return {
    id: saved.value?.id ?? 'preview',
    isAd: isAd.value,
    placement: placement.value,
    title: title.value.trim(),
    body: body.value.trim() || null,
    imageUrl: imagePreviewUrl.value,
    ctaLabel: ctaLabel.value.trim() || null,
    ctaHref: ctaHref.value.trim() || null,
  }
}

function writeBody() {
  return {
    title: title.value.trim(),
    body: body.value.trim() || null,
    isAd: isAd.value,
    placement: placement.value,
    ctaLabel: ctaLabel.value.trim() || null,
    ctaHref: ctaHref.value.trim() || null,
    endsAt: endsAtLocal.value ? new Date(endsAtLocal.value).toISOString() : null,
    imageKey: imageKey.value,
  }
}

async function load() {
  if (isNew.value) return
  error.value = ''
  try {
    apply(await apiFetchData<AnnouncementAdmin>(`/admin/announcements/${route.params.id}`))
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to load announcement.')
  }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (isNew.value) {
      const created = await apiFetchData<AnnouncementAdmin>('/admin/announcements', {
        method: 'POST',
        body: writeBody(),
      })
      apply(created)
      await navigateTo(`/admin/announcements/${created.id}`, { replace: true })
    } else {
      apply(await apiFetchData<AnnouncementAdmin>(`/admin/announcements/${route.params.id}`, {
        method: 'PATCH',
        body: writeBody(),
      }))
    }
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to save announcement.')
  } finally {
    saving.value = false
  }
}

async function publish() {
  if (!saved.value) {
    await save()
  }
  if (!saved.value) return
  publishing.value = true
  error.value = ''
  try {
    apply(await apiFetchData<AnnouncementAdmin>(`/admin/announcements/${saved.value.id}/publish`, {
      method: 'POST',
    }))
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to publish.')
  } finally {
    publishing.value = false
  }
}

async function resetViews() {
  if (!saved.value) return
  resetting.value = true
  error.value = ''
  try {
    apply(await apiFetchData<AnnouncementAdmin>(`/admin/announcements/${saved.value.id}/reset`, {
      method: 'POST',
    }))
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to reset views.')
  } finally {
    resetting.value = false
  }
}

async function unpublish() {
  if (!saved.value) return
  publishing.value = true
  error.value = ''
  try {
    apply(await apiFetchData<AnnouncementAdmin>(`/admin/announcements/${saved.value.id}/unpublish`, {
      method: 'POST',
    }))
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to unpublish.')
  } finally {
    publishing.value = false
  }
}

function preview() {
  showPreview(draftAnnouncement())
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

onMounted(() => {
  void load()
})
</script>

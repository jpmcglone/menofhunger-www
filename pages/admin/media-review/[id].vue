<template>
  <AppPageContent bottom="standard">
    <div class="space-y-4 px-4 py-4">
      <nav class="flex flex-wrap items-center gap-1.5 text-sm moh-text-muted" aria-label="Breadcrumb">
        <NuxtLink to="/admin/media-review" class="moh-focus rounded hover:underline">Media review</NuxtLink>
        <template v-if="context.group">
          <span aria-hidden="true">›</span>
          <NuxtLink :to="`/groups/${encodeURIComponent(context.group.slug)}`" class="moh-focus rounded hover:underline">{{ context.group.name }}</NuxtLink>
        </template>
        <template v-if="context.channel">
          <span aria-hidden="true">›</span>
          <NuxtLink :to="context.channel.to" class="moh-focus rounded font-semibold moh-text hover:underline">#{{ context.channel.name }}</NuxtLink>
        </template>
      </nav>

      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold moh-text">{{ title }}</h1>
          <p v-if="subtitle" class="mt-1 text-sm moh-text-muted">{{ subtitle }}</p>
        </div>
        <Button label="Delete from storage" severity="danger" :disabled="Boolean(data?.asset.deletedAt) || loading || !data || hasPublications" @click="openDelete = true">
          <template #icon><Icon name="tabler:trash" aria-hidden="true" /></template>
        </Button>
      </div>

      <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>
      <div v-else-if="loading && !data" class="text-sm moh-text-muted">Loading…</div>

      <template v-else-if="data">
        <div class="flex items-start gap-3 rounded-2xl p-3.5 text-sm" :class="status.class" role="status">
          <span class="mt-px shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide dark:bg-black/30">{{ status.label }}</span>
          <span>{{ status.text }}</span>
        </div>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div class="space-y-4">
            <div class="overflow-hidden rounded-2xl border moh-border moh-surface">
              <video v-if="data.asset.kind === 'video' && data.asset.publicUrl" :src="data.asset.publicUrl" class="block max-h-[70vh] w-full bg-black object-contain" controls playsinline preload="metadata" aria-label="Video" />
              <img v-else-if="data.asset.publicUrl" :src="data.asset.publicUrl" class="block max-h-[70vh] w-full bg-black/5 object-contain dark:bg-white/5" alt="" loading="lazy" decoding="async">
              <div v-else class="flex h-[20rem] flex-col items-center justify-center gap-1 bg-neutral-900 px-6 text-center">
                <Icon :name="isProtected ? 'tabler:lock' : 'tabler:photo-off'" class="text-2xl text-white/70" aria-hidden="true" />
                <div class="font-semibold text-white">{{ isProtected ? 'Protected channel media' : data.asset.deletedAt ? 'Deleted' : 'No preview' }}</div>
                <p v-if="isProtected" class="text-sm text-white/60">Only channel members can view this. Admins see it through an open report.</p>
              </div>
            </div>

            <section class="space-y-4 rounded-2xl border moh-border p-4 moh-surface" aria-labelledby="used-heading">
              <h2 id="used-heading" class="font-semibold moh-text">Where it is used</h2>
              <p v-if="!usage.length && !hasPublications" class="text-sm moh-text-muted">Nothing references this file.</p>
              <ul v-else class="moh-divide">
                <li v-for="row in usage" :key="row.key" class="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <div class="min-w-0">
                    <div class="text-[11px] font-semibold uppercase tracking-wide moh-text-soft">{{ row.label }}</div>
                    <div class="truncate text-sm font-medium moh-text">{{ row.value }}</div>
                    <div v-if="row.detail" class="truncate text-xs moh-text-muted">{{ row.detail }}</div>
                  </div>
                  <NuxtLink v-if="row.to" :to="row.to" class="moh-focus inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">{{ row.action }}</NuxtLink>
                </li>
              </ul>
              <AppAdminMediaPublicationReferences :references="data.references" />
            </section>
          </div>

          <div class="space-y-4">
            <section class="space-y-2 rounded-2xl border moh-border p-4 moh-surface" aria-labelledby="file-heading">
              <h2 id="file-heading" class="font-semibold moh-text">File</h2>
              <dl class="space-y-2 text-sm">
                <div v-for="row in fileRows" :key="row.label" class="flex items-baseline justify-between gap-3">
                  <dt class="moh-text-muted">{{ row.label }}</dt>
                  <dd class="min-w-0 truncate text-right font-medium moh-text" :title="row.value">{{ row.value }}</dd>
                </div>
              </dl>
              <details class="text-xs moh-text-muted">
                <summary class="moh-focus cursor-pointer py-1">Storage key</summary>
                <div class="mt-1 break-all font-mono">{{ data.asset.r2Key }}</div>
                <div class="mt-1 break-all font-mono">Asset {{ data.asset.id }}</div>
              </details>
            </section>

            <section v-if="data.asset.deletedAt" class="space-y-1 rounded-2xl border moh-border p-4 moh-surface">
              <h2 class="font-semibold moh-text">History</h2>
              <p class="text-sm moh-text-muted">Deleted {{ formatDateTime(data.asset.deletedAt) }}{{ data.asset.r2DeletedAt ? '' : ' (storage removal pending)' }}.</p>
              <p v-if="data.asset.deleteReason" class="text-sm moh-text">Reason: {{ data.asset.deleteReason }}</p>
            </section>
          </div>
        </div>
      </template>
    </div>

    <Dialog v-model:visible="openDelete" modal header="Delete from storage?" :draggable="false" class="w-[min(32rem,calc(100vw-2rem))]">
      <div class="space-y-4">
        <div v-if="referencesChanged" class="space-y-3" role="alert" data-testid="media-delete-references-changed">
          <AppInlineAlert severity="warning">
            <strong>References changed.</strong> Where this file is used changed since you reviewed it, so nothing was deleted. The list on this page is now up to date. Review it before deleting.
          </AppInlineAlert>
          <Button label="Review updated references" severity="secondary" :loading="loading" @click="referencesChanged = false" />
        </div>
        <template v-else>
        <div class="flex items-center gap-2 text-sm" data-testid="media-delete-ready" role="status">
          <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100">Ready to confirm</span>
          <span class="moh-text-muted">{{ usage.length ? `Reviewed ${usage.length} ${usage.length === 1 ? 'reference' : 'references'}.` : 'No references found.' }}</span>
        </div>
        <AppInlineAlert :severity="usage.length ? 'warning' : 'info'">
          {{ usage.length
            ? 'This file is still in use. Where it appears will show a removed placeholder, and the object is permanently deleted from storage.'
            : 'Nothing uses this file. The object is permanently deleted from storage.' }}
        </AppInlineAlert>
        <div class="space-y-1">
          <label class="text-sm font-semibold moh-text" for="media-delete-reason">Reason</label>
          <InputText id="media-delete-reason" v-model="deleteReason" class="w-full" placeholder="e.g. DMCA request / user request / policy" />
          <div class="text-xs moh-text-muted">Required. Stored for audit.</div>
        </div>
        <div v-if="usage.length" class="space-y-1">
          <label class="text-sm font-semibold moh-text" for="media-delete-confirm">Type DELETE to confirm</label>
          <InputText id="media-delete-confirm" v-model="deleteConfirm" class="w-full font-mono" placeholder="DELETE" />
        </div>
        </template>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" :disabled="deleting" @click="openDelete = false" />
        <Button label="Delete" severity="danger" :loading="deleting" :disabled="deleting || referencesChanged || loading || !deleteReason.trim() || (usage.length > 0 && deleteConfirm.trim() !== 'DELETE')" @click="doDelete">
          <template #icon><Icon name="tabler:trash" aria-hidden="true" /></template>
        </Button>
      </template>
    </Dialog>
  </AppPageContent>
</template>

<script setup lang="ts">
import { formatBytes } from '~/utils/number-format'
import type { AdminImageReviewDeleteResponse, AdminImageReviewDetailResponse } from '~/types/api'
import { getApiErrorMessage, hasApiErrorReason } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import { mediaTypeLabel } from '~/utils/media-review'
import { channelLink } from '~/utils/channels/reducer'

definePageMeta({
  layout: 'app',
  title: 'Media review',
  middleware: 'admin',
})

usePageSeo({
  title: 'Media review',
  description: 'Admin media review.',
  canonicalPath: '/admin/media-review',
  noindex: true,
})

const route = useRoute()
const id = computed(() => String(route.params.id ?? '').trim())
const { apiFetchData } = useApiClient()
const toast = useAppToast()

const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<AdminImageReviewDetailResponse | null>(null)

async function load() {
  const assetId = id.value
  if (!assetId) return
  loading.value = true
  error.value = null
  try {
    data.value = await apiFetchData<AdminImageReviewDetailResponse>('/admin/media-review/' + encodeURIComponent(assetId), { method: 'GET' })
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load media.'
  } finally {
    loading.value = false
  }
}

watch(id, () => void load(), { immediate: true })

type UsageRow = { key: string; label: string; value: string; detail?: string; to?: string; action?: string }

const refs = computed(() => data.value?.references ?? null)
const isProtected = computed(() => Boolean(refs.value?.messages.some((m) => m.channelId) || refs.value?.channelUploads?.length))
const hasPublications = computed(() => Boolean(refs.value?.announcements?.length || refs.value?.newsletters?.length || refs.value?.emailDeliveries?.length))

const context = computed(() => {
  const message = refs.value?.messages.find((m) => m.channelId && m.groupSlug)
  const upload = refs.value?.channelUploads?.[0]
  const group = message ? { name: message.groupName ?? 'Group', slug: message.groupSlug! } : upload ? { name: upload.groupName, slug: upload.groupSlug } : null
  const channelId = message?.channelId ?? upload?.channelId
  const channelName = message?.channelName ?? upload?.channelName
  const channel = group && channelId && channelName
    ? { name: channelName, to: channelLink(group.slug, channelId, message ? { id: message.messageId, threadRootId: null } : undefined) }
    : null
  return { group, channel, message, upload }
})

const title = computed(() => {
  const d = data.value
  if (!d) return 'Media'
  const noun = d.asset.kind === 'video' ? 'Video' : d.asset.kind === 'gif' ? 'GIF' : d.asset.kind === 'audio' ? 'Audio' : 'Image'
  const sender = context.value.message?.senderUsername ?? context.value.upload?.username
  if (context.value.channel && sender) return `${noun} shared by @${sender}`
  return `${noun} · ${mediaTypeLabel(d.asset.primaryType)}`
})

const subtitle = computed(() => {
  const { group, channel, message, upload } = context.value
  if (group && channel) {
    const when = message ? ` · ${formatDateTime(message.sentAt)}` : upload ? ' · upload not sent yet' : ''
    return `${message ? 'Sent' : 'Uploading'} in #${channel.name} of ${group.name}${when}`
  }
  return null
})

const status = computed(() => {
  const d = data.value
  if (!d) return { label: '', text: '', class: '' }
  if (d.asset.deletedAt) return { label: 'Deleted', text: 'This file was removed from storage.', class: 'bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-100' }
  if (d.asset.primaryType === 'orphan') {
    return { label: 'Unused', text: 'Nothing references this file. It is safe to delete.', class: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100' }
  }
  if (d.asset.primaryType === 'channel_upload') {
    return { label: 'Pending', text: 'Uploaded to a channel but not sent yet. It is kept until the upload expires.', class: 'bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100' }
  }
  if (hasPublications.value) {
    return { label: 'In use', text: 'Kept for published content or queued and delivered email. It cannot be deleted from storage here.', class: 'bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100' }
  }
  const count = usage.value.length + (refs.value?.announcements?.length ?? 0) + (refs.value?.newsletters?.length ?? 0)
  return { label: 'In use', text: `Used in ${count} place${count === 1 ? '' : 's'}. Deleting it leaves a removed placeholder there.`, class: 'bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100' }
})

const usage = computed<UsageRow[]>(() => {
  const r = refs.value
  if (!r) return []
  const rows: UsageRow[] = []
  for (const m of r.messages) {
    const sender = m.senderUsername ? `@${m.senderUsername}${m.senderName ? ` · ${m.senderName}` : ''}` : m.senderName ?? 'Unknown member'
    if (m.channelId && m.groupSlug) {
      rows.push({ key: `g-${m.messageMediaId}-${m.isThumbnail}`, label: 'Group', value: m.groupName ?? m.groupSlug, to: `/groups/${encodeURIComponent(m.groupSlug)}`, action: 'Open group' })
      rows.push({ key: `c-${m.messageMediaId}-${m.isThumbnail}`, label: 'Channel', value: `#${m.channelName ?? 'channel'}${m.channelPrivacy === 'private' ? ' · private' : ''}`, to: channelLink(m.groupSlug, m.channelId), action: 'Open channel' })
      rows.push({ key: `m-${m.messageMediaId}-${m.isThumbnail}`, label: m.isThumbnail ? 'Video poster for message' : 'Message', value: `Sent ${formatDateTime(m.sentAt)} by ${sender}`, to: channelLink(m.groupSlug, m.channelId, { id: m.messageId, threadRootId: null }), action: 'Jump to message' })
    } else {
      rows.push({ key: `dm-${m.messageMediaId}-${m.isThumbnail}`, label: m.isThumbnail ? 'Direct message poster' : 'Direct message', value: `Sent ${formatDateTime(m.sentAt)} by ${sender}`, detail: 'Private conversation' })
    }
  }
  for (const u of r.channelUploads ?? []) {
    rows.push({ key: `up-${u.uploadId}`, label: 'Pending channel upload', value: `#${u.channelName} · ${u.groupName}`, detail: `By ${u.username ? `@${u.username}` : u.userId}. Kept until ${formatDateTime(u.expiresAt)}`, to: channelLink(u.groupSlug, u.channelId), action: 'Open channel' })
  }
  for (const p of r.posts) {
    rows.push({ key: `p-${p.postMediaId}-${p.isThumbnail}`, label: p.isThumbnail ? 'Video poster for post' : 'Post', value: `${p.author.username ? `@${p.author.username}` : p.author.id} · ${p.postVisibility}`, detail: formatDateTime(p.postCreatedAt), to: `/p/${encodeURIComponent(p.postId)}`, action: 'Open post' })
  }
  for (const u of r.users) {
    rows.push({ key: `u-${u.id}-${u.isAvatar}`, label: u.isAvatar && u.isBanner ? 'Avatar and banner' : u.isAvatar ? 'Avatar' : 'Banner', value: u.name || (u.username ? `@${u.username}` : u.id), detail: u.username ? `@${u.username}` : undefined, to: u.username ? `/u/${encodeURIComponent(u.username)}` : '/admin/users', action: 'View profile' })
  }
  for (const g of r.groups) {
    rows.push({ key: `grp-${g.groupId}-${g.isAvatar}`, label: g.isAvatar ? 'Group avatar' : 'Group cover', value: g.name, to: `/groups/${encodeURIComponent(g.slug)}`, action: 'Open group' })
  }
  for (const c of r.crews) {
    rows.push({ key: `crew-${c.crewId}-${c.isAvatar}`, label: c.isAvatar ? 'Crew avatar' : 'Crew cover', value: c.name || c.slug, to: `/c/${encodeURIComponent(c.slug)}`, action: 'Open crew' })
  }
  for (const p of r.polls) {
    rows.push({ key: `poll-${p.pollOptionId}`, label: 'Poll option image', value: 'Poll', to: `/p/${encodeURIComponent(p.postId)}`, action: 'Open poll' })
  }
  for (const a of r.articles) {
    rows.push({ key: `a-${a.articleId}-${a.isInline}`, label: a.isInline ? 'Article body image' : 'Article cover', value: a.title || a.articleId, to: `/a/${encodeURIComponent(a.slug || a.articleId)}`, action: 'Open article' })
  }
  return rows
})

const fileRows = computed(() => {
  const a = data.value?.asset
  if (!a) return []
  return [
    { label: 'Type', value: a.contentType ?? a.kind ?? '—' },
    { label: 'Size', value: a.bytes === null ? '—' : formatBytes(a.bytes) },
    { label: 'Dimensions', value: a.width && a.height ? `${a.width} × ${a.height}` : '—' },
    { label: 'Uploaded', value: formatDateTime(a.lastModified) },
  ]
})

const openDelete = ref(false)
const deleteReason = ref('')
const deleteConfirm = ref('')
const deleting = ref(false)
const referencesChanged = ref(false)
watch(openDelete, open => { if (open) referencesChanged.value = false })

async function doDelete() {
  if (deleting.value) return
  const assetId = id.value
  if (!assetId) return
  deleting.value = true
  try {
    const res = await apiFetchData<AdminImageReviewDeleteResponse>('/admin/media-review/' + encodeURIComponent(assetId), {
      method: 'DELETE',
      body: { reason: deleteReason.value.trim(), referencesToken: data.value?.asset.referencesToken },
    })
    toast.push({ title: res.r2Deleted === false ? 'Deleted (R2 failed)' : 'Deleted', tone: res.r2Deleted === false ? 'error' : 'success', durationMs: 2200 })
    openDelete.value = false
    deleteConfirm.value = ''
    await load()
  } catch (e: unknown) {
    if (hasApiErrorReason(e, 'references_changed')) {
      // Ownership changed since review: refresh the list and token, then require a fresh confirmation.
      referencesChanged.value = true
      deleteConfirm.value = ''
      await load()
    } else {
      toast.pushError(e, 'Delete failed.')
    }
  } finally {
    deleting.value = false
  }
}
</script>

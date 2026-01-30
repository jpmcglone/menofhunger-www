<template>
  <div class="px-4 py-4 space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-sm moh-text-muted">Image review</div>
        <div class="font-semibold moh-text truncate">Asset</div>
        <div class="mt-1 text-xs font-mono moh-text-muted break-all">{{ data?.asset.r2Key ?? '—' }}</div>
      </div>
      <div class="shrink-0 flex items-center gap-2">
        <Button label="Back" severity="secondary" text icon="pi pi-arrow-left" @click="navigateTo('/admin/image-review')" />
        <Button
          label="Delete"
          icon="pi pi-trash"
          severity="danger"
          :disabled="Boolean(data?.asset.deletedAt) || loading"
          @click="openDelete = true"
        />
      </div>
    </div>

    <AppInlineAlert v-if="error" severity="danger">
      {{ error }}
    </AppInlineAlert>

    <div v-else-if="loading" class="text-sm moh-text-muted">Loading…</div>

    <div v-else-if="data" class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="space-y-3">
        <div class="overflow-hidden rounded-2xl border moh-border moh-surface">
          <img
            v-if="data.asset.publicUrl"
            :src="data.asset.publicUrl"
            class="block w-full max-h-[70vh] object-contain bg-black/5 dark:bg-white/5"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <div v-else class="flex items-center justify-center h-[22rem]">
            <div class="text-center text-sm moh-text-muted">
              <i class="pi pi-image text-3xl opacity-70" aria-hidden="true" />
              <div class="mt-2 font-semibold">{{ data.asset.deletedAt ? 'Deleted' : 'No preview' }}</div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border moh-border p-3 moh-surface">
          <div class="text-xs font-semibold moh-text-muted">References</div>
          <div class="mt-2 space-y-2 text-sm">
            <div>
              <div class="font-semibold">Posts</div>
              <div v-if="data.references.posts.length === 0" class="moh-text-muted">None</div>
              <div v-else class="mt-1 space-y-1">
                <NuxtLink
                  v-for="p in data.references.posts"
                  :key="p.postMediaId"
                  :to="`/p/${encodeURIComponent(p.postId)}`"
                  class="block rounded-lg border moh-border px-2 py-2 moh-surface-hover"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="text-xs moh-text-muted">Post</div>
                      <div class="font-mono text-xs truncate">{{ p.postId }}</div>
                    </div>
                    <div class="text-xs moh-text-muted shrink-0">{{ p.postVisibility }}</div>
                  </div>
                </NuxtLink>
              </div>
            </div>

            <div class="pt-2 border-t moh-border">
              <div class="font-semibold">Users</div>
              <div v-if="data.references.users.length === 0" class="moh-text-muted">None</div>
              <div v-else class="mt-1 space-y-1">
                <NuxtLink
                  v-for="u in data.references.users"
                  :key="u.id"
                  :to="u.username ? `/u/${encodeURIComponent(u.username)}` : '/admin/users'"
                  class="block rounded-lg border moh-border px-2 py-2 moh-surface-hover"
                >
                  <div class="font-semibold truncate">{{ u.name || u.username || u.id }}</div>
                  <div class="text-xs moh-text-muted truncate">@{{ u.username || '—' }}</div>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="rounded-2xl border moh-border p-3 moh-surface">
          <div class="text-xs font-semibold moh-text-muted">Metadata</div>
          <div class="mt-2 space-y-2 text-sm">
            <div class="flex items-center justify-between gap-2">
              <div class="moh-text-muted">Last modified</div>
              <div class="font-mono text-xs">{{ data.asset.lastModified }}</div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="moh-text-muted">Bytes</div>
              <div class="font-mono text-xs">{{ data.asset.bytes ?? '—' }}</div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="moh-text-muted">Content-Type</div>
              <div class="font-mono text-xs">{{ data.asset.contentType ?? '—' }}</div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="moh-text-muted">Deleted</div>
              <div class="font-mono text-xs">{{ data.asset.deletedAt ? 'yes' : 'no' }}</div>
            </div>
            <div v-if="data.asset.deleteReason" class="pt-2 border-t moh-border">
              <div class="text-xs font-semibold moh-text-muted">Delete reason</div>
              <div class="mt-1 text-sm moh-text">{{ data.asset.deleteReason }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Dialog v-model:visible="openDelete" modal header="Delete from storage?" :draggable="false" class="w-[min(32rem,calc(100vw-2rem))]">
    <div class="text-sm moh-text-muted">
      This will hard-delete the object from Cloudflare R2. If the image is referenced by a post, the post will show a “Deleted” placeholder.
    </div>

    <div class="mt-4 space-y-2">
      <label class="text-sm font-semibold moh-text">Reason</label>
      <InputText v-model="deleteReason" class="w-full" placeholder="e.g. DMCA request / user request / policy" />
      <div class="text-xs moh-text-muted">Required. Stored for audit.</div>
    </div>

    <div class="mt-4 space-y-2">
      <label class="text-sm font-semibold moh-text">Type DELETE to confirm</label>
      <InputText v-model="deleteConfirm" class="w-full font-mono" placeholder="DELETE" />
    </div>

    <template #footer>
      <Button label="Cancel" text severity="secondary" :disabled="deleting" @click="openDelete = false" />
      <Button
        label="Delete"
        icon="pi pi-trash"
        severity="danger"
        :loading="deleting"
        :disabled="deleting || deleteConfirm.trim() !== 'DELETE' || !deleteReason.trim()"
        @click="doDelete"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { AdminImageReviewDeleteResponse, AdminImageReviewDetailResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  title: 'Image review',
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
    data.value = await apiFetchData<AdminImageReviewDetailResponse>('/admin/image-review/' + encodeURIComponent(assetId), { method: 'GET' })
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load image.'
  } finally {
    loading.value = false
  }
}

watch(id, () => void load(), { immediate: true })

const openDelete = ref(false)
const deleteReason = ref('')
const deleteConfirm = ref('')
const deleting = ref(false)

async function doDelete() {
  if (deleting.value) return
  const assetId = id.value
  if (!assetId) return
  deleting.value = true
  try {
    const res = await apiFetchData<AdminImageReviewDeleteResponse>('/admin/image-review/' + encodeURIComponent(assetId), {
      method: 'DELETE',
      body: { reason: deleteReason.value.trim() },
    })
    toast.push({ title: res.r2Deleted === false ? 'Deleted (R2 failed)' : 'Deleted', tone: res.r2Deleted === false ? 'error' : 'success', durationMs: 2200 })
    openDelete.value = false
    deleteConfirm.value = ''
    // Refresh details to show tombstone state.
    await load()
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Delete failed.', tone: 'error', durationMs: 2600 })
  } finally {
    deleting.value = false
  }
}
</script>


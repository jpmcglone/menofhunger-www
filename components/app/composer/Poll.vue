<template>
  <div class="mt-3">
    <div class="flex flex-col gap-3">
      <div
        v-for="(opt, idx) in options"
        :key="opt.id"
        class="flex items-stretch gap-3"
      >
          <!-- Option image (left) - reuse existing media slot tile UI -->
          <div class="shrink-0 self-start">
            <AppComposerMediaSlotTile
              :slot="slotForOption(opt)"
              :first-empty-slot-index="0"
              :can-add-more="true"
              :dragging-media-id="null"
              upload-bar-color="var(--p-primary-color)"
              :upload-status-label="pollUploadStatusLabel"
              :draggable="false"
              :show-alt="false"
              tile-size-class="h-[4.5rem] w-[4.5rem]"
              @add="onClickPickImage(opt.id)"
              @remove="() => removeOptionImage(opt.id)"
            />
          </div>

          <!-- Option input (right) -->
          <div class="min-w-0 flex-1">
            <div
              class="relative px-3 py-2 pr-14 min-h-[4.5rem] rounded-xl border moh-border-subtle transition-colors"
              :class="isOptionFocused(opt.id) ? 'border-[color:var(--p-primary-color)] ring-2 ring-[color:var(--p-primary-color)]' : ''"
            >
              <div v-if="shouldShowChoiceHeader(opt.id, opt.text)" class="text-[12px] font-semibold moh-text-muted">
                  Choice {{ idx + 1 }}<span v-if="idx >= 2" class="moh-text-muted font-semibold"> (Optional)</span>
              </div>

              <!-- Overlay: count (and trash) should not affect layout height -->
              <div
                v-if="shouldShowChoiceHeader(opt.id, opt.text)"
                class="absolute top-2 right-3 flex flex-col items-end gap-1"
              >
                <div class="text-[12px] font-semibold moh-text-muted tabular-nums">
                  {{ (opt.text ?? '').length }}/30
                </div>
                <button
                  v-if="idx >= 2"
                  type="button"
                  class="h-8 w-8 rounded-full transition-colors moh-surface-hover flex items-center justify-center moh-focus"
                  :aria-label="`Remove option ${idx + 1}`"
                  :disabled="opt.uploadStatus === 'uploading' || opt.uploadStatus === 'processing'"
                  @click.stop="onRemoveOptionClick(opt.id)"
                >
                  <Icon name="tabler:trash" class="text-[18px] text-red-600 dark:text-red-400" aria-hidden="true" />
                </button>
              </div>

              <InputText
                class="w-full !bg-transparent !border-0 !shadow-none !px-0 !py-1 moh-text placeholder:text-[color:var(--moh-text-muted)] placeholder:opacity-80"
                :model-value="opt.text"
                :maxlength="30"
                :placeholder="shouldShowChoiceHeader(opt.id, opt.text) ? '' : (idx >= 2 ? `Choice ${idx + 1} (Optional)` : `Choice ${idx + 1}`)"
                :aria-label="`Poll option ${idx + 1}`"
                @focus="onOptionFocus(opt.id)"
                @blur="onOptionBlur(opt.id)"
                @update:model-value="(v) => updateOptionText(opt.id, String(v ?? ''))"
              />

              <div v-if="opt.uploadStatus === 'error'" class="mt-1 text-[11px] text-red-600 dark:text-red-400">
                {{ opt.uploadError || 'Upload failed.' }}
              </div>
            </div>
          </div>
      </div>
    </div>

    <div v-if="options.length < 5" class="mt-3 flex justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border moh-border px-4 py-2 text-sm font-semibold moh-text-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors moh-focus"
        aria-label="Add option"
        @click="addOption"
      >
        <Icon name="tabler:plus" class="text-[18px]" aria-hidden="true" />
        Add option
      </button>
    </div>

    <!-- Poll length -->
    <div class="mt-4">
      <div class="text-sm font-semibold moh-text mb-2">Poll length</div>
      <div class="grid grid-cols-3 gap-3">
        <div class="min-w-0">
          <div class="text-[11px] moh-text-muted font-semibold mb-1">Days</div>
          <Dropdown
            v-model="duration.days"
            :options="dayOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            aria-label="Poll days"
          />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] moh-text-muted font-semibold mb-1">Hours</div>
          <Dropdown
            v-model="duration.hours"
            :options="hourOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="duration.days === 7"
            aria-label="Poll hours"
          />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] moh-text-muted font-semibold mb-1">Minutes</div>
          <Dropdown
            v-model="duration.minutes"
            :options="minuteOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="duration.days === 7"
            aria-label="Poll minutes"
          />
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-center">
      <button
        type="button"
        class="text-red-600 dark:text-red-400 font-semibold text-sm hover:underline moh-focus"
        @click="emit('remove')"
      >
        Remove poll
      </button>
    </div>

    <input
      ref="fileInputEl"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/avif"
      class="hidden"
      tabindex="-1"
      aria-hidden="true"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'

type PollDuration = { days: number; hours: number; minutes: number }
type PollOptionImagePayload = {
  source: 'upload'
  kind: 'image'
  r2Key: string
  width: number | null
  height: number | null
  alt: string | null
}
export type ComposerPollPayload = {
  options: Array<{ text: string; image: PollOptionImagePayload | null }>
  duration: PollDuration
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'
type LocalOption = {
  id: string
  text: string
  image: PollOptionImagePayload | null
  previewUrl: string | null
  uploadStatus: UploadStatus
  uploadError: string | null
  abortController: AbortController | null
}

const props = defineProps<{
  modelValue: ComposerPollPayload
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: ComposerPollPayload): void
  (e: 'remove'): void
  (e: 'status', v: { uploading: boolean; hasFailed: boolean }): void
}>()

const { apiFetchData } = useApiClient()
const toast = useAppToast()

function makeId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

function defaultAltFromFilename(name: string | null | undefined): string | null {
  const raw = (name ?? '').trim()
  if (!raw) return null
  const withoutExt = raw.replace(/\.[a-z0-9]+$/i, '')
  const cleaned = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned || null
}

const fileInputEl = ref<HTMLInputElement | null>(null)
const fileTargetOptionId = ref<string | null>(null)
const focusedOptionId = ref<string | null>(null)

const options = ref<LocalOption[]>([])
const duration = reactive<PollDuration>({
  days: props.modelValue?.duration?.days ?? 1,
  hours: props.modelValue?.duration?.hours ?? 0,
  minutes: props.modelValue?.duration?.minutes ?? 0,
})

type ComposerMediaItem = import('~/composables/useComposerMedia').ComposerMediaItem

function slotForOption(opt: LocalOption): { index: number; empty: boolean; item?: ComposerMediaItem } {
  const hasPreview = Boolean(opt.previewUrl)
  if (!hasPreview) return { index: 0, empty: true }
  // Adapter: poll option image -> ComposerMediaItem shape for shared tile rendering
  const mappedStatus =
    opt.uploadStatus === 'uploading' || opt.uploadStatus === 'processing' || opt.uploadStatus === 'error'
      ? (opt.uploadStatus as any)
      : 'done'
  return {
    index: 0,
    empty: false,
    item: {
      localId: opt.id,
      source: 'upload',
      kind: 'image',
      previewUrl: opt.previewUrl!,
      altText: opt.image?.alt ?? null,
      uploadStatus: mappedStatus,
      uploadError: opt.uploadError ?? null,
      uploadProgress: null,
    } as any,
  }
}

function pollUploadStatusLabel(m: any): string | null {
  // Mirror composer media labels
  if (!m || m.source !== 'upload') return null
  if (m.uploadStatus === 'error') return 'Failed'
  if (m.uploadStatus === 'uploading' || m.uploadStatus === 'processing') return 'Uploading'
  return null
}

watch(
  () => duration.days,
  (d) => {
    if (d === 7) {
      duration.hours = 0
      duration.minutes = 0
    }
    emitPayload()
  },
)
watch(() => duration.hours, () => emitPayload())
watch(() => duration.minutes, () => emitPayload())

const dayOptions = computed(() => Array.from({ length: 8 }, (_, i) => ({ label: `${i}d`, value: i })))
const hourOptions = computed(() => Array.from({ length: 24 }, (_, i) => ({ label: `${i}h`, value: i })))
const minuteOptions = computed(() => {
  const vals = [0, 5, 10, 15, 30, 45]
  return vals.map((v) => ({ label: `${v}m`, value: v }))
})

function onOptionFocus(id: string) {
  focusedOptionId.value = id
}
function onOptionBlur(id: string) {
  if (focusedOptionId.value === id) focusedOptionId.value = null
}
function isOptionFocused(id: string) {
  return focusedOptionId.value === id
}
function shouldShowChoiceHeader(id: string, text: string) {
  return isOptionFocused(id) || Boolean((text ?? '').trim())
}

function emitStatus() {
  const uploading = options.value.some((o) => o.uploadStatus === 'uploading' || o.uploadStatus === 'processing')
  const hasFailed = options.value.some((o) => o.uploadStatus === 'error')
  emit('status', { uploading, hasFailed })
}

function emitPayload() {
  emitStatus()
  emit('update:modelValue', {
    duration: {
      days: Math.max(0, Math.min(7, Math.floor(duration.days || 0))),
      hours: Math.max(0, Math.min(23, Math.floor(duration.hours || 0))),
      minutes: Math.max(0, Math.min(59, Math.floor(duration.minutes || 0))),
    },
    options: options.value
      .map((o, idx) => ({ o, idx }))
      .filter(({ o, idx }) => {
        if (idx < 2) return true
        const hasText = Boolean((o.text ?? '').trim())
        const hasImage = Boolean(o.image || o.previewUrl)
        return hasText || hasImage
      })
      .map(({ o }) => ({ text: (o.text ?? '').slice(0, 30), image: o.image ?? null })),
  })
}

function syncFromModel() {
  const incoming = props.modelValue
  const incomingOpts = Array.isArray(incoming?.options) ? incoming.options : []
  const next: LocalOption[] = []
  for (let i = 0; i < Math.min(5, incomingOpts.length || 0); i++) {
    const it = incomingOpts[i]!
    next.push({
      id: makeId(),
      text: String(it.text ?? '').slice(0, 30),
      image: it.image ?? null,
      previewUrl: null,
      uploadStatus: it.image ? 'done' : 'idle',
      uploadError: null,
      abortController: null,
    })
  }
  if (next.length < 2) {
    while (next.length < 2) {
      next.push({
        id: makeId(),
        text: '',
        image: null,
        previewUrl: null,
        uploadStatus: 'idle',
        uploadError: null,
        abortController: null,
      })
    }
  }
  options.value = next
  duration.days = incoming?.duration?.days ?? duration.days
  duration.hours = incoming?.duration?.hours ?? duration.hours
  duration.minutes = incoming?.duration?.minutes ?? duration.minutes
  if (duration.days === 7) {
    duration.hours = 0
    duration.minutes = 0
  }
  emitPayload()
}

watch(
  () => props.modelValue,
  () => {
    // Only resync when the parent resets the payload shape (e.g., on add/remove poll)
    if (!options.value.length) syncFromModel()
  },
  { immediate: true },
)

function addOption() {
  if (options.value.length >= 5) return
  options.value.push({
    id: makeId(),
    text: '',
    image: null,
    previewUrl: null,
    uploadStatus: 'idle',
    uploadError: null,
    abortController: null,
  })
  emitPayload()
}

function removeOption(id: string) {
  if (options.value.length <= 2) return
  const idx = options.value.findIndex((o) => o.id === id)
  if (idx < 0) return
  if (idx < 2) return
  removeOptionImage(id)
  options.value.splice(idx, 1)
  emitPayload()
}

function optionHasContent(opt: LocalOption) {
  const hasText = Boolean((opt.text ?? '').trim())
  const hasImage = Boolean(opt.image || opt.previewUrl)
  return hasText || hasImage
}

function onRemoveOptionClick(optionId: string) {
  const idx = options.value.findIndex((o) => o.id === optionId)
  if (idx < 2) return
  const opt = options.value[idx]
  if (!opt) return

  if (!optionHasContent(opt)) {
    removeOption(optionId)
    return
  }

  // Lightweight confirmation (keeps current component style; no new modal dependency).
  const ok = window.confirm('Remove this option? This cannot be undone.')
  if (!ok) return
  removeOption(optionId)
}

function updateOptionText(id: string, text: string) {
  const idx = options.value.findIndex((o) => o.id === id)
  if (idx < 0) return
  options.value[idx] = { ...options.value[idx]!, text: String(text ?? '').slice(0, 30) }
  emitPayload()
}

function onClickPickImage(optionId: string) {
  fileTargetOptionId.value = optionId
  const input = fileInputEl.value
  if (!input) return
  input.value = ''
  input.click()
}

function revokePreviewUrl(url: string | null) {
  if (!url) return
  if (!url.startsWith('blob:')) return
  try {
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

function removeOptionImage(optionId: string) {
  const idx = options.value.findIndex((o) => o.id === optionId)
  if (idx < 0) return
  const cur = options.value[idx]!
  try {
    cur.abortController?.abort?.()
  } catch {
    // ignore
  }
  revokePreviewUrl(cur.previewUrl)
  options.value[idx] = {
    ...cur,
    image: null,
    previewUrl: null,
    uploadStatus: 'idle',
    uploadError: null,
    abortController: null,
  }
  emitPayload()
}

async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function uploadImageForOption(optionId: string, file: File) {
  const idx = options.value.findIndex((o) => o.id === optionId)
  if (idx < 0) return
  const controller = new AbortController()
  const ct = (file.type ?? '').toLowerCase().trim()
  if (!ct.startsWith('image/')) return
  if (ct === 'image/gif') {
    toast.push({ title: 'GIFs are not allowed in poll options.', tone: 'error', durationMs: 2000 })
    return
  }

  // Reset existing image (abort + cleanup)
  removeOptionImage(optionId)

  const previewUrl = URL.createObjectURL(file)
  options.value[idx] = {
    ...options.value[idx]!,
    previewUrl,
    uploadStatus: 'uploading',
    uploadError: null,
    abortController: controller,
  }
  emitPayload()

  try {
    const contentHash = await computeFileSha256(file)
    const init = await apiFetchData<{
      key: string
      uploadUrl?: string
      headers: Record<string, string>
      maxBytes?: number
      skipUpload?: boolean
    }>('/uploads/post-media/init', {
      method: 'POST',
      body: { contentType: file.type, contentHash },
      signal: controller.signal,
    })

    const maxBytes = typeof init.maxBytes === 'number' ? init.maxBytes : null
    if (maxBytes && file.size > maxBytes) throw new Error('File is too large.')

    if (!init.skipUpload && init.uploadUrl) {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', init.uploadUrl!)
        for (const [k, v] of Object.entries(init.headers ?? {})) {
          try {
            xhr.setRequestHeader(k, v)
          } catch {
            // ignore
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error('Failed to upload.'))
        }
        xhr.onerror = () => reject(new Error('Failed to upload.'))
        xhr.onabort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
        controller.signal.addEventListener('abort', () => { try { xhr.abort() } catch { /* ignore */ } }, { once: true })
        xhr.send(file)
      })
    }

    options.value[idx] = { ...options.value[idx]!, uploadStatus: 'processing' }
    emitPayload()

    const committed = await apiFetchData<{
      key: string
      kind: 'image' | 'gif' | 'video'
      width?: number | null
      height?: number | null
    }>('/uploads/post-media/commit', {
      method: 'POST',
      body: { key: init.key, contentHash },
      signal: controller.signal,
    })

    if (committed.kind !== 'image') throw new Error('Only images are allowed.')

    options.value[idx] = {
      ...options.value[idx]!,
      uploadStatus: 'done',
      abortController: null,
      image: {
        source: 'upload',
        kind: 'image',
        r2Key: committed.key,
        width: committed.width ?? null,
        height: committed.height ?? null,
        alt: defaultAltFromFilename(file.name),
      },
    }
    emitPayload()
  } catch (err: any) {
    if (controller.signal.aborted) return
    const msg = String(err?.message ?? err) || 'Upload failed.'
    options.value[idx] = { ...options.value[idx]!, uploadStatus: 'error', uploadError: msg, abortController: null }
    emitPayload()
  }
}

function onFileSelected(e: Event) {
  const optionId = fileTargetOptionId.value
  fileTargetOptionId.value = null
  const input = e.target as HTMLInputElement | null
  const file = input?.files?.[0] ?? null
  if (!optionId || !file) return
  void uploadImageForOption(optionId, file)
}

onBeforeUnmount(() => {
  for (const o of options.value) {
    try {
      o.abortController?.abort?.()
    } catch {
      // ignore
    }
    revokePreviewUrl(o.previewUrl)
  }
})
</script>


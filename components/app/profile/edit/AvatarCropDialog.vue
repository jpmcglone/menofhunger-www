<template>
  <Dialog
    :visible="modelValue"
    modal
    header="Crop avatar"
    :draggable="false"
    :style="{ width: 'min(60rem, 96vw)' }"
    @update:visible="(v) => emit('update:modelValue', Boolean(v))"
  >
    <div class="grid gap-4 sm:grid-cols-[1fr_16rem]">
      <div class="min-w-0 rounded-xl border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-black/20">
        <ClientOnly>
          <Cropper
            v-if="cropSrc"
            ref="cropperRef"
            class="h-[24rem] w-full min-w-0"
            :src="cropSrc"
            :stencil-component="CircleStencil"
            :stencil-props="{ aspectRatio: 1 }"
            :canvas="{ width: 640, height: 640 }"
            image-restriction="stencil"
            :default-size="avatarDefaultSize"
            :default-position="avatarDefaultPosition"
            @ready="onCropperReady"
            @change="onCropChange"
          />
        </ClientOnly>
      </div>

      <div class="space-y-3">
        <div class="text-sm font-medium text-gray-800 dark:text-gray-200">
          Preview
        </div>
        <div class="mx-auto h-32 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800">
          <img v-if="cropPreviewUrl" :src="cropPreviewUrl" alt="" class="h-full w-full object-cover" />
        </div>
        <AppInlineAlert severity="info" title="Tip">
          We recommend using <span class="font-semibold">Auto</span> to frame your face.
        </AppInlineAlert>
        <div class="flex justify-center">
          <Button
            label="Auto (recommended)"
            icon="pi pi-bolt"
            severity="success"
            class="w-full"
            :loading="faceDetecting"
            :disabled="disabled || !cropSrc || faceDetecting"
            @click="autoCropFace"
          />
        </div>
        <AppInlineAlert v-if="faceDetectError" severity="warning">
          {{ faceDetectError }}
        </AppInlineAlert>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          This is how your avatar will appear. The saved image remains a square (best for future layouts), but it’s displayed as a circle.
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" text severity="secondary" :disabled="disabled" @click="cancelCrop" />
      <Button label="Apply" icon="pi pi-check" severity="secondary" :disabled="disabled || !cropHasSelection" @click="applyCrop" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { Cropper, CircleStencil } from 'vue-advanced-cropper'

const props = defineProps<{
  modelValue: boolean
  file: File | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'cropped', file: File): void
  (e: 'cancel'): void
}>()

const modelValue = computed(() => Boolean(props.modelValue))
const disabled = computed(() => Boolean(props.disabled))

// Crop state
const cropSrc = ref<string | null>(null)
const cropPreviewUrl = ref<string | null>(null)
const cropHasSelection = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cropperRef = ref<any>(null)
let cropPreviewRaf: number | null = null
let faceDetector: any | null = null

const faceDetecting = ref(false)
const faceDetectError = ref<string | null>(null)
const autoFaceOnOpen = ref(true)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const avatarDefaultSize = ({ imageSize }: any) => {
  const size = Math.floor(Math.min(imageSize.width, imageSize.height) * 0.98)
  return { width: size, height: size }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const avatarDefaultPosition = ({ coordinates, imageSize }: any) => {
  return {
    left: Math.round(imageSize.width / 2 - coordinates.width / 2),
    top: Math.round(imageSize.height / 2 - coordinates.height / 2),
  }
}

function clearInternalState() {
  cropHasSelection.value = false
  faceDetectError.value = null
  autoFaceOnOpen.value = true

  if (cropPreviewRaf) {
    cancelAnimationFrame(cropPreviewRaf)
    cropPreviewRaf = null
  }
  if (cropSrc.value) {
    URL.revokeObjectURL(cropSrc.value)
    cropSrc.value = null
  }
  if (cropPreviewUrl.value) {
    URL.revokeObjectURL(cropPreviewUrl.value)
    cropPreviewUrl.value = null
  }
  cropperRef.value = null
}

watch(
  () => [modelValue.value, props.file] as const,
  ([open, file]) => {
    if (!open) {
      clearInternalState()
      return
    }
    clearInternalState()
    if (file) {
      cropSrc.value = URL.createObjectURL(file)
      cropHasSelection.value = true
      autoFaceOnOpen.value = true
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearInternalState()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onCropChange(e: any) {
  const canvas: HTMLCanvasElement | null = e?.canvas ?? null
  cropHasSelection.value = Boolean(canvas)
  if (!canvas) return

  if (cropPreviewRaf) cancelAnimationFrame(cropPreviewRaf)
  cropPreviewRaf = requestAnimationFrame(() => {
    try {
      const previewCanvas = document.createElement('canvas')
      const size = 256
      previewCanvas.width = size
      previewCanvas.height = size
      const ctx = previewCanvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(canvas, 0, 0, size, size)

      if (cropPreviewUrl.value) URL.revokeObjectURL(cropPreviewUrl.value)
      previewCanvas.toBlob((blob) => {
        if (!blob) return
        cropPreviewUrl.value = URL.createObjectURL(blob)
      }, 'image/jpeg', 0.92)
    } finally {
      cropPreviewRaf = null
    }
  })
}

async function ensureFaceDetector() {
  if (faceDetector) return faceDetector
  // Lazy-load on client only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('@mediapipe/tasks-vision')
  const FilesetResolver = mod.FilesetResolver
  const FaceDetector = mod.FaceDetector

  const vision = await FilesetResolver.forVisionTasks(
    // WASM root
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  )

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
    },
    runningMode: 'IMAGE',
    minDetectionConfidence: 0.5,
  })

  return faceDetector
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

async function onCropperReady() {
  if (!autoFaceOnOpen.value) return
  autoFaceOnOpen.value = false
  await autoCropFace()
}

async function autoCropFace() {
  if (!modelValue.value) return
  if (!cropperRef.value?.setCoordinates) return
  const srcFile = props.file
  if (!srcFile) return

  faceDetecting.value = true
  faceDetectError.value = null
  try {
    const detector = await ensureFaceDetector()
    const bitmap = await createImageBitmap(srcFile)
    const res = detector.detect(bitmap)
    const detections = res?.detections ?? []
    if (!detections.length) {
      faceDetectError.value = 'No face detected. You can still crop manually.'
      return
    }

    const best = detections
      .slice()
      .sort((a: any, b: any) => {
        const sa = a?.categories?.[0]?.score ?? 0
        const sb = b?.categories?.[0]?.score ?? 0
        if (sb !== sa) return sb - sa
        const ba = a?.boundingBox
        const bb = b?.boundingBox
        const aa = (ba?.width ?? 0) * (ba?.height ?? 0)
        const ab = (bb?.width ?? 0) * (bb?.height ?? 0)
        return ab - aa
      })[0]

    const bb = best?.boundingBox
    const x = bb?.originX ?? bb?.origin_x ?? bb?.x ?? 0
    const y = bb?.originY ?? bb?.origin_y ?? bb?.y ?? 0
    const w = bb?.width ?? 0
    const h = bb?.height ?? 0

    if (!w || !h) {
      faceDetectError.value = 'Face detected, but crop info was unavailable. You can still crop manually.'
      return
    }

    const cx = x + w / 2
    const cy = y + h / 2
    const padding = 2.2
    let size = Math.max(w, h) * padding
    size = Math.min(size, bitmap.width, bitmap.height)

    let left = cx - size / 2
    let top = cy - size / 2
    left = clamp(left, 0, bitmap.width - size)
    top = clamp(top, 0, bitmap.height - size)

    cropperRef.value.setCoordinates({
      width: Math.round(size),
      height: Math.round(size),
      left: Math.round(left),
      top: Math.round(top),
    })
  } catch {
    faceDetectError.value = 'Auto crop is unavailable in this browser/session. You can still crop manually.'
  } finally {
    faceDetecting.value = false
  }
}

function cancelCrop() {
  emit('cancel')
  emit('update:modelValue', false)
}

async function applyCrop() {
  if (!cropHasSelection.value) return
  const cropper = cropperRef.value
  const result = cropper?.getResult?.()
  const canvas: HTMLCanvasElement | null = result?.canvas ?? null
  if (!canvas) return

  const original = props.file
  const outType = (original?.type === 'image/png' || original?.type === 'image/webp') ? original.type : 'image/jpeg'

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), outType, outType === 'image/jpeg' ? 0.92 : undefined)
  })
  if (!blob) return

  const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg'
  const filename = `avatar.${ext}`
  const croppedFile = new File([blob], filename, { type: outType })
  emit('cropped', croppedFile)
  emit('update:modelValue', false)
}
</script>


<template>
  <Dialog
    :visible="modelValue"
    modal
    header="Crop thumbnail"
    :draggable="false"
    :style="{ width: 'min(72rem, 96vw)' }"
    @update:visible="(v) => emit('update:modelValue', Boolean(v))"
  >
    <div class="space-y-3">
      <div class="min-w-0 rounded-xl border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-black/20">
        <ClientOnly>
          <Cropper
            v-if="cropSrc"
            ref="cropperRef"
            class="h-[22rem] w-full min-w-0"
            :src="cropSrc"
            :stencil-props="{ aspectRatio: 16 / 9 }"
            :canvas="{ width: 1600, height: 900 }"
            image-restriction="stencil"
            :default-size="defaultSize"
            :default-position="defaultPosition"
            @ready="onCropperReady"
            @change="onCropChange"
          />
        </ClientOnly>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Thumbnails must be 16:9. We'll save a 1600×900 image.
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" text severity="secondary" :disabled="disabled" @click="cancelCrop" />
      <Button label="Apply" severity="secondary" :disabled="disabled || !cropHasSelection" @click="applyCrop">
        <template #icon>
          <Icon name="tabler:check" aria-hidden="true" />
        </template>
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { Cropper } from 'vue-advanced-cropper'

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

const cropSrc = ref<string | null>(null)
const cropHasSelection = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cropperRef = ref<any>(null)
const maxOnOpen = ref(true)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultSize = ({ imageSize }: any) => {
  const w = Number(imageSize?.width ?? 0)
  const h = Number(imageSize?.height ?? 0)
  if (!w || !h) return { width: 0, height: 0 }
  const cropW = Math.floor(Math.min(w, h * (16 / 9)))
  const cropH = Math.floor(cropW / (16 / 9))
  return { width: cropW, height: cropH }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultPosition = ({ coordinates, imageSize }: any) => ({
  left: Math.round(imageSize.width / 2 - coordinates.width / 2),
  top: Math.round(imageSize.height / 2 - coordinates.height / 2),
})

function clearInternalState() {
  cropHasSelection.value = false
  maxOnOpen.value = true
  if (cropSrc.value) {
    URL.revokeObjectURL(cropSrc.value)
    cropSrc.value = null
  }
  cropperRef.value = null
}

watch(
  () => [modelValue.value, props.file] as const,
  ([open, file]) => {
    if (!open) { clearInternalState(); return }
    clearInternalState()
    if (file) {
      cropSrc.value = URL.createObjectURL(file)
      cropHasSelection.value = true
      maxOnOpen.value = true
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => { clearInternalState() })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onCropChange(e: any) {
  cropHasSelection.value = Boolean(e?.canvas)
}

async function onCropperReady() {
  if (!maxOnOpen.value) return
  maxOnOpen.value = false
  const cropper = cropperRef.value
  if (!cropper?.setCoordinates) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cropper.setCoordinates(({ imageSize, coordinates }: any) => {
    const w = Number(imageSize?.width ?? 0)
    const h = Number(imageSize?.height ?? 0)
    if (!w || !h) return coordinates
    const cropW = Math.floor(Math.min(w, h * (16 / 9)))
    const cropH = Math.floor(cropW / (16 / 9))
    return {
      width: cropW,
      height: cropH,
      left: Math.round(w / 2 - cropW / 2),
      top: Math.round(h / 2 - cropH / 2),
    }
  })
}

function cancelCrop() {
  emit('cancel')
  emit('update:modelValue', false)
}

async function applyCrop() {
  if (!cropHasSelection.value) return
  const result = cropperRef.value?.getResult?.()
  const canvas: HTMLCanvasElement | null = result?.canvas ?? null
  if (!canvas) return

  const original = props.file
  const outType = (original?.type === 'image/png' || original?.type === 'image/webp') ? original.type : 'image/jpeg'

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), outType, outType === 'image/jpeg' ? 0.9 : undefined)
  })
  if (!blob) return

  const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg'
  const croppedFile = new File([blob], `thumbnail.${ext}`, { type: outType })
  emit('cropped', croppedFile)
  emit('update:modelValue', false)
}
</script>

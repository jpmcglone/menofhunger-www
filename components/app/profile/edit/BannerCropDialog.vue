<template>
  <Dialog
    :visible="modelValue"
    modal
    header="Crop banner"
    :draggable="false"
    :style="{ width: 'min(72rem, 96vw)' }"
    @update:visible="handleVisibleUpdate"
  >
    <div class="space-y-3">
      <div class="min-w-0 rounded-xl border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-black/20">
        <ClientOnly>
          <Cropper
            v-if="cropSrc"
            ref="cropperRef"
            class="h-[22rem] w-full min-w-0"
            :src="cropSrc"
            :stencil-props="{ aspectRatio: 3 }"
            :canvas="{ width: 1500, height: 500 }"
            image-restriction="stencil"
            :default-size="bannerDefaultSize"
            :default-position="bannerDefaultPosition"
            @ready="onCropperReady"
            @change="onCropChange"
          />
        </ClientOnly>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Banners must be 3:1. We’ll save a 1500×500 image.
      </div>
      <AppInlineAlert v-if="cropApplyError" severity="warning">
        {{ cropApplyError }}
      </AppInlineAlert>
    </div>

    <template #footer>
      <Button label="Cancel" text severity="secondary" :disabled="disabled" @click="cancelCrop" />
      <Button label="Apply" severity="secondary" :disabled="disabled || !cropperReady || !cropHasSelection" @click="applyCrop">
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
const cropperReady = ref(false)
const cropApplyError = ref<string | null>(null)
const cropperRef = ref<any>(null)
const maxOnOpen = ref(true)

const bannerDefaultSize = ({ imageSize }: any) => {
  const width = Number(imageSize?.width ?? 0)
  const height = Number(imageSize?.height ?? 0)
  if (!width || !height) return { width: 0, height: 0 }
  const w = Math.floor(Math.min(width, height * 3))
  const h = Math.floor(w / 3)
  return { width: w, height: h }
}
const bannerDefaultPosition = ({ coordinates, imageSize }: any) => {
  return {
    left: Math.round(imageSize.width / 2 - coordinates.width / 2),
    top: Math.round(imageSize.height / 2 - coordinates.height / 2),
  }
}

function clearInternalState() {
  cropHasSelection.value = false
  cropperReady.value = false
  cropApplyError.value = null
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
    if (!open) {
      clearInternalState()
      return
    }
    clearInternalState()
    if (file) {
      cropSrc.value = URL.createObjectURL(file)
      maxOnOpen.value = true
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearInternalState()
})

function onCropChange(e: any) {
  const canvas: HTMLCanvasElement | null = e?.canvas ?? null
  cropHasSelection.value = Boolean(canvas)
}

async function onCropperReady() {
  cropperReady.value = true
  if (!maxOnOpen.value) return
  maxOnOpen.value = false
  const cropper = cropperRef.value
  if (!cropper?.setCoordinates) return

  cropper.setCoordinates(({ imageSize, coordinates }: any) => {
    const width = Number(imageSize?.width ?? 0)
    const height = Number(imageSize?.height ?? 0)
    if (!width || !height) return coordinates

    const w = Math.floor(Math.min(width, height * 3))
    const h = Math.floor(w / 3)
    return {
      width: w,
      height: h,
      left: Math.round(width / 2 - w / 2),
      top: Math.round(height / 2 - h / 2),
    }
  })
}

function cancelCrop() {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleVisibleUpdate(value: boolean) {
  if (value) {
    emit('update:modelValue', true)
    return
  }
  cancelCrop()
}

async function applyCrop() {
  cropApplyError.value = null
  if (!cropperReady.value || !cropHasSelection.value) {
    cropApplyError.value = 'Cropper is not ready yet. Please wait a moment and try again.'
    return
  }
  const cropper = cropperRef.value
  const result = cropper?.getResult?.()
  const canvas: HTMLCanvasElement | null = result?.canvas ?? null
  if (!canvas) {
    cropApplyError.value = 'Could not read the crop selection. Please adjust the frame and try again.'
    return
  }

  const original = props.file
  const outType = (original?.type === 'image/png' || original?.type === 'image/webp') ? original.type : 'image/jpeg'

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), outType, outType === 'image/jpeg' ? 0.9 : undefined)
  })
  if (!blob) {
    cropApplyError.value = 'Could not export the cropped image. Please try again.'
    return
  }

  const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg'
  const filename = `banner.${ext}`
  const croppedFile = new File([blob], filename, { type: outType })
  emit('cropped', croppedFile)
  emit('update:modelValue', false)
}
</script>


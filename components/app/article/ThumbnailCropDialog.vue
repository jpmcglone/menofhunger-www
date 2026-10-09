<template>
  <Dialog
    :visible="modelValue"
    modal
    :header="header"
    :draggable="false"
    :style="{ width: 'min(72rem, 96vw)' }"
    @update:visible="(v) => emit('update:modelValue', Boolean(v))"
  >
    <div class="space-y-3">
      <div class="min-w-0 rounded-xl border moh-border moh-surface-2 p-3">
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
      <div class="text-xs moh-text-muted">
        Crop to 16:9. We'll save a 1600×900 image.
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
import { centeredCropPosition, maxCenteredCrop, type CropperChangeEvent, type CropperHandle, type CropperState } from '~/utils/cropper'

const props = defineProps<{
  modelValue: boolean
  file: File | null
  disabled?: boolean
  header?: string
}>()

const header = computed(() => props.header?.trim() || 'Crop thumbnail')

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'cropped', file: File): void
  (e: 'cancel'): void
}>()

const modelValue = computed(() => Boolean(props.modelValue))

useOverlayDismiss(modelValue, () => emit('update:modelValue', false))
const disabled = computed(() => Boolean(props.disabled))

const cropSrc = ref<string | null>(null)
const cropHasSelection = ref(false)
const cropperRef = ref<CropperHandle | null>(null)
const maxOnOpen = ref(true)

const defaultSize = ({ imageSize }: Pick<CropperState, 'imageSize'>) => {
  const w = Number(imageSize?.width ?? 0)
  const h = Number(imageSize?.height ?? 0)
  if (!w || !h) return { width: 0, height: 0 }
  const cropW = Math.floor(Math.min(w, h * (16 / 9)))
  const cropH = Math.floor(cropW / (16 / 9))
  return { width: cropW, height: cropH }
}

const defaultPosition = centeredCropPosition

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

function onCropChange(e: CropperChangeEvent) {
  cropHasSelection.value = Boolean(e?.canvas)
}

async function onCropperReady() {
  if (!maxOnOpen.value) return
  maxOnOpen.value = false
  const cropper = cropperRef.value
  if (!cropper?.setCoordinates) return
  cropper.setCoordinates((state) => maxCenteredCrop(state, 16 / 9))
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

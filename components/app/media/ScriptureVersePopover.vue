<template>
  <ClientOnly>
    <Popover v-if="isDesktopHydrated" ref="popoverRef" @hide="onPopoverHide">
      <div class="flex max-h-[min(22rem,55vh)] w-[min(22rem,calc(100vw-2rem))] flex-col">
        <div class="shrink-0 px-3 pt-2.5">
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-[15px] font-semibold leading-5 text-balance text-gray-900 dark:text-gray-100">
              {{ displayedReference }}
            </p>
            <span class="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {{ verseData?.translationName ?? '' }}
            </span>
          </div>
          <div class="my-2.5 border-t border-gray-200/80 dark:border-zinc-700/80" />
        </div>

        <div class="min-h-0 overflow-y-auto overscroll-contain px-3 pb-2.5">
          <div v-if="loading" class="flex items-center justify-center py-3">
            <Icon name="tabler:loader-2" class="animate-spin text-xl text-gray-400" />
          </div>
          <AppScriptureVerseList
            v-else-if="verseData?.verses.length"
            :verses="verseData.verses"
          />
          <p v-else class="py-2 text-sm text-gray-500 dark:text-gray-400">
            Verse not found.
          </p>
        </div>
      </div>
    </Popover>

    <AppBottomSheet
      v-if="isMobileHydrated"
      v-model="mobileOpen"
      :title="displayedReference"
      panel-class="max-h-[min(85dvh,100%)] max-w-none overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-950"
      content-class="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 pt-0"
      @update:model-value="onMobileVisibleChange"
    >
      <template #header="{ close, titleId }">
        <header class="shrink-0 px-5 pt-5">
          <div class="flex min-h-10 items-center gap-3">
            <h2
              :id="titleId"
              class="min-w-0 flex-1 text-[17px] font-semibold leading-6 text-balance text-gray-900 dark:text-gray-100"
            >
              {{ displayedReference }}
            </h2>
            <span class="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {{ verseData?.translationName ?? '' }}
            </span>
            <button
              type="button"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-gray-50"
              aria-label="Close"
              @click="close"
            >
              <Icon name="tabler:x" aria-hidden="true" />
            </button>
          </div>
          <div class="mb-3 mt-2 border-t border-gray-200/80 dark:border-zinc-700/80" />
        </header>
      </template>

      <div v-if="loading" class="flex items-center justify-center py-4">
        <Icon name="tabler:loader-2" class="animate-spin text-xl text-gray-400" />
      </div>
      <AppScriptureVerseList
        v-else-if="verseData?.verses.length"
        :verses="verseData.verses"
      />
      <p v-else class="py-2 text-[15px] text-gray-500 dark:text-gray-400">
        Verse not found.
      </p>
    </AppBottomSheet>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useScripture } from '~/composables/useScripture'
import type { ScriptureRef } from '~/composables/useScripture'

const props = defineProps<{
  reference: string
  target: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const popoverRef = ref<any>(null)
const mobileOpen = ref(false)
const loading = ref(false)
const verseData = ref<ScriptureRef | null>(null)
const activeDesktopTarget = ref<HTMLElement | null>(null)
const isMobileHydrated = useHydratedMediaQuery('(max-width: 767px)')
const isDesktopHydrated = useHydratedMediaQuery('(min-width: 768px)')
let suppressNextPopoverHide = false
let loadSequence = 0

const { fetchRef } = useScripture()

const displayedReference = computed(() => verseData.value?.reference ?? props.reference)

async function loadReference(reference: string) {
  if (verseData.value?.reference === reference) return
  const sequence = ++loadSequence
  loading.value = true
  verseData.value = null
  const result = await fetchRef(reference)
  if (sequence !== loadSequence || props.reference !== reference) return
  verseData.value = result
  loading.value = false
}

async function openDesktop(targetEl: HTMLElement) {
  await nextTick()
  if (!popoverRef.value || !isDesktopHydrated.value) return

  if (activeDesktopTarget.value) {
    suppressNextPopoverHide = true
    popoverRef.value.hide()
    await nextTick()
  }

  popoverRef.value.show({ currentTarget: targetEl } as unknown as MouseEvent)
  activeDesktopTarget.value = targetEl
}

function onPopoverHide() {
  activeDesktopTarget.value = null
  if (suppressNextPopoverHide) {
    suppressNextPopoverHide = false
    return
  }
  emit('close')
}

function onMobileVisibleChange(visible: boolean) {
  if (!visible) emit('close')
}

watch(
  [() => props.target, () => props.reference, isMobileHydrated, isDesktopHydrated],
  async ([target, reference, mobile, desktop]) => {
    if (!target || !reference) return

    if (mobile) {
      if (activeDesktopTarget.value && popoverRef.value) {
        suppressNextPopoverHide = true
        popoverRef.value.hide()
      }
      mobileOpen.value = true
    } else if (desktop) {
      mobileOpen.value = false
      await openDesktop(target)
    } else {
      return
    }

    await loadReference(reference)
  },
  { immediate: true },
)
</script>

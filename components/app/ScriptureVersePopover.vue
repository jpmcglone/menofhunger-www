<template>
  <Popover ref="popoverRef" @hide="emit('close')">
    <div class="w-[min(22rem,calc(100vw-2rem))] p-1">
      <div v-if="loading" class="flex items-center justify-center py-6">
        <Icon name="tabler:loader-2" class="animate-spin text-xl text-gray-400" />
      </div>
      <div v-else-if="verseData" class="space-y-2">
        <div class="flex items-baseline justify-between gap-2">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ verseData.reference }}
          </p>
          <span class="shrink-0 text-xs text-gray-400 dark:text-gray-500">
            {{ verseData.translationName }}
          </span>
        </div>
        <div class="space-y-1">
          <p
            v-for="verse in verseData.verses"
            :key="verse.number"
            class="text-sm leading-relaxed text-gray-700 dark:text-gray-300"
          >
            <sup class="mr-0.5 text-[10px] text-gray-400 dark:text-gray-500 select-none">
              {{ verse.number }}
            </sup>{{ verse.text }}
          </p>
        </div>
      </div>
      <p v-else class="py-2 text-sm text-gray-400 dark:text-gray-500">
        Verse not found.
      </p>
    </div>
  </Popover>
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
const loading = ref(false)
const verseData = ref<ScriptureRef | null>(null)

const { fetchRef } = useScripture()

async function open(targetEl: HTMLElement) {
  if (!popoverRef.value) return
  popoverRef.value.show({ currentTarget: targetEl } as unknown as MouseEvent)
  if (verseData.value?.reference === props.reference) return
  loading.value = true
  verseData.value = null
  verseData.value = await fetchRef(props.reference)
  loading.value = false
}

watch(
  () => props.target,
  (el) => {
    if (el) open(el)
  },
  { immediate: true },
)
</script>

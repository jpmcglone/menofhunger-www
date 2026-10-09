<template>
  <div class="mt-4 border-t moh-border pt-4">
    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
      Rules
    </div>
    <div class="relative">
      <div
        ref="rulesContentRef"
        class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed overflow-hidden transition-[max-height] duration-300 ease-in-out"
        :style="{ maxHeight: rulesExpanded ? `${rulesFullHeight}px` : '3.25rem' }"
      >
        {{ rules }}
      </div>
      <button
        v-if="rulesOverflows"
        type="button"
        class="mt-1 text-xs font-medium text-[color:var(--moh-group)] hover:underline"
        @click="rulesExpanded = !rulesExpanded"
      >
        {{ rulesExpanded ? 'Show less' : 'See more' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ rules: string }>()

const rulesContentRef = ref<HTMLElement | null>(null)
const rulesExpanded = ref(false)
const rulesFullHeight = ref(0)
const rulesOverflows = ref(false)

function measureRules() {
  const el = rulesContentRef.value
  if (!el) return
  rulesFullHeight.value = el.scrollHeight
  rulesOverflows.value = el.scrollHeight > 52
}

onMounted(() => nextTick(measureRules))
watch(() => props.rules, () => {
  rulesExpanded.value = false
  nextTick(measureRules)
})
</script>

<template>
  <div>
    <div class="relative">
      <div :class="compact ? 'space-y-1.5' : 'space-y-2 sm:space-y-1.5'">
        <p
          v-for="(verse, index) in shown"
          :key="verse.number"
          class="grid grid-cols-[auto_1fr] items-start gap-1 moh-text"
          :class="[
            compact ? 'text-[13px] leading-5' : 'text-[15px] leading-6',
            truncated && index === shown.length - 1 ? 'scripture-peek-fade' : '',
          ]"
        >
          <span
            class="select-none font-medium tabular-nums moh-text-muted"
            :class="compact ? 'pt-0.5 text-[9px] leading-5' : 'pt-0.5 text-[10px] leading-5'"
          >
            {{ verse.number }}
          </span>
          <span class="text-pretty">{{ verse.text }}</span>
        </p>
      </div>
    </div>
    <p
      v-if="truncated"
      class="pt-2 text-xs font-medium tabular-nums tracking-wide text-amber-700 dark:text-amber-400"
    >
      {{ formatScriptureVerseCount(total) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ScriptureVerse } from '~/composables/useScripture'
import { formatScriptureVerseCount, peekScriptureVerses } from '~/utils/scripture-preview'

const props = withDefaults(defineProps<{
  verses: ScriptureVerse[]
  peek?: boolean
  compact?: boolean
}>(), {
  peek: false,
  compact: false,
})

const preview = computed(() => peekScriptureVerses(props.verses, props.peek))
const shown = computed(() => preview.value.shown)
const truncated = computed(() => preview.value.truncated)
const total = computed(() => preview.value.total)
</script>

<style scoped>
.scripture-peek-fade {
  mask-image: linear-gradient(to bottom, #000 35%, transparent);
}
</style>

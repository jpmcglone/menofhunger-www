<template>
  <div class="relative">
    <pre
      class="overflow-x-auto rounded-lg border border-[var(--moh-border-subtle)] bg-gray-50 py-3.5 pl-4 pr-20 text-[13px] leading-relaxed dark:bg-zinc-900/70"
    ><code class="font-mono text-gray-800 dark:text-gray-200">{{ code }}</code></pre>
    <button
      type="button"
      class="absolute right-2.5 top-2.5 rounded-md border border-[var(--moh-border-subtle)] bg-white/80 px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:bg-zinc-900/80 dark:text-gray-400 dark:hover:text-gray-50"
      @click="copy"
    >
      {{ copied ? 'Copied' : 'Copy' }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ code: string }>()

const { copyText } = useCopyToClipboard()
const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  await copyText(props.code)
  copied.value = true
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    copied.value = false
  }, 1500)
}

onBeforeUnmount(() => {
  if (resetTimer) clearTimeout(resetTimer)
})
</script>

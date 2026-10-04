<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=909-2167 -->
<template>
  <p v-if="line" class="moh-day-banner">{{ line }}</p>
</template>

<script setup lang="ts">
import { americanDay } from '~/utils/american-day'

const now = ref(new Date())
const line = computed(() => americanDay(now.value)?.line ?? null)

onMounted(() => {
  const tick = () => { now.value = new Date() }
  document.addEventListener('visibilitychange', tick)
  onBeforeUnmount(() => document.removeEventListener('visibilitychange', tick))
})
</script>

<style scoped>
.moh-day-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  margin: 0;
  background: color-mix(in srgb, var(--moh-brass) 10%, var(--moh-surface-1));
  color: var(--moh-text);
  font-size: 13px;
  font-weight: 500;
  line-height: 28px;
}
</style>

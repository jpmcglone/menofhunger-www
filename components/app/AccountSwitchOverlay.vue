<template>
  <ClientOnly>
    <dialog
      v-if="transition"
      ref="dialog"
      class="m-0 h-dvh max-h-none w-screen max-w-none border-0 p-6 moh-bg moh-text"
      aria-label="Switching accounts"
      tabindex="-1"
      @cancel.prevent
    >
      <div class="flex h-full flex-col items-center justify-center gap-4">
        <AppIconGlyph name="refresh" :size="24" class="moh-text-muted motion-safe:animate-spin" aria-hidden="true" />
        <p role="status" aria-live="polite" class="text-center text-sm moh-text-muted">
          Switching to {{ transition.label }}…
        </p>
        <Button v-if="showRecovery" label="Reload page" severity="secondary" rounded @click="resumeNavigation" />
      </div>
    </dialog>
  </ClientOnly>
</template>

<script setup lang="ts">
// Figma: YnuRSJB7p90n9jEY4mb4RN / 735:87 (native light/dark modes).
const { transition, resumeNavigation } = useAccountSwitchState()
const dialog = ref<HTMLDialogElement | null>(null)
const showRecovery = ref(false)

// Native modal/top-layer behavior also blocks keyboard interaction with the old
// account and its teleported menus. No dismiss during session rotation.
watchEffect(() => {
  if (dialog.value && !dialog.value.open) dialog.value.showModal()
}, { flush: 'post' })

watch(transition, (current, _previous, onCleanup) => {
  showRecovery.value = false
  if (!current) return
  const timer = setTimeout(() => { showRecovery.value = true }, 8_000)
  onCleanup(() => clearTimeout(timer))
})
</script>

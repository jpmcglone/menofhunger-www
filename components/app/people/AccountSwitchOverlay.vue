<template>
  <ClientOnly>
    <Transition name="account-switch" appear>
      <dialog
        v-if="transition"
        ref="dialog"
        class="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-6 moh-text"
        aria-label="Switching accounts"
        tabindex="-1"
        @cancel.prevent
      >
        <div class="flex h-full flex-col items-center justify-center gap-4">
          <AppAvatarCircle
            :src="transition.avatarUrl"
            :avatar-video="transition.avatarVideo"
            :name="transition.name || transition.label"
            :username="transition.username"
            size-class="h-28 w-28"
            :round-class="avatarRoundClass(transition.isOrganization === true)"
            :is-organization="transition.isOrganization === true"
            :show-presence="false"
          />
          <p role="status" aria-live="polite" class="text-center text-sm moh-text-muted">
            Switching to {{ transition.label }}…
          </p>
          <AppIconGlyph name="refresh" :size="24" class="moh-text-muted motion-safe:animate-spin" aria-hidden="true" />
          <Button v-if="showRecovery" label="Reload page" severity="secondary" rounded @click="resumeNavigation" />
        </div>
      </dialog>
    </Transition>
  </ClientOnly>
</template>

<script setup lang="ts">
// Figma: YnuRSJB7p90n9jEY4mb4RN / 735:87 (native light/dark modes).
import { avatarRoundClass } from '~/utils/avatar-rounding'

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

<style scoped>
dialog {
  background: color-mix(in srgb, var(--moh-bg) 38%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
dialog::backdrop {
  background: transparent;
}
.account-switch-enter-active,
.account-switch-leave-active {
  transition: opacity 200ms ease;
}
.account-switch-enter-from,
.account-switch-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .account-switch-enter-active,
  .account-switch-leave-active {
    transition: none;
  }
}
</style>

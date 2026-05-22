<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center bg-black/45 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          @click.self="close"
        >
          <Transition
            appear
            enter-active-class="transition-[opacity,transform] duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-3 scale-[0.97]"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-[opacity,transform] duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-2 scale-[0.97]"
          >
            <div
              class="w-80 rounded-3xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10 dark:bg-[color:var(--moh-surface-2)] dark:ring-white/15 overflow-hidden"
              role="dialog"
              aria-modal="true"
              :aria-label="`${displayName}'s status`"
              @click.stop
            >
              <!-- Avatar + name — themed with the card -->
              <div class="flex items-center gap-3 px-5 pt-5 pb-4">
                <div class="shrink-0">
                  <AppUserAvatar
                    :user="profile"
                    size-class="h-10 w-10"
                    bg-class="moh-surface"
                    :enable-preview="false"
                    :show-status="false"
                    :presence-scale="0.28"
                    :presence-inset-ratio="0.35"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="truncate text-sm font-semibold text-gray-900 dark:text-gray-50 leading-tight">{{ displayName }}</span>
                    <AppVerifiedBadge
                      :status="profile?.verifiedStatus"
                      :premium="profile?.premium"
                      :premium-plus="profile?.premiumPlus"
                      :is-organization="profile?.isOrganization"
                      :steward-badge-enabled="profile?.stewardBadgeEnabled ?? true"
                      :is-bot="profile?.isBot"
                      size="sm"
                    />
                    <AppOrgAffiliationAvatars
                      v-if="!profile?.isOrganization && profile?.orgAffiliations?.length"
                      :orgs="profile.orgAffiliations"
                      size="sm"
                    />
                  </div>
                  <div v-if="profile?.username" class="truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    @{{ profile.username }}
                  </div>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
                  aria-label="Close"
                  @click="close"
                >
                  <Icon name="tabler:x" class="text-[15px]" aria-hidden="true" />
                </button>
              </div>

              <!-- Status pill — always white with zinc-950 text, same as status pills everywhere -->
              <div class="px-5 pb-5">
                <div class="inline-flex w-full items-start gap-2 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/10">
                  <Icon
                    name="tabler:message-circle-filled"
                    class="mt-[3px] shrink-0 text-[15px] text-zinc-950"
                    aria-hidden="true"
                  />
                  <p class="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-zinc-950 whitespace-pre-wrap break-words">{{ statusText }}</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PublicProfile } from '~/types/api'

const props = defineProps<{
  open: boolean
  statusText: string
  profile?: PublicProfile | null
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
}>()

const displayName = computed(() => {
  const nm = (props.profile?.name ?? '').trim()
  if (nm) return nm
  const un = (props.profile?.username ?? '').trim()
  return un ? `@${un}` : 'User'
})

function close() {
  emit('update:open', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

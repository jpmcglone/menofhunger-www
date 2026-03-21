<template>
  <div class="relative overflow-hidden rounded-2xl moh-popover moh-card-matte">
    <div class="relative">
      <div class="relative aspect-[3/1] w-full moh-surface">
        <img
          v-if="preview.coverImageUrl"
          :src="preview.coverImageUrl"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        >
      </div>

      <div class="absolute left-4 bottom-0 translate-y-1/2">
        <div :class="['ring-4 ring-[color:var(--moh-surface-3)]', avatarRoundClass]">
          <NuxtLink
            :to="groupPath"
            :aria-label="`View ${preview.name}`"
            :class="['block moh-focus', avatarRoundClass]"
            @click="onNavigate"
          >
            <div
              class="h-16 w-16 overflow-hidden bg-gray-200 dark:bg-zinc-800"
              :class="avatarRoundClass"
            >
              <img
                v-if="preview.avatarImageUrl"
                :src="preview.avatarImageUrl"
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
              >
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-lg font-bold moh-text"
              >
                {{ initials }}
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="px-4 pb-4 pt-12">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <NuxtLink
            :to="groupPath"
            class="min-w-0 truncate hover:underline underline-offset-2 font-bold moh-text moh-focus block"
            :aria-label="`View ${preview.name}`"
            @click="onNavigate"
          >
            {{ preview.name }}
          </NuxtLink>
        </div>

        <div v-if="showJoin && !preview.viewerPendingApproval && !preview.viewerMembership" class="shrink-0 pt-0.5">
          <Button
            label="Join"
            rounded
            size="small"
            :loading="joinBusy"
            @click="$emit('join')"
          />
        </div>
        <div v-else-if="showJoin && preview.viewerPendingApproval" class="shrink-0 pt-0.5">
          <Button
            label="Request pending"
            rounded
            size="small"
            severity="secondary"
            disabled
          />
        </div>
      </div>

      <div
        v-if="preview.descriptionPreview"
        class="mt-2 text-sm moh-body whitespace-pre-wrap break-words max-h-[3rem] overflow-hidden line-clamp-2"
      >
        {{ preview.descriptionPreview }}
      </div>

      <div class="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        <div class="tabular-nums">
          <span class="font-semibold text-gray-900 dark:text-gray-50">{{ preview.memberCount.toLocaleString() }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">{{ preview.memberCount === 1 ? 'Member' : 'Members' }}</span>
        </div>
        <div v-if="preview.joinPolicy === 'approval'" class="text-xs moh-text-muted">
          Approval to join
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommunityGroupPreview } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'

const props = withDefaults(
  defineProps<{
    preview: CommunityGroupPreview
    showJoin?: boolean
    joinBusy?: boolean
  }>(),
  { showJoin: false },
)

defineEmits<{
  (e: 'join'): void
}>()

const avatarRoundClass = groupAvatarRoundClass()

const groupPath = computed(() => `/g/${encodeURIComponent(props.preview.slug)}`)

const initials = computed(() => {
  const n = (props.preview.name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})

const pop = useGroupPreviewPopover()
function onNavigate() {
  pop.close()
}
</script>

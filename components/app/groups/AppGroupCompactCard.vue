<template>
  <div
    class="group relative w-[180px] shrink-0 snap-start overflow-hidden rounded-2xl border moh-border moh-surface-2 transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-[color:rgba(var(--moh-group-rgb),0.4)]"
    role="link"
    tabindex="0"
    :aria-label="`Open ${group.name}`"
    @click="onRowClick(href, $event)"
    @auxclick="onRowAuxClick(href, $event)"
    @keydown.enter.prevent="navigateTo(href)"
    @keydown.space.prevent="navigateTo(href)"
  >
    <NuxtLink
      :to="href"
      class="absolute inset-0 z-[1]"
      tabindex="-1"
      aria-hidden="true"
    />

    <!-- Owner crown: just the icon, top-right of the CARD (not the avatar).
         A subtle drop-shadow keeps it readable when it lands over a bright
         banner image. z-[3] sits above the cover img + the link overlay. -->
    <Icon
      v-if="isOwner"
      name="tabler:crown-filled"
      class="absolute top-2 right-2 z-[3] text-base text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
      :title="`You own ${group.name}`"
      :aria-label="`You own ${group.name}`"
    />

    <div class="relative z-[2]">
      <!-- 3:1 banner. aspect-ratio (vs fixed h-20) keeps the proportion stable
           if the card width ever changes. -->
      <div class="relative aspect-[3/1] w-full overflow-hidden bg-gray-100 dark:bg-zinc-900">
        <img
          v-if="group.coverImageUrl"
          :src="group.coverImageUrl"
          alt=""
          class="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        >
        <div
          v-else
          class="h-full w-full"
          style="background: linear-gradient(135deg, rgba(var(--moh-group-rgb), 0.35), rgba(var(--moh-group-rgb), 0.08))"
          aria-hidden="true"
        />
      </div>

      <div class="px-3 pb-3 pt-0">
        <!-- z-10 explicitly stacks the avatar above the banner; without it,
             paint order can place the cover img on top of the negative-margin
             avatar in some browsers (notably when a banner image fills the
             cover). -->
        <div class="-mt-6 mb-2 relative z-10">
          <div
            class="ring-2 ring-[color:var(--moh-surface)] inline-block"
            :class="avatarRoundClass"
          >
            <div
              class="h-12 w-12 overflow-hidden bg-gray-200 dark:bg-zinc-800"
              :class="avatarRoundClass"
            >
              <img
                v-if="group.avatarImageUrl"
                :src="group.avatarImageUrl"
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
              >
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-base font-bold moh-text"
              >
                {{ initials }}
              </div>
            </div>
          </div>
        </div>

        <div class="text-sm font-semibold moh-text leading-snug line-clamp-2 min-h-[2.5em]">
          {{ group.name }}
        </div>
        <div class="mt-1 flex items-center gap-1.5 text-[11px] moh-text-muted tabular-nums">
          <Icon name="tabler:users" class="text-xs opacity-70" aria-hidden="true" />
          {{ memberCountLabel }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'

const props = defineProps<{
  group: CommunityGroupShell
}>()

const avatarRoundClass = groupAvatarRoundClass()

const href = computed(() => `/g/${encodeURIComponent(props.group.slug)}`)

const initials = computed(() => {
  const n = (props.group.name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0]
  const b = parts[1]?.[0]
  if (a && b) return (a + b).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})

const memberCountLabel = computed(() => {
  const n = Number(props.group.memberCount ?? 0)
  return Number.isFinite(n) ? n.toLocaleString() : '0'
})

const isOwner = computed(() => props.group.viewerMembership?.role === 'owner')

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(
    el.closest(
      ['a', 'button', 'iframe', 'input', 'textarea', 'select', '[role="menu"]', '[role="menuitem"]', '[data-pc-section]'].join(','),
    ),
  )
}

function onRowClick(target: string, e: MouseEvent) {
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    window.open(target, '_blank')
    return
  }
  void navigateTo(target)
}

function onRowAuxClick(target: string, e: MouseEvent) {
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  window.open(target, '_blank')
}
</script>

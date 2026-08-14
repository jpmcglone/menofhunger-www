<template>
  <Card v-if="displayRows.length" class="moh-card moh-card-matte !rounded-2xl">
    <template #title>
      <span class="moh-h2">Live spaces</span>
    </template>
    <template #content>
      <div class="space-y-1 text-sm">
        <NuxtLink
          v-for="row in displayRows"
          :key="row.space.id"
          :to="row.href"
          class="flex items-center gap-2.5 rounded-xl px-1 py-1.5 -mx-1 transition-colors moh-surface-hover"
        >
          <div
            class="h-9 w-9 shrink-0 overflow-hidden bg-gray-200 dark:bg-zinc-800"
            :class="avatarRoundClass(Boolean(row.space.owner?.isOrganization))"
          >
            <img
              v-if="row.space.owner?.avatarUrl"
              :src="row.space.owner.avatarUrl"
              alt=""
              class="h-full w-full object-cover"
              loading="lazy"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-[10px] font-bold moh-text"
            >
              {{ initials(row.space.owner?.username) }}
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-semibold moh-text truncate leading-tight">
                {{ spaceDisplayTitle(row.space) }}
              </span>
              <AppSpaceStatusBadge kind="live" size="sm" />
            </div>
            <div
              v-if="hereCount(row.space) > 0"
              class="text-xs moh-text-muted tabular-nums"
            >
              {{ hereCount(row.space).toLocaleString() }} here
            </div>
          </div>
        </NuxtLink>
        <NuxtLink
          v-if="liveSpaces.length > MAX_ROWS"
          to="/spaces"
          class="inline-block pt-3 text-sm font-medium hover:underline underline-offset-2"
        >
          Show more
        </NuxtLink>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { Space } from '~/types/api'
import { avatarRoundClass } from '~/utils/avatar-rounding'
import { spaceDisplayTitle } from '~/utils/space-display'

const MAX_ROWS = 4

const { spaces, loadSpaces } = useSpaces()
const { lobbyCountForSpace } = useSpaceLobby()

const liveSpaces = computed(() => {
  const rows: { space: Space; href: string }[] = []
  for (const space of spaces.value ?? []) {
    if (!space.isActive) continue
    const href = spaceHref(space)
    if (!href) continue
    rows.push({ space, href })
  }
  return rows
})

const displayRows = computed(() => liveSpaces.value.slice(0, MAX_ROWS))

function spaceHref(space: Space): string | null {
  const username = String(space.owner?.username ?? '').trim()
  if (!username) return null
  return `/s/${encodeURIComponent(username)}`
}

function hereCount(space: Space): number {
  const live = lobbyCountForSpace(space.id)
  if (live > 0) return live
  return Math.max(0, Math.floor(Number(space.listenerCount) || 0))
}

function initials(username: string | null | undefined): string {
  const n = String(username ?? '').trim()
  if (!n) return '?'
  return n.slice(0, 2).toUpperCase()
}

onMounted(() => {
  void loadSpaces()
})
</script>

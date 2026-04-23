<template>
  <div class="space-y-3 text-sm">
    <div v-if="loading && !displayRows.length" class="space-y-3 animate-pulse py-1">
      <div v-for="i in 3" :key="i" class="flex items-center gap-2.5">
        <div class="h-9 w-9 shrink-0 bg-gray-200 dark:bg-zinc-800" :class="avatarRoundClass" />
        <div class="flex-1 space-y-1.5 min-w-0">
          <div class="h-3 bg-gray-200 dark:bg-zinc-800 rounded-full w-2/3" />
          <div class="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded-full w-1/2" />
        </div>
      </div>
    </div>

    <template v-else-if="displayRows.length">
      <NuxtLink
        v-for="g in displayRows"
        :key="g.id"
        :to="`/g/${encodeURIComponent(g.slug)}`"
        class="flex items-center gap-2.5 rounded-xl px-1 py-1.5 -mx-1 transition-colors moh-surface-hover"
      >
        <div
          class="h-9 w-9 shrink-0 overflow-hidden bg-gray-200 ring-1 ring-[color:rgba(var(--moh-group-rgb),0.25)] dark:bg-zinc-800"
          :class="avatarRoundClass"
        >
          <img
            v-if="g.avatarImageUrl"
            :src="g.avatarImageUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
          >
          <div
            v-else
            class="flex h-full w-full items-center justify-center text-[10px] font-bold moh-text"
          >
            {{ initials(g.name) }}
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-semibold moh-text truncate leading-tight">
            {{ g.name }}
          </div>
          <div class="text-xs moh-text-muted tabular-nums">
            {{ g.memberCount.toLocaleString() }} members
          </div>
        </div>
        <Icon name="tabler:chevron-right" class="text-base shrink-0 opacity-40" aria-hidden="true" />
      </NuxtLink>
    </template>

    <p v-else class="moh-text-muted">
      You're not in any groups yet. Browse open groups and join one to see it here.
    </p>

    <Button
      as="NuxtLink"
      to="/groups/explore"
      label="Browse groups"
      text
      severity="secondary"
      class="w-full justify-center"
    />
  </div>
</template>

<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'

const { apiFetchData } = useApiClient()

const mine = ref<CommunityGroupShell[]>([])
const featured = ref<CommunityGroupShell[]>([])
const loading = ref(true)
const avatarRoundClass = groupAvatarRoundClass()

const displayRows = computed(() => {
  const rows: CommunityGroupShell[] = []
  const ids = new Set<string>()
  for (const g of mine.value) {
    if (ids.has(g.id)) continue
    rows.push(g)
    ids.add(g.id)
    if (rows.length >= 4) return rows
  }
  for (const g of featured.value) {
    if (ids.has(g.id)) continue
    rows.push(g)
    ids.add(g.id)
    if (rows.length >= 4) return rows
  }
  return rows
})

function initials(name: string) {
  const n = (name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

onMounted(async () => {
  loading.value = true
  try {
    const [myList, featList] = await Promise.all([
      apiFetchData<CommunityGroupShell[]>('/groups/me').catch(() => []),
      apiFetchData<CommunityGroupShell[]>('/groups/featured').catch(() => []),
    ])
    mine.value = Array.isArray(myList) ? myList : []
    featured.value = Array.isArray(featList) ? featList : []
  } finally {
    loading.value = false
  }
})
</script>

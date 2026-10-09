<template>
  <div v-if="locked" class="min-w-0 rounded-xl border moh-border moh-surface-1 p-3 text-left" data-testid="group-link-locked">
    <AppMembersLockedCta compact title="Group preview" :unlock="lockedUnlock" />
  </div>
  <AppExternalLinkCard
    v-else-if="group"
    :internal-path="path"
    class="block min-w-0 moh-card-frame moh-border moh-surface-1 moh-surface-hover moh-focus text-left"
    :aria-label="`Open ${group.name}`"
  >
    <div v-if="group.coverUrl" class="aspect-[3/1] w-full overflow-hidden moh-surface-2" aria-hidden="true">
      <AppPreviewImage :src="group.coverUrl" :referrerpolicy="null" decoding="async" class="h-full w-full object-cover" />
    </div>
    <div class="flex items-start gap-3 p-3">
      <AppGroupsGroupAvatar :name="group.name" :src="group.avatarUrl" :size="40" accented />
      <div class="min-w-0 flex-1 space-y-0.5">
        <div class="truncate text-sm font-semibold leading-5 moh-text">{{ group.name }}</div>
        <div v-if="group.description" class="line-clamp-2 text-xs leading-4 moh-text-muted">{{ group.description }}</div>
        <div class="truncate text-xs leading-4 moh-text-soft">
          {{ formatCount(group.memberCount) }} {{ group.memberCount === 1 ? 'member' : 'members' }} · {{ group.joinPolicy === 'open' ? 'Open to join' : 'Request to join' }}
        </div>
      </div>
    </div>
  </AppExternalLinkCard>
  <div v-else-if="loading" class="h-[72px] rounded-xl border moh-border moh-surface-1" aria-hidden="true" />
</template>

<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import type { LinkMetadata } from '~/utils/link-metadata'

type GroupCard = NonNullable<LinkMetadata['group']>

// Group cards are verified-only and viewer-specific, so they never share the URL-keyed link cache.
const props = defineProps<{ path: string }>()
const route = useRoute()
const { user, isVerifiedMember } = useAuth()
const { apiFetchData } = useApiClient()

const group = ref<GroupCard | null>(null)
const loading = ref(false)
const viewerKey = computed(() => `${user.value?.id ?? ''}:${isVerifiedMember.value}`)
const locked = computed(() => !user.value?.id || !isVerifiedMember.value)

const lockedUnlock = computed(() => (user.value?.id
  ? { label: 'Verify to see', to: '/settings/verification', body: 'Verified members can see group previews.' }
  : { label: 'Sign in to see', to: `/login?redirect=${encodeURIComponent(route.fullPath)}`, body: 'Sign in and verify to see group previews.' }))

async function load() {
  group.value = null
  if (locked.value || !import.meta.client) return
  loading.value = true
  try {
    const data = await apiFetchData<LinkMetadata | null>('/link-metadata', {
      method: 'GET',
      query: { url: new URL(props.path, window.location.origin).toString(), v: 4 },
      mohDedupe: true,
    })
    group.value = data?.group ?? null
  } catch {
    group.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([() => props.path, viewerKey], load)
</script>

<template>
  <div class="flex items-center gap-3">
    <NuxtLink :to="`/g/${encodeURIComponent(group.slug)}`" class="min-w-0 flex flex-1 items-center gap-3 min-h-11" :aria-label="`View ${group.name}`">
      <img v-if="imageUrl" :src="imageUrl" alt="" class="h-10 w-10 shrink-0 rounded-xl object-cover" loading="lazy" decoding="async">
      <span v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold moh-surface-2" aria-hidden="true">{{ initials }}</span>
      <span class="min-w-0">
        <span class="block truncate text-[15px] font-semibold">{{ group.name }}</span>
        <span class="block text-xs moh-text-muted">{{ memberLabel }}</span>
      </span>
    </NuxtLink>
    <button v-if="!joined" type="button" class="join-control" :disabled="busy" :aria-label="`${pending ? 'Requested' : 'Join'} ${group.name}`" :aria-busy="busy" @click="join">
      {{ busy ? 'Saving…' : pending ? 'Requested' : 'Join' }}
    </button>
    <span v-else class="join-control joined" role="status">Joined</span>
  </div>
  <p v-if="error" role="alert" class="text-xs moh-text-muted">{{ error }}</p>
</template>
<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import type { CommunityGroupShell } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
import { applyCommunityGroupJoin, communityGroupJoinToast } from '~/utils/community-group-preview'

const props = defineProps<{ group: CommunityGroupShell }>()
const emit = defineEmits<{ joined: [] }>()
const { apiFetchData } = useApiClient()
const { invalidate: invalidateMyGroups } = useMyGroups()
const toast = useAppToast()
const local = ref(props.group)
watch(() => props.group, (next) => { local.value = next })
const busy = ref(false)
const error = ref<string | null>(null)
const joined = computed(() => local.value.viewerMembership?.status === 'active')
const pending = computed(() => local.value.viewerPendingApproval)
const imageUrl = computed(() => props.group.avatarImageUrl || props.group.coverImageUrl || null)
const initials = computed(() => props.group.name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? '').join('').toUpperCase())
const memberLabel = computed(() => `${formatCount(Number(props.group.memberCount ?? 0))} ${props.group.memberCount === 1 ? 'member' : 'members'}`)
async function join() {
  if (busy.value || pending.value) return
  busy.value = true
  error.value = null
  try {
    const result = await apiFetchData<{ ok: boolean; status: 'active' | 'pending' }>(`/groups/${encodeURIComponent(props.group.id)}/join`, { method: 'POST', body: {} })
    const status = result?.status === 'pending' ? 'pending' : 'active'
    local.value = applyCommunityGroupJoin(local.value, status)
    invalidateMyGroups()
    toast.push(communityGroupJoinToast(status, props.group.name))
    emit('joined')
  } catch (cause) {
    error.value = getSafeUserErrorMessage(cause, 'Couldn’t join. Try again.')
  } finally { busy.value = false }
}
</script>
<style scoped>
.join-control { flex-shrink: 0; min-width: 104px; min-height: 46px; border: 1px solid var(--moh-border); border-radius: 999px; padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--moh-text); text-align: center; }
button.join-control:hover { background: var(--moh-surface-2); }
.joined { opacity: .7; display: inline-flex; align-items: center; justify-content: center; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
button:disabled { cursor: wait; opacity: .7; }
</style>

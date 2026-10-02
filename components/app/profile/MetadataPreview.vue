<template>
  <span
ref="trigger" class="inline-flex min-w-0" @pointerenter="enter" @pointerleave="leave"
    @focusin="focusIn" @focusout="focusOut" @keydown.esc.stop="close(true)" @keydown.tab="tabIntoCard"
    @contextmenu="contextPreview">
    <slot />
  </span>
  <Teleport v-if="open" to="body">
    <section
ref="card" role="dialog" :aria-label="`${title} preview`" tabindex="-1"
      class="fixed z-[var(--moh-z-menu)] w-[360px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl shadow-xl"
      :class="metadata?.profile ? 'bg-[#222a39] text-white ring-1 ring-white/10' : 'moh-popover moh-card-matte'"
      :style="{ ...position, visibility: positioned ? 'visible' : 'hidden' }" @pointerenter="cancelHide" @pointerleave="leave" @focusin="cancelHide"
      @focusout="focusOut" @keydown.esc.stop.prevent="close(true)">
      <template v-if="xProfile">
        <img v-if="xProfile.bannerUrl" :src="xProfile.bannerUrl" alt="" class="h-32 w-full object-cover" >
        <div class="space-y-3 p-5">
          <div class="flex items-end justify-between gap-3">
            <AppAvatarCircle :src="xProfile.avatarUrl" :name="xProfile.name" size-class="h-16 w-16" :class="xProfile.bannerUrl ? 'relative -mt-12 rounded-full ring-4 ring-[var(--moh-bg)]' : undefined" />
            <a :href="url" target="_blank" rel="noopener noreferrer nofollow" class="flex min-h-11 items-center rounded-full border moh-border px-4 text-sm font-semibold moh-text">View on X</a>
          </div>
          <div>
            <p class="flex items-center gap-1 text-xl font-bold moh-text">{{ xProfile.name }}
              <Icon v-if="xProfile.verified" name="tabler:rosette-discount-check-filled" class="text-sky-500" aria-label="Verified on X" />
            </p>
            <p class="flex flex-wrap items-center gap-2 moh-text-muted">@{{ xProfile.username }}<span v-if="xContext?.followsYou" class="rounded bg-black/10 px-1.5 text-xs dark:bg-white/10">Follows you</span><span v-if="xContext?.following" class="text-xs">Following</span></p>
          </div>
          <p v-if="xProfile.description" class="whitespace-pre-wrap break-words text-sm moh-text">{{ xProfile.description }}</p>
          <a
v-if="xProfile.websiteUrl" :href="xProfile.websiteUrl" target="_blank" rel="noopener noreferrer nofollow"
            class="inline-block min-h-11 break-all text-sm text-[var(--moh-link)]">{{ displayHost(xProfile.websiteUrl) }}</a>
          <div class="flex flex-wrap gap-4 text-sm moh-text-muted">
            <span v-if="xProfile.following !== null"><strong class="moh-text">{{ xProfile.following.toLocaleString() }}</strong> Following</span>
            <span v-if="xProfile.followers !== null"><strong class="moh-text">{{ new Intl.NumberFormat(undefined, { notation: xProfile.followers >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(xProfile.followers) }}</strong> Followers</span>
          </div>
        </div>
      </template>
      <template v-else-if="stateCode">
        <div class="space-y-3 p-5">
          <AppStateShape :state="stateCode" class="h-12 w-16 moh-text-muted" />
          <p class="font-semibold moh-text">{{ location?.location.stateDisplay ?? title }}</p>
          <p class="text-xs moh-text-muted">United States</p>
          <template v-if="location">
            <p class="text-sm moh-text">{{ location.memberCount ? `${location.memberCount.toLocaleString()} members` : 'No members to show yet' }}</p>
            <div class="flex items-center gap-1">
              <AppAvatarCircle v-for="member in members" :key="member.id" :src="member.avatarUrl" :name="member.name ?? member.username ?? 'Member'" size-class="h-7 w-7" />
              <span v-if="location.memberCount > members.length" class="ml-1 text-xs moh-text-muted">+{{ location.memberCount - members.length }}</span>
            </div>
          </template>
          <p v-else-if="!loading" class="text-sm moh-text-muted">Member preview unavailable</p>
        </div>
      </template>
      <template v-else-if="metadata?.profile">
        <a :href="url" target="_blank" rel="noopener noreferrer nofollow" class="block outline-offset-[-4px] focus-visible:outline-[#2cafff]" :aria-label="`Open ${metadata.title ?? title} on Pickax`">
          <img v-if="safeImage" :src="safeImage" alt="" class="block aspect-[3/1] w-full object-cover" >
          <div class="space-y-3 p-4">
            <div class="flex items-start justify-between gap-3">
              <AppAvatarCircle v-if="metadata.profile.avatarUrl" :src="metadata.profile.avatarUrl" :name="metadata.title ?? title" size-class="h-20 w-20" />
              <span class="ml-auto inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#2cafff]">
                View on Pickax <Icon name="tabler:arrow-up-right" class="text-base" aria-hidden="true" />
              </span>
            </div>
            <div>
              <p class="break-words text-xl font-semibold leading-snug text-white">{{ metadata.title ?? title }}</p>
              <p class="break-words text-sm text-[#a5a9b2]">@{{ metadata.profile.username }}</p>
            </div>
            <p v-if="metadata.description" class="line-clamp-5 whitespace-pre-line break-words text-sm text-[#a5a9b2]">{{ metadata.description }}</p>
            <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#a5a9b2]">
              <span v-if="metadata.profile.followers !== null"><strong class="text-white">{{ metadata.profile.followers.toLocaleString() }}</strong> Followers</span>
              <span v-if="metadata.profile.following !== null"><strong class="text-white">{{ metadata.profile.following.toLocaleString() }}</strong> Following</span>
            </div>
          </div>
        </a>
      </template>
      <template v-else>
        <a :href="url" target="_blank" rel="noopener noreferrer nofollow" class="block outline-offset-[-4px]" :aria-label="`Open ${metadata?.title ?? title}`">
          <img v-if="safeImage" :src="safeImage" alt="" class="h-48 w-full object-contain moh-surface-1" >
          <div class="space-y-3 p-4">
            <div class="flex items-center justify-between gap-3 text-xs moh-text-muted">
              <span>{{ displayHost(url) }}</span>
              <Icon name="tabler:arrow-up-right" class="shrink-0 text-base" aria-hidden="true" />
            </div>
            <p class="break-words text-base font-semibold leading-snug moh-text">{{ metadata?.title ?? title }}</p>
            <p v-if="metadata?.description" class="line-clamp-5 whitespace-pre-line text-sm moh-text-muted">{{ metadata.description }}</p>
            <p v-if="!metadata && !loading" class="text-sm moh-text-muted">{{ destinationLabel }}</p>
          </div>
        </a>
      </template>
      <p v-if="loading" role="status" class="px-5 pb-3 text-sm moh-text-muted">Loading preview…</p>
      <div v-if="stateCode || xContext?.messageUrl" class="space-y-2 px-5 pb-5">
        <a
v-if="xContext?.messageUrl" :href="xContext.messageUrl" target="_blank" rel="noopener noreferrer nofollow"
          class="flex min-h-11 items-center justify-center rounded-full border moh-border text-sm font-semibold moh-text">Message on X</a>
        <NuxtLink v-if="stateCode" :to="url" class="flex min-h-11 items-center justify-center rounded-full border moh-border text-sm font-semibold moh-text" @click="close()">Explore {{ location?.location.stateDisplay ?? title }}</NuxtLink>

      </div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import type { XProfilePreviewDto, XProfileContextDto } from '~/types/api-contracts.gen'
import type { LinkMetadata } from '~/utils/link-metadata'
import { isRecentTouch } from '~/utils/recent-touch'

const props = defineProps<{ url: string; title: string; stateCode?: string; xProfileUserId?: string }>()
const trigger = ref<HTMLElement>()
const card = ref<HTMLElement>()
const identity = useId()
const active = useState<string | null>('profile-metadata-preview', () => null)
const open = computed(() => active.value === identity)
const loading = ref(false)
const positioned = ref(false)
const metadata = ref<LinkMetadata | null>(null)
const xContext = ref<XProfileContextDto | null>(null)
let profileExpiry: ReturnType<typeof setTimeout> | undefined
let contextExpiry: ReturnType<typeof setTimeout> | undefined
const xProfile = ref<XProfilePreviewDto | null>(null)
type StatePreview = { location: { stateDisplay?: string }; memberCount: number; sections: { key: string; users: { id: string; name: string | null; username: string | null; avatarUrl: string | null }[] }[] }
const location = ref<StatePreview | null>(null)
const members = computed(() => location.value?.sections.find(section => section.key === 'sameState')?.users.slice(0, 6) ?? [])
const position = ref({ left: '12px', top: '12px', maxHeight: 'calc(100dvh - 24px)' })
const { apiFetchData } = useApiClient()
let showTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined
let request: AbortController | undefined
let revision = 0
let suppressFocus = false
const safeImage = computed(() => {
  try { const image = new URL(metadata.value?.imageUrl ?? ''); return ['http:', 'https:'].includes(image.protocol) ? image.href : null } catch { return null }
})
const destinationLabel = computed(() => {
  if (props.xProfileUserId) return 'View on X'
  const name = ({ 'pickax.com': 'Pickax', 'rumble.com': 'Rumble', 'linkedin.com': 'LinkedIn', 'youtube.com': 'YouTube' } as Record<string, string>)[displayHost(props.url)]
  return name ? `View on ${name}` : 'Visit website'
})
function displayHost(value: string) { try { return new URL(value).hostname.replace(/^www\./, '') } catch { return value } }
function cancelHide() { clearTimeout(hideTimer) }
function close(focus = false) {
  clearTimeout(showTimer); clearTimeout(contextExpiry); clearTimeout(profileExpiry); xContext.value = null; cancelHide(); request?.abort(); revision++
  if (open.value) active.value = null
  if (focus) { suppressFocus = true; trigger.value?.querySelector('a')?.focus() }
}
function place() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const height = Math.min(card.value?.offsetHeight ?? 400, window.innerHeight - 24)
  const width = Math.min(360, window.innerWidth - 24)
  const below = rect.bottom + 8
  const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 8)
  position.value = { left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`, top: `${top}px`, maxHeight: `${window.innerHeight - top - 12}px` }
}
async function show() {
  cancelHide(); clearTimeout(showTimer); clearTimeout(contextExpiry); clearTimeout(profileExpiry); xContext.value = null; request?.abort()
  const token = ++revision
  request = new AbortController()
  positioned.value = false
  active.value = identity; loading.value = true; metadata.value = null; xProfile.value = null; location.value = null
  try {
    if (props.stateCode) {
      const result = await apiFetchData<StatePreview>('/users/by-location', { query: { state: props.stateCode, limit: 6 }, signal: request.signal })
      if (token === revision) location.value = result
    } else if (props.xProfileUserId) {
      const result = await apiFetchData<XProfilePreviewDto | null>(`/me/integrations/x/profiles/${encodeURIComponent(props.xProfileUserId)}`, { signal: request.signal })
      if (result && token === revision && Date.parse(result.expiresAt) > Date.now()) {
        xProfile.value = result
        profileExpiry = setTimeout(() => { xProfile.value = null; xContext.value = null }, Date.parse(result.expiresAt) - Date.now())
        const context = await apiFetchData<XProfileContextDto | null>(`/me/integrations/x/profiles/${encodeURIComponent(props.xProfileUserId)}/context`, { signal: request.signal })
        if (token === revision && xProfile.value && context?.targetId === result.id && Date.parse(context.expiresAt) > Date.now()) {
          xContext.value = context
          contextExpiry = setTimeout(() => { xContext.value = null }, Date.parse(context.expiresAt) - Date.now())
        }
      }
    } else {
      const result = await apiFetchData<LinkMetadata | null>('/link-metadata', { query: { url: props.url, purpose: 'profile', v: 2 }, signal: request.signal })
      if (token === revision) metadata.value = result
    }
  } catch { /* Working external link remains available. */ }
  finally {
    if (token === revision) {
      loading.value = false
      await nextTick()
      if (token === revision && open.value) { place(); positioned.value = true }
    }
  }
}
function schedule() { cancelHide(); clearTimeout(showTimer); if (!open.value) showTimer = setTimeout(() => { void show() }, 300) }
function focusIn() { if (!suppressFocus) schedule() }
function enter(event: PointerEvent) { suppressFocus = false; if (event.pointerType !== 'touch' && !isRecentTouch()) schedule() }
function leave() { clearTimeout(showTimer); cancelHide(); hideTimer = setTimeout(() => {
  if (card.value?.contains(document.activeElement) || trigger.value?.contains(document.activeElement)) return
  close()
}, 500) }
function focusOut(event: FocusEvent) {
  suppressFocus = false
  if (event.relatedTarget instanceof Node && (card.value?.contains(event.relatedTarget) || trigger.value?.contains(event.relatedTarget))) return
  leave()
}
function tabIntoCard(event: KeyboardEvent) {
  if (open.value && positioned.value && !event.shiftKey) { event.preventDefault(); card.value?.querySelector('a')?.focus() }
}
function contextPreview(event: MouseEvent) {
  if (!isRecentTouch()) return // Keep the desktop browser's native context menu.
  event.preventDefault(); void show()
}
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !trigger.value?.contains(event.target) && !card.value?.contains(event.target)) close()
}
watch(() => [props.url, props.stateCode, props.xProfileUserId], () => close())
watch(open, visible => { if (!visible) { request?.abort(); revision++ } })
// Keep the landed card fixed. Scrolling its own content must not re-anchor it.
function viewportChanged(event: Event) {
  if (event.target instanceof Node && card.value?.contains(event.target)) return
  close()
}
onMounted(() => { window.addEventListener('resize', viewportChanged); window.addEventListener('scroll', viewportChanged, true); document.addEventListener('pointerdown', outside) })
onBeforeUnmount(() => { close(); window.removeEventListener('resize', viewportChanged); window.removeEventListener('scroll', viewportChanged, true); document.removeEventListener('pointerdown', outside) })
</script>

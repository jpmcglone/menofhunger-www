<!-- Fixed-shape preview for generic websites (custom embeds keep their own cards).
     Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=901-399 -->
<template>
  <component
    :is="previewOnly ? 'div' : 'a'"
    :href="previewOnly ? undefined : href"
    :target="previewOnly ? undefined : '_blank'"
    :rel="previewOnly ? undefined : 'noopener noreferrer nofollow ugc'"
    class="group relative flex h-[112px] w-full overflow-hidden rounded-xl border moh-border moh-surface-2 transition-colors moh-focus"
    :class="previewOnly ? '' : 'moh-surface-hover'"
    :aria-label="previewOnly ? undefined : ariaLabel"
    :aria-busy="state === 'loading' || undefined"
    @click.stop
  >
    <button
      v-if="dismissible"
      type="button"
      class="absolute left-0 top-0 z-10 flex h-11 w-11 items-center justify-center"
      aria-label="Remove preview"
      @click.stop.prevent="$emit('dismiss')"
    >
      <span class="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
        <Icon name="tabler:x" class="text-[12px]" aria-hidden="true" />
      </span>
    </button>
    <div class="relative h-full w-[112px] shrink-0 overflow-hidden bg-[var(--moh-surface-hover)]" aria-hidden="true">
      <div v-if="state === 'loading'" class="absolute inset-0 motion-safe:animate-pulse bg-[var(--moh-surface-hover)]" />
      <template v-else>
        <div v-if="!showImage" class="absolute inset-0 flex items-center justify-center">
          <Icon name="tabler:world" class="text-[28px] moh-text-soft" />
        </div>
        <img
          v-if="imageUrl && !imageFailed"
          :src="imageUrl"
          alt=""
          class="absolute inset-0 h-full w-full object-cover transition-opacity duration-150"
          :class="imageLoaded ? 'opacity-100' : 'opacity-0'"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @load="imageLoaded = true"
          @error="imageFailed = true"
        >
      </template>
    </div>

    <div class="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3.5 py-3">
      <div class="flex min-w-0 items-center gap-1.5 text-xs font-medium moh-text-soft">
        <Icon name="tabler:world" class="shrink-0 text-[12px]" aria-hidden="true" />
        <span class="truncate">{{ siteLabel }}</span>
      </div>

      <div v-if="state === 'loading'" class="flex flex-col gap-2 pt-1" aria-hidden="true">
        <div class="h-3 w-[85%] rounded-full motion-safe:animate-pulse bg-[var(--moh-surface-hover)]" />
        <div class="h-3 w-[55%] rounded-full motion-safe:animate-pulse bg-[var(--moh-surface-hover)]" />
        <div class="h-2.5 w-[40%] rounded-full motion-safe:animate-pulse bg-[var(--moh-surface-hover)]" />
      </div>

      <div v-else class="moh-link-card-in flex min-w-0 flex-col gap-1">
        <p class="line-clamp-2 text-[15px] font-semibold leading-5 moh-text" :class="previewOnly ? '' : 'group-hover:underline'">{{ displayTitle }}</p>
        <p v-if="state === 'ready' && description" class="truncate text-[13px] moh-text-muted">{{ description }}</p>
        <p v-else-if="state === 'unavailable'" class="flex items-center gap-1 text-[13px] moh-text-soft">
          Preview unavailable · Open link
          <Icon name="tabler:arrow-up-right" class="text-[12px]" aria-hidden="true" />
        </p>
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
const props = defineProps<{
  href: string
  siteLabel: string
  state: 'loading' | 'ready' | 'unavailable'
  title?: string | null
  description?: string | null
  imageUrl?: string | null
  /** Drafts: same card, not a link. */
  previewOnly?: boolean
  /** Composer: show a remove control over the thumbnail. */
  dismissible?: boolean
}>()
defineEmits<{ dismiss: [] }>()

const imageLoaded = ref(false)
const imageFailed = ref(false)
watch(() => props.imageUrl, () => {
  imageLoaded.value = false
  imageFailed.value = false
})

const showImage = computed(() => Boolean(props.imageUrl && !imageFailed.value && imageLoaded.value))
const displayTitle = computed(() => (props.state === 'ready' && props.title?.trim()) || props.siteLabel)
const ariaLabel = computed(() => (props.state === 'loading' ? `Open ${props.siteLabel}` : `Open ${displayTitle.value}`))
</script>

<style scoped>
.moh-link-card-in {
  animation: moh-link-card-in 150ms ease-out;
}

@keyframes moh-link-card-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .moh-link-card-in { animation: none; }
}
</style>

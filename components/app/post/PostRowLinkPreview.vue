<template>
  <div v-if="showAny" class="mt-3" :inert="previewInteractionLocked || undefined">
    <AppSpotifyEmbed v-if="showLinkPreview && spotifyPreview" :content="spotifyPreview" />
    <!-- Portrait frames get an explicit px width so they do not shrink-to-fit. -->
    <div
      v-else-if="youtubeEmbedUrl || isPreviewLinkRumble"
      :style="videoFrameStyle"
    >
    <div
      class="moh-card-frame moh-border bg-black/5 dark:bg-white/5"
      data-post-row-interactive
    >
      <!-- YouTube: 16:9 landscape or 9:16 portrait for Shorts.
           Rumble: encoded file size from the API (fallback 854x480). -->
      <iframe
        v-if="direct && !previewOnly && directEmbedSrc"
        :src="directEmbedSrc"
        class="block w-full border-0"
        :style="videoBoxStyle"
        allow="fullscreen; encrypted-media; picture-in-picture"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
        :title="youtubeOEmbed?.title || 'Video'"
      />
      <div v-else-if="direct && !previewOnly" class="w-full bg-black" :style="videoBoxStyle" />
      <AppEmbeddedVideoPlayer
        v-else-if="!previewOnly"
        :youtube-url="youtubeEmbedUrl ? previewLink : null"
        :rumble-url="rumbleEmbedUrl"
        :poster="youtubePosterSrc || rumblePosterUrl"
        :title="youtubeOEmbed?.title"
        :author="youtubeOEmbed?.authorName"
        :frame-style="videoBoxStyle"
        @poster-error="onPosterError"
      />
      <img v-else-if="youtubePosterSrc || rumblePosterUrl" :src="youtubePosterSrc || rumblePosterUrl || ''" :style="videoBoxStyle" class="w-full object-cover" alt="Video preview">

    </div>
    <div v-if="isPreviewLinkRumble && previewLink" class="mt-2 flex justify-end">
      <a
        :href="previewLink || undefined"
        target="_blank"
        rel="noopener noreferrer"
        class="text-[11px] font-semibold transition-colors"
        style="color: #85c742;"
        aria-label="Open on Rumble"
        @click.stop="confirmExternal($event, previewLink)"
      >
        Open on Rumble
      </a>
    </div>
    </div>

    <!-- MoH internal link preview — branded card, navigates in-app -->
    <AppFeatureLinkPreview
      v-else-if="showLinkPreview && isMohInternalLink && mohInternalPath"
      :path="mohInternalPath"
      :metadata="linkMeta"
    />

    <AppXPostPreviewCard
      v-else-if="showLinkPreview && xPostMeta && previewLink"
      :post="xPostMeta"
      :href="previewLink"
    />

    <AppSubstackPostCard
      v-else-if="showLinkPreview && substackMeta && substackMeta.title && previewLink"
      :meta="substackMeta"
      :href="previewLink"
    />

    <AppLinkCard
      v-else-if="showGenericWebsitePreview && previewLink && (!mayBecomeCustomEmbed || linkMetaSettled)"
      :href="previewLink"
      :site-label="linkCardSiteLabel"
      :state="linkCardState"
      :title="linkMeta?.title || linkMeta?.siteName"
      :description="linkMeta?.description"
      :image-url="linkMeta?.imageUrl"
      :preview-only="previewOnly"
      :dismissible="dismissible"
      @dismiss="dismissGenericPreview"
    />

    <!-- Scripture preview card: lowest priority, only when slot is otherwise empty and
         exactly one scripture reference is present in the post body. -->
    <AppScriptureVerseCard
      v-if="singleScriptureRef && rowInView"
      :reference="singleScriptureRef"
    />

    <!-- MOH article link → article share card (or skeleton while fetching) -->
    <!-- Suppressed when a preloaded article is passed in — the parent PostRow renders
         AppArticleShareCard directly in that case to avoid a duplicate card. -->
    <template v-if="embeddedArticleId && !preloadedArticle">
      <!-- Resolved -->
      <div v-if="embeddedArticle" data-post-row-interactive @click.stop>
        <AppArticleShareCard :article="embeddedArticle" />
      </div>
      <!-- Skeleton: matches AppArticleShareCard layout so the row height is stable -->
      <div
        v-else-if="rowInView"
        class="mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-700 animate-pulse"
        aria-hidden="true"
      >
        <!-- Thumbnail placeholder (16:9) -->
        <div class="aspect-[16/9] w-full bg-gray-200 dark:bg-zinc-800" />
        <!-- Content placeholder -->
        <div class="p-3 space-y-2">
          <!-- Label row -->
          <div class="h-2.5 w-16 rounded bg-gray-200 dark:bg-zinc-700" />
          <!-- Title -->
          <div class="h-3.5 w-4/5 rounded bg-gray-200 dark:bg-zinc-700" />
          <div class="h-3.5 w-3/5 rounded bg-gray-200 dark:bg-zinc-700" />
          <!-- Excerpt -->
          <div class="h-2.5 w-full rounded bg-gray-200 dark:bg-zinc-700" />
          <div class="h-2.5 w-2/3 rounded bg-gray-200 dark:bg-zinc-700" />
          <!-- Author row -->
          <div class="flex items-center gap-1.5 pt-1">
            <div class="h-4 w-4 rounded-full bg-gray-200 dark:bg-zinc-700 shrink-0" />
            <div class="h-2.5 w-24 rounded bg-gray-200 dark:bg-zinc-700" />
          </div>
        </div>
      </div>
    </template>

    <!-- Stop propagation so the parent PostRow's row-click handler never fires when
         clicking the embedded preview — the NuxtLink inside handles navigation. -->
    <div v-if="embeddedPostId" data-post-row-interactive @click.stop>
      <AppEmbeddedPostPreview
        :post-id="embeddedPostId"
        :preloaded-post="props.quotedPost ?? undefined"
        :enabled="embeddedPreviewEnabled"
      />
    </div>

    <!-- Space preview — rendered as a card using the exact same row as /spaces -->
    <template v-if="hasEmbeddedSpace && rowInView">
      <!-- Skeleton while the space store is loading -->
      <div
        v-if="!embeddedSpace"
        class="moh-card-frame moh-border animate-pulse"
        aria-hidden="true"
      >
        <div class="flex items-center gap-3 px-4 py-2.5">
          <div class="h-8 w-8 shrink-0 rounded-full bg-black/10 dark:bg-white/10" />
          <div class="flex-1 space-y-1.5">
            <div class="h-3 w-2/5 rounded bg-black/10 dark:bg-white/10" />
            <div class="h-2.5 w-1/3 rounded bg-black/10 dark:bg-white/10" />
          </div>
        </div>
      </div>
      <!-- Resolved space — AppSpaceRow is already the card -->
      <div v-else data-post-row-interactive @click.stop>
        <AppSpaceRow :space="embeddedSpace" preview />
      </div>
    </template>

    <!-- User profile link → compact user card -->
    <div v-if="embeddedUsername && rowInView" data-post-row-interactive @click.stop>
      <AppUserLinkCard :username="embeddedUsername" :enabled="rowInView" />
    </div>

  </div>
</template>

<script setup lang="ts">
const { onClick: confirmExternal } = useExternalLinkConfirm()
import type { ArticleSharePreview, PostVideoEmbed } from '~/types/api'
import { usePostLinkPreviewData } from '~/composables/post-row/usePostLinkPreviewData'
import { usePostLinkPreviewKind } from '~/composables/post-row/usePostLinkPreviewKind'
import { usePostLinkTargets } from '~/composables/post-row/usePostLinkTargets'

const props = defineProps<{
  postId: string
  body: string
  hasMedia: boolean
  rowInView: boolean
  activateVideoOnMount?: boolean
  /** Drafts share the exact card layout without participating in feed autoplay. */
  previewOnly?: boolean
  /** One video on a page, with no feed of others. The provider's own player, paused, with sound. */
  direct?: boolean
  /** Composer-only: show a dismiss control on generic website cards. */
  dismissible?: boolean
  /** When provided, used immediately as the article preview — no fetch needed. */
  preloadedArticle?: ArticleSharePreview | null
  /** When provided, used immediately as the embedded post preview — no fetch needed. */
  quotedPost?: import('~/types/api').FeedPost | null
  /** Server-cached embed for the preview link — sizes the player before any fetch. */
  videoEmbed?: PostVideoEmbed | null
}>()

const targets = usePostLinkTargets(props)
const data = usePostLinkPreviewData(props, targets)
const kind = usePostLinkPreviewKind(props, targets, data)

const { previewLink, showLinkPreview, embeddedPostId, embeddedArticleId, hasEmbeddedSpace, embeddedUsername } = targets
const {
  embeddedArticle, embeddedSpace, youtubeEmbedUrl, youtubeOEmbed, youtubePosterSrc, onPosterError,
  isPreviewLinkRumble, rumbleEmbedUrl, rumblePosterUrl, directEmbedSrc, videoFrameStyle, videoBoxStyle, linkMeta, linkMetaSettled,
} = data
const {
  previewInteractionLocked, spotifyPreview, xPostMeta, substackMeta, isMohInternalLink, mohInternalPath,
  showGenericWebsitePreview, mayBecomeCustomEmbed, linkCardSiteLabel, linkCardState, dismissGenericPreview,
  singleScriptureRef, embeddedPreviewEnabled, showAny,
} = kind
</script>

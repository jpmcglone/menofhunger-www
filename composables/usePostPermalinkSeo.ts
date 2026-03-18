import type { ComputedRef, Ref } from 'vue'
import type { FeedPost } from '~/types/api'
import type { LinkMetadata } from '~/utils/link-metadata'
import { siteConfig } from '~/config/site'
import {
  computePostPermalinkSeo,
  type PostPermalinkPrimaryMedia,
  type PostPermalinkPrimaryVideo,
} from '~/utils/post-permalink-seo-meta'

export type { PostPermalinkPrimaryMedia, PostPermalinkPrimaryVideo }

export function usePostPermalinkSeo(opts: {
  postId: ComputedRef<string>
  post: Ref<FeedPost | null>
  errorText: Ref<string | null>
  isRestricted: ComputedRef<boolean>
  restrictionLabel: ComputedRef<string>
  restrictionSeoDescription: ComputedRef<string>
  previewLink: ComputedRef<string | null>
  linkMeta: ComputedRef<LinkMetadata | null>
  primaryMedia: ComputedRef<PostPermalinkPrimaryMedia | null | undefined>
  extraOgMediaUrls: ComputedRef<string[]>
  primaryVideo?: ComputedRef<PostPermalinkPrimaryVideo | null>
  bodyTextSansLinks: ComputedRef<string>
}) {
  const seo = computed(() =>
    computePostPermalinkSeo({
      post: opts.post.value,
      postId: opts.postId.value,
      errorText: opts.errorText.value,
      isRestricted: opts.isRestricted.value,
      restrictionLabel: opts.restrictionLabel.value,
      restrictionSeoDescription: opts.restrictionSeoDescription.value,
      previewLink: opts.previewLink.value,
      linkMeta: opts.linkMeta.value,
      primaryMedia: opts.primaryMedia.value,
      extraOgMediaUrls: opts.extraOgMediaUrls.value,
      primaryVideo: opts.primaryVideo?.value,
      bodyTextSansLinks: opts.bodyTextSansLinks.value,
    }),
  )

  const canonicalPath = computed(() => seo.value.canonicalPath)

  usePageSeo({
    title: computed(() => seo.value.title),
    description: computed(() => seo.value.description),
    canonicalPath,
    ogType: computed(() => seo.value.ogType),
    image: computed(() => seo.value.image),
    imageAlt: computed(() => seo.value.imageAlt),
    imageWidth: computed(() => seo.value.imageWidth),
    imageHeight: computed(() => seo.value.imageHeight),
    noindex: computed(() => seo.value.noindex),
    author: computed(() => seo.value.author),
    jsonLdGraph: computed(() => seo.value.jsonLdGraph),
  })

  useHead({
    meta: computed(() => {
      if (!opts.post.value) return []
      const p = opts.post.value
      const s = seo.value
      const username = (p.author.username ?? '').trim()
      const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
      const poll = p.visibility === 'public' && (p as any).poll
      const meta: Array<{ property?: string; name?: string; content: string }> = [
        { property: 'article:published_time', content: p.createdAt },
        { property: 'article:modified_time', content: p.createdAt },
        ...(authorUrl ? [{ property: 'article:author', content: authorUrl }] : []),
        ...(poll ? [{ property: 'article:tag', content: 'Poll' }] : []),
        ...s.ogImageSecondaryAbsoluteUrls.map((u) => ({ property: 'og:image', content: u })),
      ]
      const video = p.visibility === 'public' ? opts.primaryVideo?.value : null
      if (video && s.ogVideoAbsoluteUrl) {
        const absVideoUrl = s.ogVideoAbsoluteUrl
        meta.push({ property: 'og:video', content: absVideoUrl })
        meta.push({ property: 'og:video:url', content: absVideoUrl })
        meta.push({ property: 'og:video:type', content: 'video/mp4' })
        if (video.width != null && video.width > 0 && video.height != null && video.height > 0) {
          meta.push({ property: 'og:video:width', content: String(video.width) })
          meta.push({ property: 'og:video:height', content: String(video.height) })
        }
        meta.push({ name: 'twitter:player', content: absVideoUrl })
        if (video.width != null && video.height != null) {
          meta.push({ name: 'twitter:player:width', content: String(video.width) })
          meta.push({ name: 'twitter:player:height', content: String(video.height) })
        }
      }
      return meta
    }),
  })
}

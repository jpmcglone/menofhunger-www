import { extractLinksFromText, extractMohArticleId, extractMohPostId, isMohUrl, safeUrlHostname } from './link-utils'

export type ComposerLinkTarget = { url: string, postId: string | null, articleId: string | null, internal: boolean }

/** Match the feed's preference for internal post/article embeds, then the last link. */
export function composerLinkTarget(text: string): ComposerLinkTarget | null {
  const links = extractLinksFromText(text).reverse()
  const url = links.find(link => extractMohPostId(link))
    ?? links.find(link => extractMohArticleId(link))
    ?? links.find(link => isMohUrl(link))
    ?? links[0]
  if (!url) return null
  return { url, postId: extractMohPostId(url), articleId: extractMohArticleId(url), internal: isMohUrl(url) }
}

export function composerLinkHost(url: string): string {
  return safeUrlHostname(url)?.replace(/^www\./, '') ?? 'Link'
}

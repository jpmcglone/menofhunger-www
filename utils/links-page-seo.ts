import { siteConfig } from '~/config/site'
import type { LinksPage } from '~/types/api'
import { CONNECTED_NETWORK_LABELS, linksPageOgImagePath, linksPagePath } from '~/utils/profile-link-icons'

type JsonLdNode = Record<string, unknown>

function snippet(text: string, max = 180): string {
  const normalized = text.trim().replace(/\s+/g, ' ')
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

/** Only consume the API's public links-page projection, never viewer/session data. */
export function linksPageSeo(page: LinksPage | null | undefined, requestedUsername: string) {
  const username = (page?.user.username ?? requestedUsername).trim().toLowerCase()
  const canonicalPath = linksPagePath(username)
  if (!page) {
    return {
      title: 'Page not available',
      description: `This page isn't available on ${siteConfig.name}.`,
      canonicalPath,
      noindex: true,
      ogType: 'website' as const,
      webPageType: 'WebPage' as const,
      jsonLdGraph: [] as JsonLdNode[],
    }
  }

  const { user, connectedAccounts, links, recent } = page
  const displayName = user.name?.trim() || `@${username}`
  const title = user.name?.trim() ? `${displayName} (@${username}) · Links` : `${displayName} · Links`
  const sections = [
    links.length ? 'links' : null,
    connectedAccounts.length ? 'connected accounts' : null,
    recent.length ? 'recent posts' : null,
  ].filter(Boolean)
  const summary = sections.length
    ? `Explore ${displayName}'s ${sections.join(', ')} on ${siteConfig.name}.`
    : `${displayName}'s links page on ${siteConfig.name}.`
  const description = snippet(user.bio?.trim() ? `${snippet(user.bio, 110)} ${summary}` : summary)
  const url = `${siteConfig.url}${canonicalPath}`
  const profileUrl = `${siteConfig.url}/u/${encodeURIComponent(username)}`
  const mainEntityId = `${profileUrl}#identity`
  const entity: JsonLdNode = {
    '@type': user.isOrganization ? 'Organization' : 'Person',
    '@id': mainEntityId,
    name: displayName,
    alternateName: `@${username}`,
    url: profileUrl,
    ...(user.bio?.trim() ? { description: user.bio.trim() } : {}),
    ...(user.avatarUrl ? { image: user.avatarUrl } : {}),
    // Custom links may promote someone else's content; only connected accounts
    // establish this member's identity on another service.
    ...(connectedAccounts.length ? { sameAs: [...new Set(connectedAccounts.map((account) => account.url))] } : {}),
  }
  const jsonLdGraph: JsonLdNode[] = [entity]
  const lists = [
    {
      id: 'connected-accounts', name: 'Connected accounts',
      items: connectedAccounts.map((account) => ({ url: account.url, name: `${CONNECTED_NETWORK_LABELS[account.network]} · @${account.handle}` })),
    },
    { id: 'links', name: 'Links', items: links.map((link) => ({ url: link.url, name: link.title })) },
    {
      id: 'recent', name: `Recent on ${siteConfig.name}`,
      items: recent.map((item) => ({
        url: `${siteConfig.url}/${item.kind === 'article' ? 'a' : 'p'}/${encodeURIComponent(item.id)}`,
        name: item.kind === 'article' ? item.title || item.excerpt : item.excerpt,
      })),
    },
  ]
  for (const list of lists) {
    if (!list.items.length) continue
    jsonLdGraph.push({
      '@type': 'ItemList',
      '@id': `${url}#${list.id}`,
      name: list.name,
      isPartOf: { '@id': `${url}#webpage` },
      numberOfItems: list.items.length,
      itemListElement: list.items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })),
    })
  }

  return {
    title,
    description,
    canonicalPath,
    author: displayName,
    image: linksPageOgImagePath(username),
    imageAlt: `${title} on ${siteConfig.name}`,
    imageWidth: 1200,
    imageHeight: 630,
    noindex: false,
    ogType: 'profile' as const,
    webPageType: 'ProfilePage' as const,
    mainEntityId,
    jsonLdGraph,
  }
}

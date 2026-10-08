import { formatCount } from '~/utils/number-format'
import { siteConfig } from '~/config/site'
import type { CommunityGroupShell } from '~/types/api'

type GroupSeoInput = Pick<CommunityGroupShell, 'slug' | 'name' | 'description' | 'avatarImageUrl' | 'coverImageUrl' | 'memberCount' | 'joinPolicy'>

const plural = (count: number) => `${formatCount(count)} ${count === 1 ? 'member' : 'members'}`
const clip = (value: string, max: number) => value.length <= max ? value : `${value.slice(0, max - 1).replace(/\s+\S*$/, '')}…`

/**
 * Public-only metadata for a group. Built from the group shell alone: channel names, messages and
 * member lists never appear, so shared channel and message links preview the group, not private chat.
 */
export function groupSeo(group: GroupSeoInput | null | undefined) {
  if (!group) return null
  const open = group.joinPolicy === 'open'
  const access = open ? 'Open to join — no approval needed.' : 'Request to join.'
  const about = group.description?.trim() ? `${clip(group.description.trim().replace(/\s+/g, ' '), 150)} ` : `${group.name} on ${siteConfig.name}. `
  const description = `${about}${plural(group.memberCount)}. ${access}`
  // A wide cover makes a large card; a square avatar is a small card and must not claim 1200x630.
  const image = group.coverImageUrl || group.avatarImageUrl || undefined
  const wide = Boolean(group.coverImageUrl)
  const canonicalPath = `/g/${encodeURIComponent(group.slug)}`
  const url = `${siteConfig.url}${canonicalPath}`
  const jsonLdGraph = [
    {
      '@type': 'Organization',
      '@id': `${url}#group`,
      name: group.name,
      url,
      description: group.description?.trim() || undefined,
      logo: group.avatarImageUrl || undefined,
      image: image,
      parentOrganization: { '@id': `${siteConfig.url}/#organization` },
      potentialAction: { '@type': 'JoinAction', target: url, name: open ? `Join ${group.name}` : `Request to join ${group.name}` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: siteConfig.name, item: siteConfig.url },
        { '@type': 'ListItem', position: 2, name: 'Groups', item: `${siteConfig.url}/groups` },
        { '@type': 'ListItem', position: 3, name: group.name, item: url },
      ],
    },
  ]
  return {
    title: `${group.name} — ${open ? 'Open group' : 'Group'}`,
    description,
    image,
    imageAlt: `${group.name} group on ${siteConfig.name}`,
    imageWidth: wide ? 1200 : 512,
    imageHeight: wide ? 630 : 512,
    twitterCard: wide ? 'summary_large_image' as const : 'summary' as const,
    canonicalPath,
    jsonLdGraph,
  }
}

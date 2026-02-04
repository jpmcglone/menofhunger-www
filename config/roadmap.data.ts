/**
 * Roadmap content — single source of truth for the roadmap page.
 * Update the JSON to change copy; the page and SEO (meta + JSON-LD) stay in sync.
 */

import roadmapData from './roadmap.data.json'

export type RoadmapChunk = {
  title: string
  items: RoadmapItem[]
}

export type RoadmapItem = {
  text: string
  done?: boolean
}

export type RoadmapPhase = {
  id: string
  date: string
  datetime: string
  badge: string
  title: string
  description: string
  /** First phase gets premium accent and filled bullets */
  isHighlight?: boolean
  chunks: RoadmapChunk[]
}

export type RoadmapBacklog = {
  badge: string
  title: string
  description: string
  chunks: RoadmapChunk[]
}

type RoadmapData = {
  asOfDate: string
  intro: {
    label: string
    title: string
    description: string
  }
  phases: RoadmapPhase[]
  backlog: RoadmapBacklog
  footerDisclaimer: string
  metaDescription: string
}

const roadmapSource = roadmapData as RoadmapData

export const roadmapAsOfDate = roadmapSource.asOfDate
export const roadmapIntro = roadmapSource.intro
export const roadmapPhases = roadmapSource.phases
export const roadmapBacklog = roadmapSource.backlog
export const roadmapFooterDisclaimer = roadmapSource.footerDisclaimer

/** Brief meta description for link previews and og:description (keep short for unfurls). */
export const roadmapMetaDescription = roadmapSource.metaDescription

/** Build a longer description for SEO/JSON-LD from the roadmap. */
export function getRoadmapSeoDescription(): string {
  const phaseSummaries = roadmapPhases.map((p) => `${p.date}: ${p.title}`).join('. ')
  return `Men of Hunger product roadmap (as of ${roadmapAsOfDate}). ${phaseSummaries}. ${roadmapBacklog.title} for future features.`
}

/** Build JSON-LD ItemList for the roadmap milestones (for SEO). */
export function getRoadmapJsonLd(canonicalUrl: string): object {
  const listItems = roadmapPhases.map((phase, index) => ({
    '@type': 'ListItem' as const,
    position: index + 1,
    name: `${phase.date} — ${phase.title}`,
    description: phase.description,
    url: `${canonicalUrl}#${phase.id}`
  }))

  return {
    '@type': 'ItemList',
    name: roadmapIntro.title,
    description: getRoadmapSeoDescription(),
    numberOfItems: roadmapPhases.length,
    itemListElement: listItems
  }
}

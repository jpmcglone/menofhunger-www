/**
 * Roadmap content — single source of truth for the roadmap page.
 * Update this file to change copy; the page and SEO (meta + JSON-LD) stay in sync.
 */

export const roadmapAsOfDate = 'Feb. 3, 2026'

export const roadmapIntro = {
  label: 'Product roadmap',
  title: "Where we're headed",
  description:
    "We're building in two phases: Phase 1 is getting the community on and active so your feed feels alive. Phase 2 is making discovery and content so good that when new people show up, there's plenty to see and do."
}

export type RoadmapChunk = {
  title: string
  items: string[]
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

export const roadmapPhases: RoadmapPhase[] = [
  {
    id: 'march-2026',
    date: 'March 1, 2026',
    datetime: '2026-03-01',
    badge: 'Phase 1 — Get people on',
    title: 'Early Beta: get on board and stay in the loop',
    description:
      "A clear landing and onboarding so you can join and post quickly. A feed that's never empty (discover and suggested users), ways to invite friends, and notifications and email so you stay in the loop. Premium subscriptions so you can support the product and unlock longer posts, video, and premium-only content. A simple way to report issues from day one.",
    isHighlight: true,
    chunks: [
      {
        title: 'Premium',
        items: [
          '**Stripe subscriptions** — Subscribe with a card; premium unlocks longer posts, video uploads, and premium-only content. Not live yet.'
        ]
      },
      {
        title: 'Getting started & discovery',
        items: [
          '**Landing & onboarding** — Clear homepage and signup; smooth onboarding so you can post and follow in your first session.',
          '**Discover / non-empty feed** — When you have zero follows, a “Discover” or “For you” feed (trending or recent public posts) so your home feed is never empty.',
          '**Suggested users / who to follow** — Real “who to follow” (by interests or activity) so you fill your feed fast and see content that matters.',
          '**Invite a friend** — Shareable signup or invite link (“Join me on Men of Hunger”) so you can bring friends and grow the circle.'
        ]
      },
      {
        title: 'Staying in the loop',
        items: [
          '**Push notifications** — Reply, follow, and boost notifications so you never miss a beat.',
          '**Email re-engagement** — “X new posts from people you follow” or a digest; or “You have new notifications” if you’ve been away. So you stay connected.',
          '**PWA / Add to home screen** — Install the app on your phone (icon, splash, offline where useful) for an app-like experience without the app store.'
        ]
      },
      {
        title: 'Reporting (minimal for launch)',
        items: [
          '**Report post / Report user** — “Report” in the post menu and on profiles; pick a reason and add details; we store and triage. A full report queue and resolution flow follows in April.'
        ]
      },
      {
        title: 'Feedback & reliability',
        items: [
          '**Feedback** — Send us bugs and ideas; we store and triage so we can improve.',
          '**Reliability** — Rate limits and clear “try again later” when needed; we test sign up → onboard → post → upgrade so the core flow works.'
        ]
      }
    ]
  },
  {
    id: 'april-2026',
    date: 'April 1, 2026',
    datetime: '2026-04-01',
    badge: "Phase 2 — A site that's full of life",
    title: 'Discovery, content & polish',
    description:
      "Explore and the right rail show real trending posts and “who to follow” so there’s always something to discover. Edit your posts, manage your subscription, and control what notifications you get. A full reporting system so you can report and we can act.",
    isHighlight: false,
    chunks: [
      {
        title: 'Discovery',
        items: [
          'Explore / trending with real data — Trending or popular posts and “who to follow” in Explore or the right rail, so discovery feels alive.',
          'Optional: hashtags or topics on posts so you can find and follow themes that matter to you.'
        ]
      },
      {
        title: 'Content & premium',
        items: [
          'Edit post — Fix your post text, visibility, or media without deleting.',
          'Manage subscription — Stripe customer portal (manage or cancel); optional annual plan or one-off support; Contact/Help in settings.'
        ]
      },
      {
        title: 'Reporting system (full)',
        items: [
          'Report queue — We list reports with filters (post vs user, category); resolution states (pending, dismissed, action taken).',
          'Optional: we notify you when we’ve taken action, or you can check report status in-app, so you know we’re on it.'
        ]
      },
      {
        title: 'Notifications',
        items: [
          'Notification preferences — Choose what you get: mute replies, only DMs, no boost notifications, etc.; per type or global.'
        ]
      }
    ]
  },
  {
    id: 'may-2026',
    date: 'May 1, 2026',
    datetime: '2026-05-01',
    badge: 'Phase 2 — Depth & trust',
    title: 'Groups, DMs, safety & data',
    description:
      "Groups and direct messages so you have circles and private conversations. Block and mute so you control who you see. Delete your account or download your data whenever you want. Mobile apps so you can take the community with you.",
    isHighlight: false,
    chunks: [
      {
        title: 'Community depth',
        items: [
          'Groups (v1) — Create and join groups; group feed or group-scoped posts so you have pockets of accountability and conversation.',
          'Direct messages — Real DMs: list conversations, send and receive, mark read; only you and the other person see the thread.'
        ]
      },
      {
        title: 'Safety & control',
        items: [
          'Block user — Block so they can’t see your posts, DM you, or appear in your feed; manage your block list in settings.',
          'Mute user — “See less”; hide their posts in your feed without unfollowing.'
        ]
      },
      {
        title: 'Account & data',
        items: [
          'Delete / deactivate account — “Delete my account” in settings; we soft-delete or fully erase and revoke sessions.',
          'Download my data — Export your posts, profile, and bookmarks so you own your data.',
          'Active sessions / devices — See where you’re logged in and revoke other sessions in settings.'
        ]
      },
      {
        title: 'Mobile apps',
        items: [
          'PWA polish — If not fully done in March: installable, app-like experience on mobile (icon, splash, offline where useful).',
          'Native iOS / Android — Native apps in the app stores so you get a first-class experience on your phone.'
        ]
      },
      {
        title: 'Status & support',
        items: [
          'Public status page or link so you can check uptime; in-app Help/Contact so you can reach us.'
        ]
      }
    ]
  }
]

export const roadmapBacklog: RoadmapBacklog = {
  badge: 'Not scheduled',
  title: 'Later / backlog',
  description: "Features we want but haven't slotted into a milestone yet.",
  chunks: [
    {
      title: 'Account & auth',
      items: [
        'Change phone number (add new number, verify, make primary).',
        'Email as second factor or account recovery.',
        '"Remember me" / longer sessions; list connected devices with revoke.'
      ]
    },
    {
      title: 'Content',
      items: [
        'Post drafts — save as draft and resume later.',
        'Alt text for images (accessibility and screen readers).'
      ]
    },
    {
      title: 'Discovery & engagement',
      items: [
        'Hashtags or topics on posts; topic-based discovery.',
        'Share to Twitter/X or other apps.'
      ]
    },
    {
      title: 'Mobile & platform',
      items: [
        'Deep linking (open a post or profile from a link in the app); app store optimization when native apps ship.'
      ]
    },
    {
      title: 'Notifications',
      items: [
        'Email notifications (e.g. “Email me when someone replies” or digest).'
      ]
    }
  ]
}

export const roadmapFooterDisclaimer =
  "Dates are targets, not promises. We'll update this page as we lock in or shift milestones."

/** Build a short description for SEO from the roadmap (used in meta description and JSON-LD). */
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

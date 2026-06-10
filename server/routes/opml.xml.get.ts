/**
 * OPML Feed Directory — GET /opml.xml
 *
 * An OPML 2.0 document listing all available Men of Hunger feeds.
 * Per-author and per-topic feeds are dynamic — URL patterns are documented
 * in the outline descriptions.
 *
 * OPML spec: http://opml.org/spec2.opml
 */

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function outline(attrs: Record<string, string>): string {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escXml(v)}"`)
    .join(' ')
  return `    <outline ${attrStr}/>`
}

export default defineEventHandler((event) => {
  const site = getRequestURL(event).origin
  const now = new Date().toUTCString()

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    `    <title>Men of Hunger Feeds</title>`,
    `    <dateCreated>${now}</dateCreated>`,
    `    <ownerName>Men of Hunger</ownerName>`,
    `    <ownerEmail>hello@menofhunger.com</ownerEmail>`,
    `    <ownerId>${site}</ownerId>`,
    '  </head>',
    '  <body>',

    // ── Articles ──────────────────────────────────────────────────────────
    '    <outline text="Articles" title="Articles" description="Articles published on Men of Hunger">',

    outline({
      type: 'rss',
      text: 'Men of Hunger — Articles (RSS)',
      title: 'Men of Hunger — Articles',
      xmlUrl: `${site}/articles/feed.xml`,
      htmlUrl: `${site}/articles`,
    }),
    outline({
      type: 'atom',
      text: 'Men of Hunger — Articles (Atom)',
      title: 'Men of Hunger — Articles',
      xmlUrl: `${site}/articles/feed.atom`,
      htmlUrl: `${site}/articles`,
    }),
    outline({
      type: 'jsonfeed',
      text: 'Men of Hunger — Articles (JSON Feed)',
      title: 'Men of Hunger — Articles',
      jsonUrl: `${site}/articles/feed.json`,
      htmlUrl: `${site}/articles`,
    }),

    '    </outline>',

    // ── Per-Author (patterns) ─────────────────────────────────────────────
    '    <outline text="Per-Author Feeds" title="Per-Author Feeds" description="Subscribe to a specific author. Replace :username with any Men of Hunger username.">',

    outline({
      type: 'rss',
      text: 'Author Articles — RSS pattern',
      title: 'Author Articles (RSS)',
      xmlUrl: `${site}/u/:username/articles/feed.xml`,
      htmlUrl: `${site}/u/:username/articles`,
    }),
    outline({
      type: 'atom',
      text: 'Author Articles — Atom pattern',
      title: 'Author Articles (Atom)',
      xmlUrl: `${site}/u/:username/articles/feed.atom`,
      htmlUrl: `${site}/u/:username/articles`,
    }),
    outline({
      type: 'jsonfeed',
      text: 'Author Articles — JSON Feed pattern',
      title: 'Author Articles (JSON Feed)',
      jsonUrl: `${site}/u/:username/articles/feed.json`,
      htmlUrl: `${site}/u/:username/articles`,
    }),
    outline({
      type: 'rss',
      text: 'Author Posts — RSS pattern',
      title: 'Author Posts (RSS)',
      xmlUrl: `${site}/u/:username/posts/feed.xml`,
      htmlUrl: `${site}/u/:username`,
    }),
    outline({
      type: 'atom',
      text: 'Author Posts — Atom pattern',
      title: 'Author Posts (Atom)',
      xmlUrl: `${site}/u/:username/posts/feed.atom`,
      htmlUrl: `${site}/u/:username`,
    }),
    outline({
      type: 'jsonfeed',
      text: 'Author Posts — JSON Feed pattern',
      title: 'Author Posts (JSON Feed)',
      jsonUrl: `${site}/u/:username/posts/feed.json`,
      htmlUrl: `${site}/u/:username`,
    }),

    '    </outline>',

    // ── Per-Topic (patterns) ──────────────────────────────────────────────
    '    <outline text="Per-Topic Feeds" title="Per-Topic Feeds" description="Subscribe to a specific topic. Replace :slug with a topic slug (e.g. discipline, fitness, faith).">',

    outline({
      type: 'rss',
      text: 'Topic Articles — RSS pattern',
      title: 'Topic Articles (RSS)',
      xmlUrl: `${site}/topics/:slug/feed.xml`,
      htmlUrl: `${site}/topics/:slug`,
    }),
    outline({
      type: 'atom',
      text: 'Topic Articles — Atom pattern',
      title: 'Topic Articles (Atom)',
      xmlUrl: `${site}/topics/:slug/feed.atom`,
      htmlUrl: `${site}/topics/:slug`,
    }),
    outline({
      type: 'jsonfeed',
      text: 'Topic Articles — JSON Feed pattern',
      title: 'Topic Articles (JSON Feed)',
      jsonUrl: `${site}/topics/:slug/feed.json`,
      htmlUrl: `${site}/topics/:slug`,
    }),

    '    </outline>',

    '  </body>',
    '</opml>',
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'text/x-opml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex')
  return xml
})

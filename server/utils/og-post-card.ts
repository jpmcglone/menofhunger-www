import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { C, OG_HEIGHT, OG_WIDTH, el, loadFonts } from './og-map-card'

export type OgPostCardInput = {
  authorName: string
  username: string
  body: string
  commentCount: number
}

const BODY_MAX = 260

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1).trimEnd()}…`
}

/** 1200x630 share card for a public post with no media of its own. */
export async function renderPostCardPng(input: OgPostCardInput): Promise<Buffer> {
  const fonts = await loadFonts()
  const body = clip(input.body, BODY_MAX)
  const fontSize = body.length > 180 ? 40 : body.length > 100 ? 48 : 58
  const replies =
    input.commentCount > 0
      ? `${input.commentCount.toLocaleString('en-US')} ${input.commentCount === 1 ? 'reply' : 'replies'}`
      : 'Join the conversation'

  const tree = el(
    'div',
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      background: `radial-gradient(circle at 85% 15%, rgba(201,151,63,0.16), rgba(15,17,19,0) 55%), ${C.bg}`,
      fontFamily: 'Inter',
      color: C.text,
      padding: '64px 72px 56px 72px',
      flexDirection: 'column',
    },
    [
      el('div', { alignItems: 'center', gap: 12 }, [
        el('div', { width: 10, height: 10, borderRadius: 999, background: C.brass }),
        el('div', { fontSize: 22, fontWeight: 800, letterSpacing: 5, color: C.brass }, 'MEN OF HUNGER'),
      ]),
      el(
        'div',
        { flex: 1, alignItems: 'center', fontSize, fontWeight: 600, lineHeight: 1.25, letterSpacing: -1 },
        body || 'A post on Men of Hunger',
      ),
      el('div', { alignItems: 'baseline', justifyContent: 'space-between' }, [
        el('div', { alignItems: 'baseline', gap: 12 }, [
          el('div', { fontSize: 30, fontWeight: 800 }, clip(input.authorName || `@${input.username}`, 32)),
          el('div', { fontSize: 24, fontWeight: 400, color: C.muted }, `@${input.username}`),
        ]),
        el('div', { fontSize: 24, fontWeight: 600, color: C.brass }, replies),
      ]),
    ],
  )

  const svg = await satori(tree as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts })
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng()
}

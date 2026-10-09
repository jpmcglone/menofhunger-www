import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { C, OG_HEIGHT, OG_WIDTH, el, loadFonts } from './og-map-card'

export type OgLinksCardInput = {
  name: string
  username: string
  bio: string | null
  isOrganization: boolean
  /** Raw image bytes as a data URI (png/jpeg), or null to draw the initial. */
  avatarDataUri: string | null
}

const BIO_MAX = 150
const AVATAR = 168

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1).trimEnd()}…`
}

/** Fetches an avatar for the card. Returns null on any failure: the card falls back to an initial. */
export async function fetchAvatarDataUri(url: string | null): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { accept: 'image/png,image/jpeg' } })
    if (!res.ok) return null
    const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
    if (type !== 'image/png' && type !== 'image/jpeg') return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > 2_000_000) return null
    return `data:${type};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

async function render(input: OgLinksCardInput): Promise<Buffer> {
  const fonts = await loadFonts()
  const radius = input.isOrganization ? AVATAR * 0.16 : AVATAR / 2
  const name = clip(input.name || `@${input.username}`, 34)
  const bio = input.bio ? clip(input.bio, BIO_MAX) : ''
  const initial = (input.name || input.username).trim().charAt(0).toUpperCase() || 'M'

  const avatar = input.avatarDataUri
    ? el('img', { width: AVATAR, height: AVATAR, borderRadius: radius, objectFit: 'cover' }, undefined, {
        src: input.avatarDataUri,
        width: AVATAR,
        height: AVATAR,
      })
    : el(
        'div',
        { width: AVATAR, height: AVATAR, borderRadius: radius, background: C.surface, alignItems: 'center', justifyContent: 'center', fontSize: 72, fontWeight: 800, color: C.brass },
        initial,
      )

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
      el('div', { flex: 1, alignItems: 'center', gap: 48 }, [
        avatar,
        el('div', { flexDirection: 'column', flex: 1 }, [
          el('div', { fontSize: name.length > 22 ? 52 : 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.1 }, name),
          el('div', { marginTop: 10, fontSize: 30, fontWeight: 600, color: C.brass }, `@${input.username} · Links`),
          ...(bio ? [el('div', { marginTop: 22, fontSize: 30, fontWeight: 400, lineHeight: 1.35, color: C.muted }, bio)] : []),
        ]),
      ]),
      el('div', { fontSize: 24, fontWeight: 400, color: C.soft }, `menofhunger.com/u/${input.username}/links`),
    ],
  )

  const svg = await satori(tree as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts })
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng()
}

/** 1200x630 share card for a public links page. Retries without the photo if it cannot be drawn. */
export async function renderLinksCardPng(input: OgLinksCardInput): Promise<Buffer> {
  try {
    return await render(input)
  } catch (err) {
    if (!input.avatarDataUri) throw err
    return await render({ ...input, avatarDataUri: null })
  }
}

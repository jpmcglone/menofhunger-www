import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { countIntensity, fitCrop, unionBBox, US_MAP_VIEWBOX, type BBox } from '~/utils/members-map'
import { usStateShapes } from '~/utils/us-state-shapes'

/** Standard Open Graph / X large card size. */
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

const C = {
  bg: '#0F1113',
  surface: '#1B2127',
  text: '#F4F4F5',
  muted: '#A3AAB4',
  soft: '#7F8792',
  brass: '#C9973F',
  brassSoft: 'rgba(201,151,63,0.16)',
  online: '#4ADE80',
  onlineSoft: 'rgba(74,222,128,0.14)',
}

export type OgMapState = { state: string; count: number }

export type OgMapCardInput = {
  /** Small caps line above the headline, e.g. "MEMBER MAP". */
  eyebrow: string
  /** The big number, already formatted. */
  headline: string
  /** Words after the number, e.g. "men across 30 states". */
  headlineRest: string
  onlineLabel: string
  footnote?: string
  /** Per-state counts that shade the map. */
  states: OgMapState[]
  /** Crop to and outline this state. */
  focusState?: string | null
  path: string
}

type FontEntry = { name: string; data: ArrayBuffer; weight: 400 | 600 | 800; style: 'normal' }
let fontsPromise: Promise<FontEntry[]> | null = null

function loadFonts(): Promise<FontEntry[]> {
  fontsPromise ??= (async () => {
    const storage = useStorage('assets:server')
    const weights = [400, 600, 800] as const
    const entries = await Promise.all(
      weights.map(async (weight) => {
        const raw = await storage.getItemRaw<Buffer | Uint8Array>(`og-fonts/inter-latin-${weight}-normal.woff`)
        if (!raw) throw new Error(`Missing OG font weight ${weight}`)
        const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayBufferLike)
        const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
        return { name: 'Inter', data, weight, style: 'normal' as const }
      }),
    )
    return entries
  })().catch((err) => {
    fontsPromise = null
    throw err
  })
  return fontsPromise
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16))
  return `#${pa.map((v, i) => Math.round(v + (pb[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`
}

/** The map as a standalone SVG: occupied states in brass, cropped to where members are. */
export function buildMapSvg(states: OgMapState[], focusState?: string | null): { svg: string; aspect: number } {
  const shapes = usStateShapes()
  const counts = new Map(states.filter((s) => s.count > 0).map((s) => [s.state.toUpperCase(), s.count]))
  const max = Math.max(1, ...counts.values())
  const focus = focusState ? shapes.get(focusState.toUpperCase()) ?? null : null

  let crop: BBox
  if (focus) {
    crop = fitCrop(focus.bbox, { padRatio: 0.45, minWidth: 220, minAspect: 1.1, maxAspect: 1.6 })
  } else {
    const occupied = [...counts.keys()].map((code) => shapes.get(code)?.bbox).filter((b): b is BBox => Boolean(b))
    crop = fitCrop(unionBBox(occupied) ?? US_MAP_VIEWBOX, { minAspect: 1.1, maxAspect: 1.7 })
  }

  const paths: string[] = []
  for (const shape of shapes.values()) {
    const n = counts.get(shape.code) ?? 0
    const fill = n > 0 ? mix('#3A2E1A', '#E6B45E', countIntensity(n, max)) : C.surface
    const isFocus = focus?.code === shape.code
    const opacity = focus && !isFocus ? 0.45 : 1
    paths.push(
      `<path d="${shape.path}" fill="${fill}" fill-opacity="${opacity}" stroke="${isFocus ? '#F5C870' : C.bg}" stroke-width="${isFocus ? 2.2 : 1}" stroke-linejoin="round"/>`,
    )
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">${paths.join('')}</svg>`
  return { svg, aspect: crop.width / crop.height }
}

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown } }
const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, ...(children === undefined ? {} : { children }), ...extra },
})

export async function renderMapCardPng(input: OgMapCardInput): Promise<Buffer> {
  const fonts = await loadFonts()
  const map = buildMapSvg(input.states, input.focusState)
  const mapBoxW = 640
  const mapBoxH = 470
  const mapW = Math.min(mapBoxW, mapBoxH * map.aspect)
  const mapH = mapW / map.aspect
  const mapSrc = `data:image/svg+xml;base64,${Buffer.from(map.svg).toString('base64')}`

  const tree = el(
    'div',
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      background: `radial-gradient(circle at 78% 40%, rgba(201,151,63,0.18), rgba(15,17,19,0) 55%), ${C.bg}`,
      fontFamily: 'Inter',
      color: C.text,
      padding: '64px 56px 56px 72px',
      alignItems: 'center',
    },
    [
      el('div', { flexDirection: 'column', width: 470, flexShrink: 0 }, [
        el('div', { alignItems: 'center', gap: 12 }, [
          el('div', { width: 10, height: 10, borderRadius: 999, background: C.brass }),
          el('div', { fontSize: 22, fontWeight: 800, letterSpacing: 5, color: C.brass }, 'MEN OF HUNGER'),
        ]),
        el('div', { marginTop: 18, fontSize: 20, fontWeight: 600, letterSpacing: 3, color: C.soft }, input.eyebrow.toUpperCase()),
        el('div', { marginTop: 22, fontSize: 132, fontWeight: 800, lineHeight: 1, letterSpacing: -5 }, input.headline),
        el('div', { marginTop: 12, fontSize: 38, fontWeight: 600, lineHeight: 1.2, color: C.text }, input.headlineRest),
        el(
          'div',
          {
            marginTop: 34,
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: 12,
            padding: '12px 22px',
            borderRadius: 999,
            background: C.onlineSoft,
            border: '1.5px solid rgba(74,222,128,0.35)',
          },
          [
            el('div', { width: 14, height: 14, borderRadius: 999, background: C.online, boxShadow: '0 0 16px rgba(74,222,128,0.8)' }),
            el('div', { fontSize: 28, fontWeight: 600, color: C.online }, input.onlineLabel),
          ],
        ),
        el('div', { marginTop: 'auto', paddingTop: 28, fontSize: 22, fontWeight: 400, color: C.muted }, input.footnote ?? `menofhunger.com${input.path}`),
      ]),
      el('div', { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' }, [
        el('img', { width: mapW, height: mapH }, undefined, { src: mapSrc, width: mapW, height: mapH }),
      ]),
    ],
  )

  const svg = await satori(tree as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts })
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng()
}

const pngCache = new Map<string, { at: number; png: Promise<Buffer> }>()

/** Renders are ~100ms of CPU; share scrapers arrive in bursts, so keep each card briefly. */
export function cachedPng(key: string, ttlMs: number, render: () => Promise<Buffer>): Promise<Buffer> {
  const hit = pngCache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.png
  const png = render()
  pngCache.set(key, { at: Date.now(), png })
  png.catch(() => pngCache.delete(key))
  if (pngCache.size > 200) pngCache.delete(pngCache.keys().next().value!)
  return png
}

export function ogPngHeaders(event: Parameters<typeof setResponseHeader>[0]) {
  setResponseHeader(event, 'Content-Type', 'image/png')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400')
}

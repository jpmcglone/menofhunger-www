// One-time asset generator: rasterizes each US state silhouette from
// `@svg-maps/usa.states-territories` into a centered, tightly-cropped PNG under
// `public/state-shapes/<XX>.png`. The iOS app loads these and tints them as template
// images (web renders the SVG directly via <AppStateShape>). Re-run if the source map
// changes: `node scripts/generate-state-shapes.mjs`.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import usaMap from '@svg-maps/usa.states-territories'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'state-shapes')

// Full-map viewBox (matches AppStateShape.vue) so each path renders in its own coordinate space.
const VIEW_BOX = '8 6 920 585'
const SIZE = 512

async function run() {
  await mkdir(outDir, { recursive: true })

  let written = 0
  for (const location of usaMap.locations) {
    const id = String(location.id || '').trim()
    const path = String(location.path || '').trim()
    if (!id || !path) continue

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX}" width="1840" height="1170"><path d="${path}" fill="#000000"/></svg>`

    let pipeline = sharp(Buffer.from(svg))
    try {
      pipeline = pipeline.trim()
    } catch {
      // Fully transparent or untrimmable — keep the full canvas.
    }

    const png = await pipeline
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    const outPath = join(outDir, `${id.toUpperCase()}.png`)
    await writeFile(outPath, png)
    written += 1
  }

  console.log(`Wrote ${written} state-shape PNGs to ${outDir}`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

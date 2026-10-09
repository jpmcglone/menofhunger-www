/** One SVG path for a QR matrix: a rectangle per horizontal run of dark modules. */
export function buildQrPath(matrix: ReadonlyArray<ReadonlyArray<boolean>>): string {
  const parts: string[] = []
  matrix.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x += 1
        continue
      }
      const start = x
      while (x < row.length && row[x]) x += 1
      parts.push(`M${start} ${y}h${x - start}v1h-${x - start}z`)
    }
  })
  return parts.join('')
}

const INK = '#0F1113'
const PAPER = '#FBFAF7'

/** Draws the QR tile (paper card, quiet zone, caption) to a PNG blob. Browser-only. */
export async function renderQrPng(input: {
  data: ReadonlyArray<ReadonlyArray<boolean>>
  caption: string
  /** Pixels per module. */
  scale?: number
}): Promise<Blob> {
  const scale = input.scale ?? 24
  const modules = input.data.length
  const qrPx = modules * scale
  const pad = Math.round(qrPx * 0.09)
  const captionH = Math.round(qrPx * 0.1)
  const width = qrPx + pad * 2
  const height = qrPx + pad * 2 + captionH

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available.')

  ctx.fillStyle = PAPER
  ctx.beginPath()
  ctx.roundRect(0, 0, width, height, Math.round(width * 0.09))
  ctx.fill()

  ctx.fillStyle = INK
  input.data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) ctx.fillRect(pad + x * scale, pad + y * scale, scale, scale)
    })
  })

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${Math.round(captionH * 0.5)}px -apple-system, system-ui, "Segoe UI", sans-serif`
  ctx.fillText(input.caption, width / 2, pad + qrPx + captionH * 0.55, width - pad * 2)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image.'))), 'image/png')
  })
}

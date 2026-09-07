// One decoder at a time across composers/editors; release native bitmap/canvas storage promptly.
let processing: Promise<unknown> = Promise.resolve()

/** JPEG rotation/resize happens before hashing and uploading. Preserve transparency and animation. */
export function prepareUploadImage(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png'].includes(file.type.toLowerCase())) return Promise.resolve(file)
  const result = processing.then(() => prepare(file))
  processing = result.catch(() => undefined)
  return result
}

async function isAnimatedPNG(file: File): Promise<boolean> {
  const view = new DataView(await file.arrayBuffer())
  // acTL precedes IDAT in APNG. Parse chunk boundaries, not arbitrary compressed data.
  for (let offset = 8; offset + 12 <= view.byteLength;) {
    const length = view.getUint32(offset)
    const kind = view.getUint32(offset + 4)
    if (kind === 0x6163544c) return true
    if (kind === 0x49444154) return false
    offset += length + 12
  }
  return false
}

async function prepare(file: File): Promise<File> {
  if (file.size > 32 * 1024 * 1024) throw new Error('Please choose an image smaller than 32MB.')
  if (file.type === 'image/png' && await isAnimatedPNG(file)) return file
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const canvas = document.createElement('canvas')
  try {
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to prepare this image. Please try another photo.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to prepare this image.')), file.type, 0.85)
    })
    return new File([blob], file.name, { type: blob.type, lastModified: file.lastModified })
  } finally {
    bitmap.close()
    canvas.width = 0
    canvas.height = 0
  }
}

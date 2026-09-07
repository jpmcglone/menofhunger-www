import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareUploadImage } from '../utils/prepare-upload-image'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function mockDecoder(width = 4000, height = 2000) {
  const bitmap = { width, height, close: vi.fn() }
  const drawImage = vi.fn()
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: (cb: BlobCallback, type: string) => cb(new Blob(['encoded'], { type })) }
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement)
  return { bitmap, drawImage, canvas }
}

describe('prepareUploadImage', () => {
  it('resizes an oriented JPEG and releases the decoder/canvas', async () => {
    const { bitmap, drawImage, canvas } = mockDecoder(2000, 4000)
    const original = new File(['original'], 'phone.jpg', { type: 'image/jpeg' })
    const result = await prepareUploadImage(original)
    expect(createImageBitmap).toHaveBeenCalledWith(original, { imageOrientation: 'from-image' })
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1024, 2048)
    expect(await result.text()).toBe('encoded')
    expect(result.type).toBe('image/jpeg')
    expect(bitmap.close).toHaveBeenCalledOnce()
    expect([canvas.width, canvas.height]).toEqual([0, 0])
  })

  it('does not enlarge small photos', async () => {
    const { bitmap, drawImage } = mockDecoder(120, 80)
    await prepareUploadImage(new File(['jpeg'], 'small.jpg', { type: 'image/jpeg' }))
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 120, 80)
  })

  it('keeps PNG transparency by retaining PNG encoding', async () => {
    mockDecoder()
    const result = await prepareUploadImage(new File([new Uint8Array(8)], 'alpha.png', { type: 'image/png' }))
    expect(result.type).toBe('image/png')
  })

  it.each(['image/gif', 'image/webp'])('preserves potentially animated %s bytes', async type => {
    const original = new File(['animated'], 'animation', { type })
    expect(await prepareUploadImage(original)).toBe(original)
  })

  it('preserves animated PNG chunks', async () => {
    const bytes = new Uint8Array(20)
    new DataView(bytes.buffer).setUint32(12, 0x6163544c)
    const original = new File([bytes], 'animated.png', { type: 'image/png' })
    expect(await prepareUploadImage(original)).toBe(original)
  })

  it('cleans up on encoding failure and allows the next upload', async () => {
    const { bitmap, canvas } = mockDecoder()
    canvas.toBlob = cb => cb(null)
    const file = new File(['jpeg'], 'image.jpg', { type: 'image/jpeg' })
    await expect(prepareUploadImage(file)).rejects.toThrow('Unable to prepare')
    expect(bitmap.close).toHaveBeenCalledOnce()
    canvas.toBlob = cb => cb(new Blob(['next'], { type: 'image/jpeg' }))
    expect(await (await prepareUploadImage(file)).text()).toBe('next')
  })
})

/** Minimal shapes of the vue-advanced-cropper callbacks and template-ref methods the crop dialogs use. */
export type CropperImageSize = { width: number; height: number }
export type CropperCoordinates = { width: number; height: number; left: number; top: number }
export type CropperChangeEvent = { canvas?: HTMLCanvasElement | null }
export type CropperState = { imageSize: CropperImageSize; coordinates: CropperCoordinates }
export type CropperHandle = {
  setCoordinates: (value: Partial<CropperCoordinates> | ((state: CropperState) => Partial<CropperCoordinates>)) => void
  getResult: () => { canvas?: HTMLCanvasElement | null } | undefined
}

/** `default-position` callback: center the stencil in the image. */
export function centeredCropPosition({ coordinates, imageSize }: CropperState): { left: number; top: number } {
  return {
    left: Math.round(imageSize.width / 2 - coordinates.width / 2),
    top: Math.round(imageSize.height / 2 - coordinates.height / 2),
  }
}

/** Largest centered stencil of `aspect` (width / height) that fits the image; `coordinates` is returned unchanged for an empty image. */
export function maxCenteredCrop(state: CropperState, aspect: number): Partial<CropperCoordinates> {
  const w = Number(state.imageSize?.width ?? 0)
  const h = Number(state.imageSize?.height ?? 0)
  if (!w || !h) return state.coordinates
  const cropW = Math.floor(Math.min(w, h * aspect))
  const cropH = Math.floor(cropW / aspect)
  return { width: cropW, height: cropH, left: Math.round(w / 2 - cropW / 2), top: Math.round(h / 2 - cropH / 2) }
}

/** Past this width/height mismatch, filling a tile crops too much of the other person. */
export const CALL_VIDEO_COVER_MISMATCH_LIMIT = 1.3

/**
 * How a call video fills its tile. Phones send portrait or landscape (and rotate mid-call),
 * desktops send landscape, screen shares are anything. Fill when the shapes roughly agree;
 * otherwise show the whole frame so nobody's face or slide gets cropped. Mirrored on iOS
 * (`CallVideoFit.resolve`).
 */
export function callVideoFit(opts: {
  requested: 'cover' | 'contain'
  screenSharing?: boolean
  stage?: boolean
  videoAspect: number
  tileAspect: number
}): 'cover' | 'contain' {
  if (opts.screenSharing || opts.stage) return 'contain'
  if (opts.requested === 'cover') return 'cover'
  const { videoAspect, tileAspect } = opts
  if (!(videoAspect > 0) || !(tileAspect > 0)) return 'contain'
  const sameOrientation = (videoAspect >= 1) === (tileAspect >= 1)
  const mismatch = Math.max(videoAspect, tileAspect) / Math.min(videoAspect, tileAspect)
  return sameOrientation && mismatch <= CALL_VIDEO_COVER_MISMATCH_LIMIT ? 'cover' : 'contain'
}

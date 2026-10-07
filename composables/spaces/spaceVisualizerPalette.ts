import type { UserColorTier } from '~/utils/user-tier'

export type SpaceVisualizerRgb = [number, number, number]
export type SpaceVisualizerPalette = {
  top: SpaceVisualizerRgb
  mid: SpaceVisualizerRgb
  base: SpaceVisualizerRgb
  peak: SpaceVisualizerRgb
  idle: SpaceVisualizerRgb
}

export const SPACE_VISUALIZER_PALETTES: Record<UserColorTier, SpaceVisualizerPalette> = {
  normal: {
    top: [251, 191, 36],
    mid: [217, 119, 6],
    base: [120, 53, 15],
    peak: [253, 224, 71],
    idle: [163, 116, 34],
  },
  premium: {
    top: [251, 146, 60],
    mid: [199, 125, 26],
    base: [124, 45, 18],
    peak: [253, 186, 116],
    idle: [199, 125, 26],
  },
  verified: {
    top: [96, 165, 250],
    mid: [43, 123, 185],
    base: [30, 58, 138],
    peak: [147, 197, 253],
    idle: [43, 123, 185],
  },
  organization: {
    top: [203, 213, 225],
    mid: [138, 147, 163],
    base: [71, 85, 105],
    peak: [226, 232, 240],
    idle: [138, 147, 163],
  },
}

export function spaceVisualizerRgb(c: SpaceVisualizerRgb, a = 1) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`
}

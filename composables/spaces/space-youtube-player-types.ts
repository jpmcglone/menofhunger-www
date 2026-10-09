import type { Space } from '~/types/api'

export interface SpaceYouTubePlayerProps {
  space: Space
  roomReady?: boolean
}

/** The slice of the YouTube IFrame player the space sync uses. Methods are optional because the player is only usable once its iframe is ready. */
export type SpaceYtPlayer = {
  playVideo?: () => void
  pauseVideo?: () => void
  mute?: () => void
  unMute?: () => void
  isMuted?: () => boolean
  setVolume?: (value: number) => void
  getVolume?: () => number
  getPlayerState?: () => number
  getCurrentTime?: () => number
  getDuration?: () => number
  getPlaybackRate?: () => number
  setPlaybackRate?: (rate: number) => void
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void
  cueVideoById?: (opts: { videoId: string; startSeconds?: number }) => void
  loadVideoById?: (opts: { videoId: string; startSeconds?: number }) => void
  destroy?: () => void
}

/** `window.YT` as loaded by the IFrame API script. */
export type SpaceYtGlobal = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => SpaceYtPlayer
  PlayerState?: Record<'PLAYING' | 'PAUSED' | 'BUFFERING' | 'ENDED' | 'CUED', number>
}

export function getYtGlobal(): SpaceYtGlobal | undefined {
  return (window as unknown as { YT?: SpaceYtGlobal }).YT
}

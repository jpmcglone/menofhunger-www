export type SpotifyPlayback = { isPaused: boolean; isBuffering: boolean; position: number; duration: number; playingURI?: string }
export interface SpotifyController {
  play(): void
  pause(): void
  destroy(): void
  addListener(event: string, listener: (event: { data: SpotifyPlayback }) => void): void
}
type SpotifyAPI = { createController(element: HTMLElement, options: { uri: string; width: string; height: number }, ready: (controller: SpotifyController) => void): void }
let pending: Promise<SpotifyAPI> | null = null
export function loadSpotifyAPI(): Promise<SpotifyAPI> {
  if (pending) return pending
  pending = new Promise((resolve, reject) => {
    const host = window as unknown as { onSpotifyIframeApiReady?: (api: SpotifyAPI) => void }
    const previous = host.onSpotifyIframeApiReady
    const script = document.createElement('script')
    const fail = () => { clearTimeout(timeout); script.remove(); pending = null; reject(new Error('Spotify unavailable')) }
    const timeout = setTimeout(fail, 15000)
    host.onSpotifyIframeApiReady = api => { clearTimeout(timeout); previous?.(api); resolve(api) }
    script.src = 'https://open.spotify.com/embed/iframe-api/v1'
    script.onerror = fail
    document.head.append(script)
  })
  return pending
}

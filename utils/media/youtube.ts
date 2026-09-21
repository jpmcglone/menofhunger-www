export interface YouTubePlayer {
  playVideo(): void
  pauseVideo(): void
  mute(): void
  unMute(): void
  setVolume(value: number): void
  getVolume(): number
  isMuted(): boolean
  getCurrentTime(): number
  getPlayerState(): number
  getIframe(): HTMLIFrameElement
  destroy(): void
}
export type YouTubeOptions = {
  host?: string
  videoId?: string
  width?: string
  height?: string
  playerVars?: Record<string, string | number>
  events?: Record<string, (event: { data?: number; target: YouTubePlayer }) => void>
}
type YouTubeAPI = { Player: new (element: HTMLElement, options: YouTubeOptions) => YouTubePlayer; PlayerState: Record<string, number> }
let loading: Promise<YouTubeAPI> | null = null
const src = 'https://www.youtube.com/iframe_api'
export function loadYouTubeAPI(): Promise<YouTubeAPI> {
  const globals = window as unknown as { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void }
  if (globals.YT?.Player && document.querySelector(`script[src="${src}"]`)) return Promise.resolve(globals.YT)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    const previous = globals.onYouTubeIframeAPIReady
    const fail = () => {
      clearTimeout(timer)
      loading = null
      script?.remove()
      reject(new Error('YouTube player could not load'))
    }
    const timer = setTimeout(fail, 15000)
    globals.onYouTubeIframeAPIReady = () => {
      try { previous?.() } finally {
        if (globals.YT?.Player) { clearTimeout(timer); resolve(globals.YT) }
        else fail()
      }
    }
    if (!script) {
      script = document.createElement('script')
      script.src = src
      script.onerror = fail
      document.head.appendChild(script)
    }
  })
  return loading
}

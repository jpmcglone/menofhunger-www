import { ref, type Ref } from 'vue'
import { mediaFocus } from '~/utils/mediaFocus'
import { VideoAutoplayCoordinator, type MediaPlayerAdapter, type PlaybackState, type VideoSound } from '~/utils/media/video-autoplay'
import { measureVideo } from '~/utils/media/viewport'

const runtimes = new WeakMap<object, ReturnType<typeof createRuntime>>()

function createRuntime(activeId: Ref<string | null>, soundOn: Ref<boolean>, volume: Ref<number>) {
  const coordinator = new VideoAutoplayCoordinator(mediaFocus)
  const managed = new WeakSet<HTMLMediaElement>()
  const registrations = new Map<string, () => void>()
  const elements = new Map<string, HTMLElement>()
  const states = new Map<string, Ref<PlaybackState>>()
  const fallbackPlayers = new Map<HTMLMediaElement, { id: string; cleanup: () => void }>()
  let mounted = false
  let counter = 0
  let pipOwner: string | null = null
  let resize: ResizeObserver | null = null
  coordinator.onChange = (id, sound) => {
    activeId.value = id
    soundOn.value = !sound.muted
    volume.value = sound.volume
  }
  const schedule = coordinator.schedule
  const visibility = () => {
    coordinator.setHidden(document.visibilityState === 'hidden')
    if (document.visibilityState === 'hidden') mediaFocus.suspendForeground(pipOwner)
  }
  const onPlay = (event: Event) => {
    const el = event.target
    if (!(el instanceof HTMLMediaElement) || managed.has(el) || el.dataset.mediaManaged != null || el.srcObject || el.dataset.mediaDecorative != null) return
    let item = fallbackPlayers.get(el)
    if (el instanceof HTMLVideoElement) {
      if (!item) {
        const id = `interactive:${++counter}`
        item = { id, cleanup: registerVideo(id, el, el, false) }
        fallbackPlayers.set(el, item)
      }
      coordinator.play(item.id)
      return
    }
    if (!item) {
      const id = `${el instanceof HTMLVideoElement ? 'video' : 'audio'}:local:${++counter}`
      const end = () => mediaFocus.release(id)
      const pause = () => { if (el instanceof HTMLVideoElement && document.pictureInPictureElement !== el) end() }
      const pip = () => { pipOwner = id }
      const leave = () => { if (pipOwner === id) pipOwner = null }
      el.addEventListener('ended', end)
      el.addEventListener('error', end)
      el.addEventListener('pause', pause)
      el.addEventListener('enterpictureinpicture', pip)
      el.addEventListener('leavepictureinpicture', leave)
      item = { id, cleanup: () => {
        el.pause(); end()
        el.removeEventListener('ended', end); el.removeEventListener('error', end); el.removeEventListener('pause', pause)
        el.removeEventListener('enterpictureinpicture', pip); el.removeEventListener('leavepictureinpicture', leave)
      } }
      fallbackPlayers.set(el, item)
    }
    const explicit = el.dataset.mediaExplicit === 'true'
    delete el.dataset.mediaExplicit
    if (!mediaFocus.claim(item.id, () => {
      el.pause()
      if (document.pictureInPictureElement === el) void document.exitPictureInPicture().catch(() => {})
    }, { automatic: !explicit && el.autoplay && el.muted, background: el instanceof HTMLAudioElement })) el.pause()
  }
  let mutations: MutationObserver | null = null
  function mount() {
    if (mounted) return
    mounted = true
    resize = new ResizeObserver(schedule)
    resize.observe(document.documentElement)
    for (const el of elements.values()) resize.observe(el)
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('play', onPlay, true)
    window.visualViewport?.addEventListener('resize', schedule)
    mutations = new MutationObserver(() => {
      for (const [el, entry] of fallbackPlayers) if (!el.isConnected) { entry.cleanup(); fallbackPlayers.delete(el) }
      schedule()
    })
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert', 'aria-hidden', 'hidden', 'style', 'class'] })
    visibility()
  }
  function register(id: string, el: HTMLElement, adapter: MediaPlayerAdapter, onState?: (state: PlaybackState) => void, autoplay = true) {
    registrations.get(id)?.()
    const cleanup = coordinator.register(id, { adapter, measure: () => measureVideo(el), onState, autoplay })
    elements.set(id, el)
    resize?.observe(el)
    let disposed = false
    const dispose = () => {
      if (disposed) return
      disposed = true
      resize?.unobserve(el)
      cleanup()
      if (registrations.get(id) === dispose) { registrations.delete(id); elements.delete(id) }
    }
    registrations.set(id, dispose)
    return dispose
  }
  function registerVideo(id: string, el: HTMLVideoElement, container: HTMLElement = el, autoplay = true) {
    const state = states.get(id) ?? ref<PlaybackState>('idle')
    states.set(id, state)
    managed.add(el)
    let expected: VideoSound = { muted: el.muted, volume: el.volume }
    let requested = false
    let userGesture = 0
    let programmaticPause = false
    let signal: AbortSignal | null = null
    const audio = (sound: VideoSound) => {
      expected = { ...sound }
      el.volume = sound.volume
      el.muted = sound.muted
    }
    const adapter: MediaPlayerAdapter = {
      async play(request) {
        requested = true
        signal = request.signal
        audio(request)
        try { await el.play() } catch (error) {
          if (request.signal.aborted) return
          if (request.muted || !(error instanceof DOMException) || error.name !== 'NotAllowedError') throw error
          audio({ ...request, muted: true })
          await el.play()
        }
        if (request.signal.aborted && signal === request.signal) el.pause()
      },
      pause() {
        requested = false
        programmaticPause = !el.paused
        el.pause()
        if (document.pictureInPictureElement === el) void document.exitPictureInPicture().catch(() => {})
      },
      setAudio: audio,
    }
    const dispose = register(id, container, adapter, next => { state.value = next }, autoplay)
    const gesture = () => { userGesture = Date.now() }
    const play = () => {
      if (!requested && Date.now() - userGesture < 1500) coordinator.play(id)
      else coordinator.report(id, 'playing')
    }
    const pause = () => {
      if (programmaticPause) { programmaticPause = false; return }
      if (!requested || el.ended) return
      requested = false
      coordinator.report(id, 'paused', true)
    }
    const ended = () => coordinator.report(id, 'ended')
    const failed = () => coordinator.report(id, 'failed')
    const waiting = () => { if (requested) coordinator.report(id, 'buffering') }
    const changeAudio = () => {
      if (el.muted === expected.muted && Math.abs(el.volume - expected.volume) < 0.005) return
      expected = { muted: el.muted, volume: el.volume }
      coordinator.setAudio(expected)
    }
    const pin = () => { pipOwner = `video:feed:${id}`; coordinator.pin(id, true, true) }
    const unpin = () => { pipOwner = null; coordinator.pin(id, false) }
    const fullscreen = () => coordinator.pin(id, document.fullscreenElement === el || document.fullscreenElement === container)
    const listeners: [string, EventListener][] = [['pointerdown', gesture], ['keydown', gesture], ['play', play], ['pause', pause], ['ended', ended], ['error', failed], ['waiting', waiting], ['volumechange', changeAudio], ['enterpictureinpicture', pin], ['leavepictureinpicture', unpin], ['webkitbeginfullscreen', () => coordinator.pin(id, true)], ['webkitendfullscreen', () => coordinator.pin(id, false)]]
    for (const [name, listener] of listeners) el.addEventListener(name, listener)
    document.addEventListener('fullscreenchange', fullscreen)
    return () => {
      for (const [name, listener] of listeners) el.removeEventListener(name, listener)
      document.removeEventListener('fullscreenchange', fullscreen)
      managed.delete(el)
      states.delete(id)
      dispose()
    }
  }
  function dispose() {
    coordinator.dispose()
    resize?.disconnect(); mutations?.disconnect()
    for (const item of fallbackPlayers.values()) item.cleanup()
    fallbackPlayers.clear()
    window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule)
    document.removeEventListener('visibilitychange', visibility); document.removeEventListener('play', onPlay, true)
    window.visualViewport?.removeEventListener('resize', schedule)
    mounted = false
  }
  return { coordinator, mount, dispose, register, registerVideo, states, managed, schedule }
}

export function useEmbeddedVideoManager() {
  const app = useNuxtApp()
  const activeId = useState<string | null>('moh.active-video-instance', () => null)
  const appWideSoundOn = useState('moh.app-video-sound-on', () => false)
  const appWideVolume = useState('moh.app-video-volume', () => 1)
  let runtime = import.meta.client ? runtimes.get(app) : undefined
  if (import.meta.client && !runtime) {
    runtime = createRuntime(activeId, appWideSoundOn, appWideVolume)
    runtimes.set(app, runtime)
  }
  return {
    activeId, appWideSoundOn, appWideVolume,
    register: (id: string, el: HTMLElement, adapter: MediaPlayerAdapter, state?: (s: PlaybackState) => void) => runtime?.register(id, el, adapter, state) ?? (() => {}),
    registerVideo: (id: string, el: HTMLVideoElement, container?: HTMLElement) => runtime?.registerVideo(id, el, container) ?? (() => {}),
    activate: (id: string) => runtime?.coordinator.play(id),
    report: (id: string, state: PlaybackState, user = false) => runtime?.coordinator.report(id, state, user),
    pin: (id: string, pinned: boolean) => runtime?.coordinator.pin(id, pinned),
    stopAll: () => runtime?.coordinator.stopAll(),
    reset: () => runtime?.coordinator.reset(),
    schedule: () => runtime?.schedule(),
    reportPlayerAudio: (update: { muted?: boolean; volume01?: number }) => runtime?.coordinator.setAudio({ muted: update.muted, volume: update.volume01 }),
    applySharedAudioToVideo: (el: HTMLVideoElement) => { el.volume = appWideVolume.value; el.muted = !appWideSoundOn.value },
    mount: () => runtime?.mount(),
    dispose: () => { runtime?.dispose(); runtimes.delete(app) },
  }
}

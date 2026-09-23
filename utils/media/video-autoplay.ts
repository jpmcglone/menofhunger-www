import type { MediaFocus } from '../mediaFocus'

export type PlaybackState = 'idle' | 'ready' | 'playing' | 'buffering' | 'paused' | 'ended' | 'blocked' | 'failed'
export type PauseReason = 'interrupted' | 'viewport' | 'background' | 'disposed'
export type VideoSound = { muted: boolean; volume: number }
export type PlayRequest = VideoSound & { automatic: boolean; signal: AbortSignal }
export interface MediaPlayerAdapter {
  play(request: PlayRequest): void | Promise<void>
  pause(reason: PauseReason): void
  setAudio?(sound: VideoSound): void
  dispose?(): void
}
export type VideoCandidate = {
  adapter: MediaPlayerAdapter
  autoplay?: boolean
  /** Stable media identity, independent of a mounted player instance. */
  playbackKey?: string
  /** null means disconnected, covered, or less than 75% visible. */
  measure(): { distance: number } | null
  onState?(state: PlaybackState): void
}

/** One selector and one focus subscription, regardless of how many rows render. */
export class VideoAutoplayCoordinator {
  private entries = new Map<string, VideoCandidate>()
  private suppressed = new Set<string>()
  private manuallyPaused = new Set<string>()
  private active: string | null = null
  private pinned: string | null = null
  private backgroundPinned = false
  private pending: string | null = null
  private pendingAt = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private attempt: AbortController | null = null
  private hidden = false
  private unsubscribe: () => void
  private sound: VideoSound = { muted: true, volume: 1 }
  onChange: (active: string | null, sound: VideoSound) => void = () => {}

  constructor(private focus: MediaFocus) {
    this.unsubscribe = focus.subscribe(() => this.schedule())
  }

  get activeId() { return this.active }
  get audio() { return { ...this.sound } }
  private playbackKey(id: string) { return this.entries.get(id)?.playbackKey ?? id }
  private isSuppressed(id: string) { return this.suppressed.has(id) || this.manuallyPaused.has(this.playbackKey(id)) }
  private focusID(id: string) { return `video:feed:${id}` }

  register(id: string, candidate: VideoCandidate): () => void {
    // Replacing an instance is deliberate; disposal of the old instance cannot remove the new one.
    const previous = this.entries.get(id)
    if (previous) this.unregister(id, previous)
    this.entries.set(id, candidate)
    this.schedule()
    return () => this.unregister(id, candidate)
  }

  private unregister(id: string, candidate: VideoCandidate) {
    if (this.entries.get(id) !== candidate) return
    if (this.active === id) this.pauseActive('disposed')
    this.entries.delete(id)
    this.suppressed.delete(id)
    if (this.pinned === id) this.pinned = null
    candidate.adapter.dispose?.()
    this.schedule()
  }

  setAudio(update: Partial<VideoSound>) {
    this.sound = {
      muted: update.muted ?? this.sound.muted,
      volume: Number.isFinite(update.volume) ? Math.min(1, Math.max(0, update.volume!)) : this.sound.volume,
    }
    for (const entry of this.entries.values()) entry.adapter.setAudio?.(this.audio)
    this.onChange(this.active, this.audio)
  }

  pin(id: string, pinned: boolean, background = false) {
    if (pinned && this.active === id) { this.pinned = id; this.backgroundPinned = background }
    if (!pinned && this.pinned === id) this.pinned = null
    this.schedule()
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden
    if (hidden && !(this.active === this.pinned && this.backgroundPinned)) this.pauseActive('background')
    this.schedule()
  }

  report(id: string, state: PlaybackState, userInitiated = false) {
    const entry = this.entries.get(id)
    if (!entry) return
    if (state === 'playing' && this.focus.currentId !== this.focusID(id)) {
      entry.adapter.pause('interrupted')
      return
    }
    if (state === 'playing' && this.active === id) this.manuallyPaused.delete(this.playbackKey(id))
    entry.onState?.(state)
    if (state === 'paused' && userInitiated || state === 'ended' || state === 'blocked' || state === 'failed') {
      if (state === 'paused' && userInitiated) this.manuallyPaused.add(this.playbackKey(id))
      else this.suppressed.add(id)
      if (this.active === id && (this.pinned !== id || state !== 'paused')) this.pauseActive('interrupted')
    }
    this.schedule()
  }

  /** Explicit playback alone may replace selected/paused audio. */
  play(id: string) {
    this.suppressed.delete(id)
    this.manuallyPaused.delete(this.playbackKey(id))
    this.start(id, false)
  }

  schedule = () => {
    if (this.timer != null) clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.timer = null; this.compute() }, 0)
  }

  compute() {
    const measured = new Map<string, { distance: number }>()
    for (const [id, entry] of this.entries) {
      const box = entry.measure()
      if (box) measured.set(id, box)
      else this.suppressed.delete(id)
    }
    if (this.active && this.pinned === this.active) return
    if (this.hidden) return
    const owner = this.focus.currentId
    if (owner && (!this.active || owner !== this.focusID(this.active))) return
    if (this.active && !measured.has(this.active)) this.pauseActive('viewport')
    let best: string | null = null
    for (const [id, box] of measured) {
      if (this.entries.get(id)?.autoplay === false) continue
      if (best == null || box.distance < measured.get(best)!.distance) best = id
    }
    const currentBox = this.active ? measured.get(this.active) : null
    if (currentBox && !best) best = this.active
    if (currentBox && best && currentBox.distance <= measured.get(best)!.distance + 120) best = this.active
    if (!best || best === this.active || this.isSuppressed(best)) {
      this.pending = null
      if (best && this.isSuppressed(best) && this.active) this.pauseActive('viewport')
      return
    }
    const now = Date.now()
    if (this.pending !== best) { this.pending = best; this.pendingAt = now }
    const remaining = 300 - (now - this.pendingAt)
    if (remaining > 0) {
      if (this.timer != null) clearTimeout(this.timer)
      this.timer = setTimeout(() => { this.timer = null; this.compute() }, remaining)
      return
    }
    this.start(best, true)
  }

  private start(id: string, automatic: boolean) {
    const entry = this.entries.get(id)
    if (!entry || this.hidden && this.pinned !== id) return
    if (automatic && this.isSuppressed(id)) return
    const previousID = this.active
    const previousOwner = previousID ? this.focusID(previousID) : null
    // An automatic feed-to-feed transition may replace its own owner, but never audio or a lightbox.
    const canReplaceFeed = this.focus.currentId === previousOwner
    if (!this.focus.claim(this.focusID(id), () => {
      if (this.active === id) this.pauseActive('interrupted', false)
    }, { automatic: automatic && !canReplaceFeed, background: false })) return
    if (previousID && previousID !== id && this.active === previousID) this.pauseActive('viewport', false)
    this.attempt?.abort()
    const attempt = new AbortController()
    this.attempt = attempt
    this.active = id
    this.pending = null
    this.onChange(this.active, this.audio)
    entry.onState?.('buffering')
    try {
      const result = entry.adapter.play({ ...this.audio, automatic, signal: attempt.signal })
      Promise.resolve(result).catch(error => {
        if (attempt.signal.aborted || this.active !== id) return
        this.report(id, error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'failed')
      })
    } catch {
      if (!attempt.signal.aborted) this.report(id, 'failed')
    }
  }

  private pauseActive(reason: PauseReason, release = true) {
    const id = this.active
    this.attempt?.abort()
    this.attempt = null
    this.active = null
    if (this.pinned === id) this.pinned = null
    this.onChange(null, this.audio)
    if (!id) return
    this.entries.get(id)?.adapter.pause(reason)
    if (release) this.focus.release(this.focusID(id))
  }

  stopAll() { this.pauseActive('interrupted'); this.pending = null }
  reset() {
    this.stopAll()
    this.suppressed.clear()
    this.manuallyPaused.clear()
    this.setAudio({ muted: true, volume: 1 })
    this.schedule()
  }
  dispose() {
    this.stopAll()
    this.unsubscribe()
    if (this.timer != null) clearTimeout(this.timer)
    this.timer = null
    for (const entry of this.entries.values()) entry.adapter.dispose?.()
    this.entries.clear()
  }
}

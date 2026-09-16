/** One foreground media owner. Paused voice notes retain focus so autoplay cannot steal it. */
export class MediaFocus {
  private callActive = false
  setCallActive(active: boolean) {
    this.callActive = active
    // Calls coexist with playback, but still own microphone capture.
    if (active && this.owner?.exclusive) {
      const previous = this.owner
      this.owner = null
      previous.stop()
      this.changed()
    }
  }
  private listeners = new Set<(id: string | null) => void>()
  subscribe(listener: (id: string | null) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private changed() { for (const listener of this.listeners) listener(this.currentId) }
  private owner: { id: string; stop: () => void; exclusive: boolean } | null = null
  get currentId() { return this.owner?.id ?? null }
  claim(id: string, stop: () => void, options: { automatic?: boolean; exclusive?: boolean } = {}): boolean {
    if (this.owner?.id === id) return true
    if (this.callActive && options.exclusive) return false
    if (this.owner && (options.automatic || (this.owner.exclusive && !options.exclusive))) return false
    const previous = this.owner
    this.owner = { id, stop, exclusive: Boolean(options.exclusive) }
    previous?.stop()
    this.changed()
    return this.owner?.id === id
  }
  release(id: string) { if (this.owner?.id === id) { this.owner = null; this.changed() } }
  reset() {
    const previous = this.owner
    this.owner = null
    previous?.stop()
    this.callActive = false
    this.changed()
  }
}
// Only mutated by client playback; no server request stores media here.
export const mediaFocus = new MediaFocus()

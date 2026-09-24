/** One foreground media owner. Paused voice notes retain focus so autoplay cannot steal it. */
export class MediaFocus {
  private callActive = false
  get isCallActive() { return this.callActive }
  setCallActive(active: boolean) {
    this.callActive = active
    // Calls coexist with playback, but still own microphone capture.
    if (active && this.owner?.exclusive) {
      const previous = this.owner
      this.owner = null
      previous.stop()
    }
    this.changed()
  }
  private listeners = new Set<(id: string | null) => void>()
  subscribe(listener: (id: string | null) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private changed() { for (const listener of this.listeners) listener(this.currentId) }
  private owner: { id: string; stop: () => void; exclusive: boolean; background: boolean } | null = null
  private generation = 0
  get currentId() { return this.owner?.id ?? null }
  get revision() { return this.generation }
  claim(id: string, stop: () => void, options: { automatic?: boolean; exclusive?: boolean; background?: boolean } = {}): boolean {
    if (this.owner?.id === id) return true
    if (this.callActive && options.exclusive) return false
    if (this.owner && (options.automatic || (this.owner.exclusive && !options.exclusive))) return false
    const previous = this.owner
    this.generation += 1
    this.owner = { id, stop, exclusive: Boolean(options.exclusive), background: options.background ?? !id.startsWith('video:') }
    previous?.stop()
    this.changed()
    return this.owner?.id === id
  }
  release(id: string) { if (this.owner?.id === id) { this.generation += 1; this.owner = null; this.changed() } }
  suspendForeground(except?: string | null) {
    const owner = this.owner
    if (!owner || owner.background || owner.id === except) return
    this.owner = null
    this.generation += 1
    owner.stop()
    this.changed()
  }
  reset() {
    const previous = this.owner
    this.owner = null
    this.generation += 1
    previous?.stop()
    this.callActive = false
    this.changed()
  }
}
// Only mutated by client playback; no server request stores media here.
export const mediaFocus = new MediaFocus()

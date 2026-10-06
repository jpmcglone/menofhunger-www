export type JourneyName = 'home_ready' | 'inbox_ready' | 'thread_ready' | 'composer_ready' | 'post_detail_ready'
export type JourneyOutcome = 'success' | 'error' | 'navigation' | 'cancellation' | 'timeout'
export type JourneySource = 'network' | 'cache' | 'empty' | 'access' | 'local'
export type JourneyEntry = 'startup' | 'navigation' | 'presentation' | 'deep_link'
export interface JourneySample {
  name: JourneyName
  entry: JourneyEntry
  outcome: JourneyOutcome
  source: JourneySource
  milliseconds: number
}

/** Local tokens protect against stale renders. Context is never included in telemetry. */
export class JourneyRecorder {
  private serial = 0
  private active = new Map<JourneyName, {
    token: number; start: number; entry: JourneyEntry; timer?: ReturnType<typeof setTimeout>
  }>()

  constructor(
    private readonly sink: (sample: JourneySample) => void,
    private readonly clock: () => number = () => performance.now(),
    private readonly automaticTimeouts = true,
  ) {}

  begin(name: JourneyName, entry: JourneyEntry, start = this.clock()): number {
    this.finish(name, this.token(name), 'navigation')
    const token = ++this.serial
    const timer = this.automaticTimeouts
      ? setTimeout(() => this.finish(name, token, 'timeout'), 30_000)
      : undefined
    this.active.set(name, { token, start, entry, timer })
    return token
  }

  token(name: JourneyName): number | undefined { return this.active.get(name)?.token }

  finish(name: JourneyName, token: number | undefined, outcome: JourneyOutcome = 'success', source: JourneySource = 'local') {
    const current = this.active.get(name)
    if (!current || token !== current.token) return
    this.active.delete(name)
    clearTimeout(current.timer)
    const milliseconds = Math.max(0, this.clock() - current.start)
    this.sink({ name, entry: current.entry, outcome: milliseconds >= 30_000 ? 'timeout' : outcome, source, milliseconds })
  }

  cancelAll(outcome: JourneyOutcome = 'cancellation') {
    for (const [name, current] of this.active) this.finish(name, current.token, outcome)
  }
}

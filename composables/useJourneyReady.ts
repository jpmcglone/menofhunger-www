import type { JourneyName, JourneySource } from '~/utils/performance-journeys'

/** A readiness signal is sampled after Vue commits and a browser frame boundary. */
export function useJourneyReady(
  name: JourneyName,
  ready: () => boolean,
  options: { source?: () => JourneySource; failed?: () => boolean; context?: () => unknown } = {},
) {
  const recorder = useNuxtApp().$journeys
  let mounted = false
  let token: number | undefined
  let frame: number | undefined
  const check = async () => {
    if (!import.meta.client || !mounted || !recorder) return
    if (options.failed?.()) { recorder.finish(name, token, 'error'); return }
    if (!ready()) return
    const current = token
    await nextTick()
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = undefined
      if (mounted && current === token && ready() && !options.failed?.()) {
        recorder.finish(name, current, 'success', options.source?.() ?? 'network')
      }
    })
  }
  watch(() => options.context?.(), () => { token = recorder?.token(name); void check() }, { flush: 'post' })
  watch([ready, () => options.failed?.() ?? false], () => { void check() }, { flush: 'post' })
  const activate = () => { mounted = true; token = recorder?.token(name); void check() }
  onMounted(activate)
  onActivated(activate)
  onDeactivated(() => { mounted = false; recorder?.finish(name, token, 'navigation') })
  onBeforeUnmount(() => {
    mounted = false
    if (frame !== undefined) cancelAnimationFrame(frame)
    recorder?.finish(name, token, 'navigation')
  })
}

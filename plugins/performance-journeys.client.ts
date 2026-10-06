import { startInactiveSpan } from '@sentry/nuxt'
import { JourneyRecorder } from '~/utils/performance-journeys'

export default defineNuxtPlugin((app) => {
  const recorder = new JourneyRecorder((sample) => {
    const span = startInactiveSpan({
      name: sample.name,
      op: 'ui.journey',
      forceTransaction: true,
      startTime: (Date.now() - sample.milliseconds) / 1000,
      attributes: {
        'journey.platform': 'web',
        'journey.entry': sample.entry,
        'journey.source': sample.source,
        'journey.outcome': sample.outcome,
        'journey.duration_ms': sample.milliseconds,
      },
    })
    span.end()
  })
  const router = useRouter()
  function startRoute(path: string, thread: unknown, initial: boolean) {
    recorder.cancelAll('navigation')
    const entry = initial ? 'startup' : 'navigation'
    const start = initial ? 0 : performance.now()
    if (path === '/home') recorder.begin('home_ready', entry, start)
    if (path === '/chat') {
      recorder.begin('inbox_ready', entry, start)
      if (thread) recorder.begin('thread_ready', entry, start)
    }
    if (/^\/p\/[^/]+$/.test(path)) recorder.begin('post_detail_ready', entry, start)
  }
  startRoute(router.currentRoute.value.path, router.currentRoute.value.query.c, true)
  router.beforeEach((to, from) => {
    // In-page chat selection owns its start before mutating selection or loading messages.
    if (to.path === '/chat' && from.path === '/chat') return
    if (to.path !== from.path) startRoute(to.path, to.query.c, !from.matched.length)
  })
  const user = useState<{ id: string } | null>('auth-user', () => null)
  watch(() => user.value?.id, (id, previous) => {
    if (previous && previous !== id) recorder.cancelAll()
  })
  app.hook('app:error', () => recorder.cancelAll('error'))
  return { provide: { journeys: recorder } }
})

import { needsOnboarding } from '~/utils/onboarding'

export type FirstRunStep = 'none' | 'photo' | 'profile' | 'email'

export function useFirstRunFlow() {
  const step = useState<FirstRunStep>('moh.first-run.step', () => 'none')
  const passedEmail = useState('moh.first-run.email-done', () => false)
  const consumedWelcome = useState('moh.first-run.welcome-consumed', () => false)
  const { user } = useAuth()
  const route = useRoute()

  const blocked = computed(() => step.value !== 'none' || arrivalSession.value)

  // A completed signup goes straight to the feed. Optional setup is user-initiated.
  const arrivalSession = useState('moh.first-run.arrival-session', () => false)
  function startAfterOnboarding() {
    arrivalSession.value = true
    step.value = 'none'
  }

  /** `?welcome=1` after signup: marks arrival without opening a sheet. */
  function consumeWelcomeQuery() {
    if (consumedWelcome.value) return
    if (String(route.query.welcome ?? '') !== '1') return
    if (!user.value?.id || needsOnboarding(user.value)) return
    consumedWelcome.value = true
    if (step.value === 'none') startAfterOnboarding()
    if (!import.meta.client) return
    const query = { ...route.query }
    delete query.welcome
    void navigateTo({ path: route.path, query }, { replace: true })
  }

  function skipPhoto() {
    step.value = 'none'
  }

  function addPhoto() {
    step.value = 'profile'
  }

  function finishProfile() {
    step.value = 'none'
  }

  function finishEmail() {
    passedEmail.value = true
    step.value = 'none'
  }

  watch(() => user.value?.id, (id, previous) => {
    if (id !== previous) { arrivalSession.value = false; consumedWelcome.value = false; step.value = 'none' }
  })

  return {
    step,
    blocked,
    startAfterOnboarding,
    consumeWelcomeQuery,
    skipPhoto,
    addPhoto,
    finishProfile,
    finishEmail,
  }
}

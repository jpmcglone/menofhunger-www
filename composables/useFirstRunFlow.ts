import { needsOnboarding } from '~/utils/onboarding'

export type FirstRunStep = 'none' | 'photo' | 'profile' | 'email'

export function useFirstRunFlow() {
  const step = useState<FirstRunStep>('moh.first-run.step', () => 'none')
  const passedEmail = useState('moh.first-run.email-done', () => false)
  const consumedWelcome = useState('moh.first-run.welcome-consumed', () => false)
  const { user } = useAuth()
  const route = useRoute()

  const blocked = computed(() => step.value !== 'none')

  function maybeOfferEmail() {
    const email = (user.value?.email ?? '').trim()
    if (!passedEmail.value && !email) {
      step.value = 'email'
      return
    }
    step.value = 'none'
  }

  function startAfterOnboarding() {
    step.value = 'photo'
  }

  /** `?welcome=1` after signup: photo interstitial, not a jump into profile edit. */
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
    maybeOfferEmail()
  }

  function addPhoto() {
    step.value = 'profile'
  }

  function finishProfile() {
    maybeOfferEmail()
  }

  function finishEmail() {
    passedEmail.value = true
    step.value = 'none'
  }

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

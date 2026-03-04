const STORAGE_KEY = 'moh.welcome.v1'

export function useWelcomeCard() {
  const dismissed = ref(true) // start true (hidden) until we read localStorage on mount

  onMounted(() => {
    dismissed.value = localStorage.getItem(STORAGE_KEY) === 'true'
  })

  function dismiss() {
    dismissed.value = true
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  return { dismissed, dismiss }
}

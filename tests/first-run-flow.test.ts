import { defineComponent, ref, nextTick } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFirstRunFlow } from '~/composables/useFirstRunFlow'
const fixture = vi.hoisted(() => ({ user: null as any, states: new Map(), route: { path: '/home', query: {} as Record<string, string> } }))
mockNuxtImport('useAuth', () => () => ({ user: fixture.user }))
mockNuxtImport('useRoute', () => () => fixture.route)
mockNuxtImport('useState', () => (key: string, initial: () => unknown) => {
  if (!fixture.states.has(key)) fixture.states.set(key, ref(initial()))
  return fixture.states.get(key)
})
beforeEach(() => {
  fixture.states.clear()
  fixture.route.query = {}
  fixture.user = ref({ id: 'new', usernameIsSet: true, birthdate: '1990-01-15', interests: ['fitness'], menOnlyConfirmed: true })
})
async function render() {
  let flow!: ReturnType<typeof useFirstRunFlow>
  const view = await mountSuspended(defineComponent({ setup() { flow = useFirstRunFlow(); return () => null } }))
  return { flow, view }
}
describe('optional first-run flow', () => {
  it('lands directly in the feed and only opens profile details on request', async () => {
    const { flow, view } = await render()
    flow.startAfterOnboarding()
    expect(flow.step.value).toBe('none')
    expect(flow.blocked.value).toBe(true)
    flow.addPhoto()
    expect(flow.step.value).toBe('profile')
    flow.finishProfile()
    expect(flow.step.value).toBe('none')
    view.unmount()
  })
  it('clears arrival and optional-sheet state when accounts change', async () => {
    const { flow, view } = await render()
    flow.startAfterOnboarding()
    flow.addPhoto()
    fixture.user.value = { ...fixture.user.value, id: 'returning' }
    await nextTick()
    expect(flow.step.value).toBe('none')
    expect(flow.blocked.value).toBe(false)
    view.unmount()
  })
})

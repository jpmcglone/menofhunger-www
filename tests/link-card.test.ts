import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import LinkCard from '~/components/app/LinkCard.vue'

const global = { stubs: { Icon: true } }
const base = { href: 'https://bitrig.com/', siteLabel: 'bitrig.com' }

describe('Link card', () => {
  it('keeps one fixed shape and shows the site with skeleton bars while loading', async () => {
    const wrapper = await mountSuspended(LinkCard, { props: { ...base, state: 'loading' }, global })
    const root = wrapper.find('a')
    expect(root.classes()).toContain('h-[112px]')
    expect(root.attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('bitrig.com')
    expect(wrapper.findAll('.motion-safe\\:animate-pulse').length).toBeGreaterThanOrEqual(4)
  })

  it('fills in the title, description, and image when metadata arrives', async () => {
    const wrapper = await mountSuspended(LinkCard, {
      props: { ...base, state: 'ready', title: 'Bitrig | Build and ship native Swift apps', description: 'Describe the app you want.', imageUrl: 'https://bitrig.com/og.png' },
      global,
    })
    expect(wrapper.find('a').classes()).toContain('h-[112px]')
    expect(wrapper.text()).toContain('Bitrig | Build and ship native Swift apps')
    expect(wrapper.text()).toContain('Describe the app you want.')
    expect(wrapper.find('img').attributes('src')).toBe('https://bitrig.com/og.png')
    expect(wrapper.find('a').attributes('aria-busy')).toBeUndefined()
  })

  it('falls back to the site name in the same shape when no preview is available', async () => {
    const wrapper = await mountSuspended(LinkCard, { props: { ...base, state: 'unavailable' }, global })
    expect(wrapper.find('a').classes()).toContain('h-[112px]')
    expect(wrapper.text()).toContain('Preview unavailable')
    expect(wrapper.find('img').exists()).toBe(false)
  })
})

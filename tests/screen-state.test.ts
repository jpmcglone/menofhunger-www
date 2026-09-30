import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ScreenState from '~/components/app/ScreenState.vue'

describe('screen states', () => {
  it('keeps contextual copy and announces errors with a labelled heading', async () => {
    const wrapper = await mountSuspended(ScreenState, { props: {
      title: 'Couldn’t load articles', description: 'Check your connection.', icon: 'warning', error: true,
    } })
    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.get('h2').attributes('id')).toBe(wrapper.attributes('aria-labelledby'))
    expect(wrapper.text()).toContain('Check your connection.')
    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  })

  it('emits retry once per click and prevents clicks while busy', async () => {
    const wrapper = await mountSuspended(ScreenState, { props: {
      title: 'Let’s reconnect', prominent: true, icon: 'globe',
      description: 'We can’t reach Men of Hunger. Check your connection and try again.', actionLabel: 'Try again',
    } })
    expect(wrapper.get('h1').text()).toBe('Let’s reconnect')
    if (process.env.MOH_STATE_HTML) writeFileSync(process.env.MOH_STATE_HTML, wrapper.html())
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
    await wrapper.setProps({ busy: true })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
    expect(wrapper.get('button').text()).toBe('Trying again…')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
    await wrapper.setProps({ busy: false })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(2)
    wrapper.unmount()
  })

  it('uses real links for recovery navigation', async () => {
    const wrapper = await mountSuspended(ScreenState, { props: {
      title: 'Page not found', actionLabel: 'Go home', actionTo: '/',
    } })
    expect(wrapper.get('a').attributes('href')).toBe('/')
    expect(wrapper.get('a').text()).toBe('Go home')
    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  })

  it('preserves custom descriptions and secondary actions', async () => {
    const wrapper = await mountSuspended(ScreenState, {
      props: { title: 'No notifications yet' },
      slots: { default: 'Replies and follows appear here.', actions: '<a href="/explore">Explore</a>' },
    })
    expect(wrapper.text()).toContain('Replies and follows appear here.')
    expect(wrapper.get('a').attributes('href')).toBe('/explore')
    wrapper.unmount()
  })
})

import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Receipt from '~/components/app/channels/Receipt.vue'

async function render(props: { status: 'sending' | 'sent' | 'failed' | 'read'; readCount?: number; recipientCount?: number; expanded?: boolean }) {
  const wrapper = await mountSuspended(Receipt, { props })
  return { text: wrapper.text(), label: wrapper.attributes('aria-label'), classes: wrapper.classes() }
}

describe('channel receipt', () => {
  it('spells out the state on the newest message and abbreviates older ones', async () => {
    expect((await render({ status: 'sent', expanded: true })).text).toBe('Sent')
    expect((await render({ status: 'sent' })).text).toBe('')
    expect((await render({ status: 'read', readCount: 3, recipientCount: 12, expanded: true })).text).toBe('Read by 3')
    expect((await render({ status: 'read', readCount: 3, recipientCount: 12 })).text).toBe('3')
  })
  it('describes counts without naming readers and marks everyone', async () => {
    const all = await render({ status: 'read', readCount: 12, recipientCount: 12, expanded: true })
    expect(all.label).toBe('Read by 12 of 12 members')
    expect(all.text).toBe('12')
    expect(all.classes).toContain('receipt--all')
    expect((await render({ status: 'read', readCount: 1, recipientCount: 1 })).label).toBe('Read by 1 of 1 member')
  })
  it('reports sending and failure', async () => {
    expect((await render({ status: 'sending' })).text).toBe('Sending')
    expect((await render({ status: 'failed' })).label).toBe('Couldn’t send')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { checkActivation } from '../composables/useActivationPending'
import { membershipStateFor } from '../utils/membership'
import { hasApiErrorReason } from '../utils/api-error'

describe('membership states', () => {
  it('prefers unavailable over activation pending, and never offers plans while either applies', () => {
    expect(membershipStateFor({ error: 'x', activationPending: true })).toBe('unavailable')
    expect(membershipStateFor({ error: null, activationPending: true })).toBe('activation-pending')
    expect(membershipStateFor({ error: null, activationPending: false })).toBe('ready')
  })
})

describe('activation recovery after a Stripe return', () => {
  it('syncs the checkout session and reports active when Premium arrived', async () => {
    const fetch = vi.fn().mockResolvedValue({ premium: true })
    await expect(checkActivation(fetch as never, 'cs_1')).resolves.toMatchObject({ active: true })
    expect(fetch).toHaveBeenCalledWith('/billing/checkout-session/sync', { method: 'POST', body: { sessionId: 'cs_1' } })
  })
  it('falls back to billing when sync fails or has not activated yet', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('sync')).mockResolvedValueOnce({ premium: false, premiumPlus: false })
    await expect(checkActivation(fetch as never, 'cs_1')).resolves.toMatchObject({ active: false })
    expect(fetch).toHaveBeenLastCalledWith('/billing/me', { method: 'GET' })
  })
  it('reads billing directly without a session id', async () => {
    const fetch = vi.fn().mockResolvedValue({ premiumPlus: true })
    await expect(checkActivation(fetch as never, null)).resolves.toMatchObject({ active: true })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('api error reasons', () => {
  it('detects references_changed from the error envelope', () => {
    const error = { data: { meta: { status: 409, errors: [{ code: 409, message: 'changed', reason: 'references_changed' }] } } }
    expect(hasApiErrorReason(error, 'references_changed')).toBe(true)
    expect(hasApiErrorReason(error, 'other')).toBe(false)
    expect(hasApiErrorReason(new Error('x'), 'references_changed')).toBe(false)
  })
})

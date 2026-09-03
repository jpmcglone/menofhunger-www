import { describe, expect, it } from 'vitest'
import { isIosWebKit } from '~/utils/ios-webkit'

describe('isIosWebKit', () => {
  it('matches iPhone Safari', () => {
    expect(
      isIosWebKit(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true)
  })

  it('matches iOS Chrome (still WebKit)', () => {
    expect(
      isIosWebKit(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true)
  })

  it('matches iPadOS desktop-UA with touch', () => {
    expect(
      isIosWebKit(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
        5,
      ),
    ).toBe(true)
  })

  it('rejects desktop Chrome and desktop Safari without touch', () => {
    expect(
      isIosWebKit(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toBe(false)
    expect(
      isIosWebKit(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
        0,
      ),
    ).toBe(false)
  })
})

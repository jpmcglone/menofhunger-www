import { describe, expect, it } from 'vitest'
import vectors from './fixtures/x-text-v3.json'
import { xWeightedLength } from '../utils/crosspost'
import { integrationMicros } from '../utils/integration-money'
describe('official twitter-text v3 conformance', () => {
  it.each(vectors)('$description', ({ text, weightedLength }) => expect(xWeightedLength(text)).toBe(weightedLength))
  it('uses exact dollars for admin charge evidence', () => {
    expect(integrationMicros('0.000001')).toBe(1)
    expect(integrationMicros('1.234567')).toBe(1234567)
    for (const text of ['-1', '1e2', '', '0.0000001', '2000.000001']) expect(integrationMicros(text)).toBeNull()
  })
})

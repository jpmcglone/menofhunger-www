import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitNavByCapacity } from '~/utils/app-nav-overflow'

describe('left-rail overflow', () => {
  it('shows every item that fits and keeps leftover behind More', () => {
    const items = ['home', 'explore', 'board', 'articles', 'groups', 'map']
    expect(splitNavByCapacity(items, 8)).toEqual({ visible: items, overflow: [] })
    expect(splitNavByCapacity(items, 4)).toEqual({
      visible: ['home', 'explore', 'board'],
      overflow: ['articles', 'groups', 'map'],
    })
    expect(splitNavByCapacity(items, 1)).toEqual({
      visible: [],
      overflow: items,
    })
  })

  it('keeps the left rail fill-to-fit and draws a divider after Explore', () => {
    const source = readFileSync(
      join(process.cwd(), 'components/app/layout/LeftRail.vue'),
      'utf8',
    )
    expect(source).toContain('splitNavByCapacity')
    expect(source).not.toContain('isAppNavFloorKey')
    expect(source).toMatch(/item\.key === 'explore'/)
    expect(source).toMatch(/role="separator"/)
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RoadmapItems from '~/components/roadmap/Items.vue'
import { formatRoadmapText, splitRoadmapItem } from '~/utils/roadmap'
import { roadmapPhases, roadmapBacklog } from '~/config/roadmap.data'

describe('roadmap presentation', () => {
  it('keeps all authored text after separating the title', () => {
    for (const item of [...roadmapPhases.flatMap(phase => phase.chunks), ...roadmapBacklog.chunks].flatMap(chunk => chunk.items)) {
      const { title, description } = splitRoadmapItem(item.text)
      const plain = item.text.replace(/\*\*/g, '')
      expect(plain).toContain(title)
      expect(plain.endsWith(description.replace(/\*\*/g, ''))).toBe(true)
    }
  })
  it('escapes markup while retaining authored emphasis', () => {
    expect(formatRoadmapText('**Safe** <img src=x onerror="bad()">')).toBe('<strong>Safe</strong> &lt;img src=x onerror=&quot;bad()&quot;&gt;')
  })
  it('renders each status explicitly and keeps completed descriptions readable', () => {
    const view = mount(RoadmapItems, { props: { items: [
      { text: '**Shipped** — Still readable', done: true },
      { text: '**Building** — In development', inProgress: true },
      { text: 'Future work' },
    ] } })
    expect(view.findAll('li').map(row => row.text())).toEqual([
      'ShippedDoneStill readable', 'BuildingIn progressIn development', 'Future workPlanned',
    ])
    expect(view.find('s, del').exists()).toBe(false)
    view.unmount()
  })
})

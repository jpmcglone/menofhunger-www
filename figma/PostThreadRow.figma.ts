// url=https://www.figma.com/file/YnuRSJB7p90n9jEY4mb4RN/Men-of-Hunger?node-id=243-527
// source=components/app/PostRow.vue
// component=AppPostRow
import figma from 'figma'

const instance = figma.selectedInstance
const kind = instance.getEnum('Kind', {
  Parent: 'parent',
  'Focused reply': 'focused',
  Discovery: 'discovery',
  Reply: 'reply',
})

export default {
  example: figma.code`<AppPostRow
  :post="post"${kind === 'parent' ? ' show-thread-line-below-avatar' : ''}${kind === 'reply' || kind === 'focused' ? ' show-thread-line-above-avatar' : ''}${kind === 'focused' ? ' highlight' : ''}
/>`,
  imports: [],
  id: 'post-thread-row',
  metadata: { nestable: false },
}

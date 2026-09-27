// url=https://www.figma.com/file/YnuRSJB7p90n9jEY4mb4RN/Men-of-Hunger?node-id=15-365
// source=components/app/PostRow.vue
// component=AppPostRow
import figma from 'figma'

const instance = figma.selectedInstance
const context = instance.getEnum('Context', {
  Post: 'post',
  Reply: 'reply',
})

export default {
  example: figma.code`<AppPostRow :post="post"${context === 'reply' ? ' show-thread-line-above-avatar' : ''} />`,
  imports: [],
  id: 'post-row',
  metadata: { nestable: false },
}

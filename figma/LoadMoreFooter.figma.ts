// url=https://www.figma.com/file/YnuRSJB7p90n9jEY4mb4RN/Men-of-Hunger?node-id=980-85
// source=components/app/chrome/LoadMoreFooter.vue
// component=AppLoadMoreFooter
import figma from 'figma'

const instance = figma.selectedInstance
const state = instance.getEnum('State', {
  Idle: 'idle',
  Loading: 'loading',
  Error: 'error',
  End: 'end',
})

export default {
  example: figma.code`<AppLoadMoreFooter state="${state}" />`,
  imports: [],
  id: 'load-more-footer',
  metadata: { nestable: true },
}

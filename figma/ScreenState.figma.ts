// url=https://www.figma.com/file/YnuRSJB7p90n9jEY4mb4RN/Men-of-Hunger?node-id=980-85
// source=components/app/ScreenState.vue
// component=AppScreenState
import figma from 'figma'

const instance = figma.selectedInstance
const status = instance.getEnum('Status', {
  Loading: 'loading',
  Empty: 'empty',
  Error: 'error',
  Content: 'content',
})
const emptyVariant = instance.getEnum('Empty variant', {
  Default: 'default',
  All: 'all',
  Following: 'following',
})
const skeleton = instance.getEnum('Skeleton', {
  Post: 'post',
  User: 'user',
  Notification: 'notification',
  Settings: 'settings',
})

export default {
  example: figma.code`<AppScreenState status="${status}" empty-variant="${emptyVariant}" skeleton="${skeleton}" title="Couldn’t load this page" action-label="Try again" />`,
  imports: [],
  id: 'screen-state',
  metadata: { nestable: false },
}

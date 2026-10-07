// url=https://www.figma.com/file/YnuRSJB7p90n9jEY4mb4RN/Men-of-Hunger?node-id=980-85
// source=components/app/chrome/SkeletonRow.vue
// component=AppSkeletonRow
import figma from 'figma'

const instance = figma.selectedInstance
const variant = instance.getEnum('Variant', {
  Post: 'post',
  User: 'user',
  Notification: 'notification',
  Settings: 'settings',
})

export default {
  example: figma.code`<AppSkeletonRow variant="${variant}" />`,
  imports: [],
  id: 'skeleton-row',
  metadata: { nestable: true },
}

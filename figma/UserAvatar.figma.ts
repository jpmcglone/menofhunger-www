// url=https://www.figma.com/file/YnuRSJB7p90n9jEY4mb4RN/Men-of-Hunger?node-id=5-101
// source=components/app/UserAvatar.vue
// component=AppUserAvatar
import figma from 'figma'

const instance = figma.selectedInstance
const sizeClass = instance.getEnum('Size', {
  '32': 'h-8 w-8',
  '40': 'h-10 w-10',
})

export default {
  example: figma.code`<AppUserAvatar :user="user" size-class="${sizeClass}" />`,
  imports: [],
  id: 'user-avatar',
  metadata: { nestable: true },
}

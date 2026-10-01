import { createApp, defineComponent, h } from 'vue'
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext'
import theme from '../../config/primevue.theme'
import App from './App.vue'
import './fixture.css'
import { calls } from './fixture-api'
const app = createApp(App).use(PrimeVue, { theme })
for (const [name, component] of Object.entries({ Button, Dialog, Checkbox, Textarea, InputText })) app.component(name, component)
app.component('AppPageContent', defineComponent({ setup: (_, { slots }) => () => h('section', slots.default?.()) }))
app.component('AppPageHeader', defineComponent({ props: ['title', 'description'], setup: props => () => h('header', [h('h2', props.title), h('p', props.description)]) }))
app.component('NuxtLink', defineComponent({ props: ['to'], setup: (props, { slots }) => () => h('a', { href: props.to }, slots.default?.()) }))
app.component('AppAvatarCircle', defineComponent({ props: ['name', 'sizeClass'], setup: props => () => h('span', { class: `inline-flex items-center justify-center rounded-full bg-orange-900 text-white ${props.sizeClass}`, 'aria-label': props.name }, props.name?.slice(0, 1)) }))
app.component('AppStateShape', defineComponent({ setup: () => () => h('span', { 'aria-hidden': true }, 'VA') }))
app.component('Icon', defineComponent({ setup: () => () => h('span', { 'aria-label': 'Verified on X' }, '✓') }))
app.mount('#app')
Object.assign(window, { fixtureCalls: calls })

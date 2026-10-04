import { createApp, defineComponent, h } from 'vue'
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext'
import theme from '../../config/primevue.theme'
import App from './App.vue'
import './fixture.css'
const app = createApp(App).use(PrimeVue, { theme })
for (const [name, component] of Object.entries({ Button, Textarea, InputText })) app.component(name, component)
app.component('AppInlineAlert', defineComponent({ setup: (_, { slots }) => () => h('p', { role: 'alert' }, slots.default?.()) }))
app.mount('#app')

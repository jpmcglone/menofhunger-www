import { createApp, defineComponent, h } from 'vue'
import PrimeVue from 'primevue/config'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import SelectionDialog from '../../components/app/composer/SelectionDialog.vue'
import SelectionRow from '../../components/app/composer/SelectionRow.vue'
import App from './App.vue'

const app = createApp(App).use(PrimeVue, { unstyled: true })
for (const [name, component] of Object.entries({ Dialog, InputText, AppComposerSelectionDialog: SelectionDialog, AppComposerSelectionRow: SelectionRow })) app.component(name, component)
for (const name of ['Icon', 'AppIconGlyph', 'AppGroupsGroupAvatar', 'AppComposerAudienceLabel']) app.component(name, defineComponent({ setup: () => () => h('span') }))
app.mount('#app')

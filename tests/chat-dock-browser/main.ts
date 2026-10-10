import { createApp, defineComponent, h, nextTick } from 'vue'
import Dock from '~/components/app/chat/ChatDesktopDock.vue'
import { useDesktopChatDock } from '~/composables/chat/useDesktopChatDock'
import { conversations } from './fixture-api'
import './style.css'

const app = createApp(defineComponent({
  setup() {
    const dock = useDesktopChatDock()
    Object.assign(window, { fixture: { dock, refresh: async () => { conversations.value = [...conversations.value].reverse(); await nextTick() } } })
    return () => h(Dock)
  },
}))
app.component('NuxtLink', defineComponent({ props: ['to'], setup(props, { slots }) { return () => h('a', { href: props.to }, slots.default?.()) } }))
app.component('Button', defineComponent({ props: ['label'], setup(props, { slots }) { return () => h('button', [slots.icon?.(), props.label]) } }))
for (const name of ['Icon', 'AppUserAvatar', 'AppMarvMark', 'AppRefreshIndicator', 'AppScreenState', 'AppLogoLoader']) app.component(name, defineComponent({ setup() { return () => h('span') } }))
app.mount('#app')

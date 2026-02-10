import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    layout?: string
    title?: string
    hideTopBar?: boolean
  }
}


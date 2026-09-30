import { featureShareHead } from '../utils/feature-share-head'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const metadata = featureShareHead(event.path, html.head.join(''))
    if (metadata) html.head.push(metadata)
  })
})

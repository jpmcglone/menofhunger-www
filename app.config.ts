export default defineAppConfig({
  icon: {
    // Default rendering mode for <Icon />.
    // CSS mode is lightweight and works well with Tailwind utilities.
    mode: 'css',
    // TailwindCSS v4: inject icon CSS into a layer so it plays well with @import "tailwindcss".
    cssLayer: 'base',
  },
})


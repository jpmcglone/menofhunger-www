import type { MenuItem } from 'primevue/menuitem'
export type SurfaceAction = {
  id: string
  label: string
  icon: string
  section: string
  available?: boolean
  destructive?: boolean
  run: () => void | Promise<void>
}
export function actionSections(actions: SurfaceAction[]) {
  const sections = new Map<string, SurfaceAction[]>()
  for (const action of actions) {
    if (action.available === false) continue
    const items = sections.get(action.section) ?? []
    items.push(action)
    sections.set(action.section, items)
  }
  return [...sections.entries()]
}

/** Preserve native PrimeVue keyboard navigation while sharing availability and sections. */
export function surfaceMenuItems(actions: SurfaceAction[]) {
  return actionSections(actions).flatMap(([, entries], index) => [
    ...(index ? [{ separator: true }] : []),
    ...entries.map(action => ({ key: action.id, label: action.label, icon: action.icon, iconName: action.icon, class: action.destructive ? 'text-red-600 dark:text-red-400' : undefined, command: () => { void action.run() } })),
  ])
}

/** Adopt shared sections/availability without losing surface-specific links or disabled rows. */
export function sharedMenuActions<T extends MenuItem & { iconName?: string }>(items: T[]): T[] {
  let section = 0
  const source = new Map<string, T>()
  const actions: SurfaceAction[] = []
  items.forEach((item, index) => {
    if (item.separator) { section++; return }
    const id = String(item.key ?? `action-${index}`)
    source.set(id, item)
    actions.push({ id, label: typeof item.label === 'string' ? item.label : '',
      icon: item.iconName ?? '', section: String(section),
      available: typeof item.visible === 'function' ? item.visible() : item.visible !== false,
      destructive: typeof item.class === 'string' && item.class.includes('text-red'),
      run: () => { item.command?.({ originalEvent: new Event('action'), item }) },
    })
  })
  return actionSections(actions).flatMap(([, entries], index) => [
    ...(index ? [{ separator: true } as T] : []),
    ...entries.map(action => ({ ...source.get(action.id)!, key: action.id })),
  ])
}

export type ShortcutSection = 'Navigation' | 'Feed' | 'Media' | 'Help'

export type ShortcutAction =
  | 'search' | 'compose' | 'home' | 'explore' | 'notifications' | 'chat' | 'spaces'
  | 'groups' | 'bookmarks' | 'profile' | 'onlyMe' | 'radio' | 'settings'
  | 'nextPost' | 'previousPost' | 'reply' | 'previousMedia' | 'nextMedia'
  | 'dismiss' | 'toggleRadio' | 'shortcuts' | 'theme'

export type ShortcutDef = {
  action: ShortcutAction
  /** Display keys; keyMode distinguishes sequences from modifier chords. */
  keys: string[]
  label: string
  section: ShortcutSection
  /** True for shortcuts handled elsewhere (lightbox, theme plugin) — shown in modal but not registered here. */
  displayOnly?: boolean
  /** How multiple keys are combined; never infer a sequence from glyph length. */
  keyMode?: 'sequence' | 'chord'
}

export const ALL_SHORTCUTS: ShortcutDef[] = [
  // Navigation — primary nav items first, then secondary
  { action: 'search', keys: ['/'], label: 'Focus search', section: 'Navigation' },
  { action: 'compose', keys: ['N'], label: 'New post', section: 'Navigation' },
  { action: 'home', keys: ['G', 'H'], label: 'Go to Home', section: 'Navigation', keyMode: 'sequence' },
  { action: 'explore', keys: ['G', 'E'], label: 'Go to Explore', section: 'Navigation', keyMode: 'sequence' },
  { action: 'notifications', keys: ['G', 'N'], label: 'Go to Notifications', section: 'Navigation', keyMode: 'sequence' },
  { action: 'chat', keys: ['G', 'C'], label: 'Go to Chat', section: 'Navigation', keyMode: 'sequence' },
  { action: 'spaces', keys: ['G', 'S'], label: 'Go to Spaces', section: 'Navigation', keyMode: 'sequence' },
  { action: 'groups', keys: ['G', 'G'], label: 'Go to Groups', section: 'Navigation', keyMode: 'sequence' },
  { action: 'bookmarks', keys: ['G', 'B'], label: 'Go to Bookmarks', section: 'Navigation', keyMode: 'sequence' },
  { action: 'profile', keys: ['G', 'P'], label: 'Go to Profile', section: 'Navigation', keyMode: 'sequence' },
  { action: 'onlyMe', keys: ['G', 'M'], label: 'Go to Only Me', section: 'Navigation', keyMode: 'sequence' },
  { action: 'radio', keys: ['G', 'R'], label: 'Go to Radio', section: 'Navigation', keyMode: 'sequence' },
  { action: 'settings', keys: ['<'], label: 'Go to Settings', section: 'Navigation' },
  // Feed
  { action: 'nextPost', keys: ['J'], label: 'Next post', section: 'Feed' },
  { action: 'previousPost', keys: ['K'], label: 'Previous post', section: 'Feed' },
  { action: 'reply', keys: ['R'], label: 'Reply to focused post', section: 'Feed' },
  // Media
  { action: 'previousMedia', keys: ['←'], label: 'Previous media', section: 'Media', displayOnly: true },
  { action: 'nextMedia', keys: ['→'], label: 'Next media', section: 'Media', displayOnly: true },
  { action: 'dismiss', keys: ['Esc'], label: 'Close / dismiss', section: 'Media', displayOnly: true },
  { action: 'toggleRadio', keys: ['Space'], label: 'Play / pause radio', section: 'Media', displayOnly: true },
  // Help
  { action: 'theme', keys: ['Ctrl', 'Shift', '.'], label: 'Cycle theme', section: 'Help', keyMode: 'chord', displayOnly: true },
  { action: 'shortcuts', keys: ['?'], label: 'Show keyboard shortcuts', section: 'Help' },
]

export function useKeyboardShortcuts() {
  const showModal = useState<boolean>('moh.shortcuts.showModal', () => false)

  function openShortcutsModal() {
    showModal.value = true
  }

  function closeShortcutsModal() {
    showModal.value = false
  }

  function toggleShortcutsModal() {
    showModal.value = !showModal.value
  }

  return {
    showModal,
    shortcuts: ALL_SHORTCUTS,
    openShortcutsModal,
    closeShortcutsModal,
    toggleShortcutsModal,
  }
}

import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { loadLocalDraft, saveLocalDraft, clearChannelDraft } from '~/utils/channels/drafts'

type Stored<T> = { revision: string; value: T }
/** Local destination storage is separate from submitted content; writes retain their captured key. */
export function useDestinationComposerDraft<T>(options: {
  key: Ref<string | null>
  snapshot: () => T
  restore: (value: T | null) => void
  hasContent: () => boolean
  preserveInitial: () => boolean
  suspended?: () => boolean
}) {
  const loading = ref(false), saved = ref(false)
  const blockingLoad = ref(false)
  let activeKey: string | null = null, generation = 0, mounted = false, revision = ''
  let disposed = false
  let changingDestination = false
  let saving: Promise<void> = Promise.resolve()
  const submittedRevisions = new Map<string, string>()
  function persist(previous?: { key: string; revision: string }) {
    if (!mounted || blockingLoad.value || !activeKey || options.suspended?.()) return saving
    const key = activeKey
    if (!options.hasContent() && submittedRevisions.has(key)) return saving
    revision = crypto.randomUUID()
    const request = revision
    const value = options.hasContent() ? { revision, value: options.snapshot() } : null
    saved.value = false
    saving = saving.catch(() => undefined).then(() => saveLocalDraft(key, value)).then(async () => {
      // Move only after the new destination is safely saved, and never erase a newer draft.
      if (previous) await clearChannelDraft(previous.key, previous.revision)
      if (revision === request && activeKey === key) saved.value = true
    }).catch(() => { if (activeKey === key) saved.value = false })
    return saving
  }
  /** An audience choice moves this composition; navigation still restores a separate draft. */
  function changeDestination(change: () => void) {
    if (!mounted) { change(); return }
    const previous = activeKey ? { key: activeKey, revision } : undefined
    changingDestination = true
    try { change() } finally { changingDestination = false }
    if (activeKey === options.key.value) return
    if (!options.hasContent()) { void select(options.key.value, false, true); return }
    activeKey = options.key.value
    generation++
    loading.value = false
    blockingLoad.value = false
    saved.value = false
    void persist(previous)
  }
  async function select(key: string | null, initial = false, keepEditable = false) {
    if (!initial) void persist()
    activeKey = key
    const request = ++generation
    const restoreRevision = revision
    loading.value = !!key
    blockingLoad.value = !!key && !keepEditable
    saved.value = false
    if (!initial && !keepEditable) options.restore(null)
    if (!key) { loading.value = false; return }
    try {
      await saving
      const stored = await loadLocalDraft<Stored<T>>(key)
      if (request !== generation) return
      const keepTypedContent = keepEditable && (options.hasContent() || revision !== restoreRevision)
      if (!keepTypedContent && (!initial || (!options.preserveInitial() && !options.hasContent()))) options.restore(stored?.value ?? null)
      revision = stored?.revision ?? crypto.randomUUID()
      saved.value = !initial || !options.preserveInitial() || !options.hasContent()
    } catch { if (request === generation) saved.value = false }
    finally {
      if (request === generation) {
        loading.value = false
        blockingLoad.value = false
        if (keepEditable && options.hasContent()) void persist()
      }
    }
  }
  function capture() {
    if (activeKey) submittedRevisions.set(activeKey, revision)
    return { key: activeKey, revision, saving }
  }
  function unchanged(captured: ReturnType<typeof capture>) { return captured.key === activeKey && captured.revision === revision }
  async function submitted(captured: ReturnType<typeof capture>) {
    await captured.saving
    if (captured.key) {
      await clearChannelDraft(captured.key, captured.revision).catch(() => undefined)
      if (submittedRevisions.get(captured.key) === captured.revision) submittedRevisions.delete(captured.key)
    }
  }
  watch(options.snapshot, () => { void persist() }, { deep: true, flush: 'post' })
  watch(options.key, key => { if (mounted && !changingDestination) void select(key) }, { flush: 'sync' })
  onMounted(async () => {
    // All explicit initial values and their destination are seeded by sibling mount hooks first.
    await nextTick()
    if (disposed) return
    mounted = true
    await select(options.key.value, true)
    if (options.hasContent() && options.preserveInitial()) await persist()
  })
  onBeforeUnmount(() => { void persist(); mounted = false; disposed = true; generation++ })
  return { loading, blockingLoad, saved, persist, capture, submitted, unchanged, changeDestination }
}

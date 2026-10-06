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
  let activeKey: string | null = null, generation = 0, mounted = false, revision = ''
  let disposed = false
  let saving: Promise<void> = Promise.resolve()
  const submittedRevisions = new Map<string, string>()
  function persist() {
    if (!mounted || loading.value || !activeKey || options.suspended?.()) return saving
    const key = activeKey
    if (!options.hasContent() && submittedRevisions.has(key)) return saving
    revision = crypto.randomUUID()
    const request = revision
    const value = options.hasContent() ? { revision, value: options.snapshot() } : null
    saved.value = false
    saving = saving.catch(() => undefined).then(() => saveLocalDraft(key, value)).then(() => {
      if (revision === request && activeKey === key) saved.value = true
    }).catch(() => { if (activeKey === key) saved.value = false })
    return saving
  }
  async function select(key: string | null, initial = false) {
    if (!initial) void persist()
    activeKey = key
    const request = ++generation
    loading.value = !!key
    saved.value = false
    if (!initial) options.restore(null)
    if (!key) { loading.value = false; return }
    try {
      await saving
      const stored = await loadLocalDraft<Stored<T>>(key)
      if (request !== generation) return
      if (!initial || (!options.preserveInitial() && !options.hasContent())) options.restore(stored?.value ?? null)
      revision = stored?.revision ?? crypto.randomUUID()
      saved.value = !initial || !options.preserveInitial() || !options.hasContent()
    } catch { if (request === generation) saved.value = false }
    finally { if (request === generation) loading.value = false }
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
  watch(options.key, key => { if (mounted) void select(key) }, { flush: 'sync' })
  onMounted(async () => {
    // All explicit initial values and their destination are seeded by sibling mount hooks first.
    await nextTick()
    if (disposed) return
    mounted = true
    await select(options.key.value, true)
    if (options.hasContent() && options.preserveInitial()) await persist()
  })
  onBeforeUnmount(() => { void persist(); mounted = false; disposed = true; generation++ })
  return { loading, saved, persist, capture, submitted, unchanged }
}

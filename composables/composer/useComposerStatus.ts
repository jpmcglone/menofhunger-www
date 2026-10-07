import type { ComputedRef } from 'vue'
import { getApiErrorMessage } from '~/utils/api-error'

export function useComposerStatus(opts: {
  enableAvatarStatusEditor: ComputedRef<boolean>
  userId: ComputedRef<string | undefined>
}) {
  const { getUserStatus, setMyStatus, editMyStatus, clearMyStatus } = usePresence()
  const statusEditorOpen = ref(false)
  const statusDraft = ref('')
  const statusSaving = ref(false)
  const statusError = ref<string | null>(null)
  const activeStatus = computed(() => {
    const id = opts.userId.value
    return id ? getUserStatus(id) : null
  })

  function openStatusEditor() {
    if (!opts.enableAvatarStatusEditor.value) return
    statusDraft.value = activeStatus.value?.text ?? ''
    statusError.value = null
    statusEditorOpen.value = true
  }

  function closeStatusEditor() {
    statusEditorOpen.value = false
    statusError.value = null
  }

  async function saveStatus(optsSave?: { durationHours?: 1 | 3 | 6 | 12 | 24; createsPost?: boolean }) {
    const text = statusDraft.value.trim()
    if (!text) return
    statusSaving.value = true
    statusError.value = null
    try {
      await setMyStatus(text, optsSave)
      closeStatusEditor()
    } catch (e) {
      statusError.value = getApiErrorMessage(e) || 'Could not save status.'
    } finally {
      statusSaving.value = false
    }
  }

  async function editStatus() {
    const text = statusDraft.value.trim()
    if (!text) return
    statusSaving.value = true
    statusError.value = null
    try {
      await editMyStatus(text)
      closeStatusEditor()
    } catch (e) {
      statusError.value = getApiErrorMessage(e) || 'Could not update status.'
    } finally {
      statusSaving.value = false
    }
  }

  async function clearStatus() {
    if (!activeStatus.value) return
    statusSaving.value = true
    statusError.value = null
    try {
      await clearMyStatus()
      statusDraft.value = ''
      closeStatusEditor()
    } catch (e) {
      statusError.value = getApiErrorMessage(e) || 'Could not clear status.'
    } finally {
      statusSaving.value = false
    }
  }

  function onStatusEditorKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closeStatusEditor()
  }

  if (import.meta.client) {
    watch(statusEditorOpen, (open) => {
      if (open) document.addEventListener('keydown', onStatusEditorKeydown)
      else document.removeEventListener('keydown', onStatusEditorKeydown)
    })
    onBeforeUnmount(() => document.removeEventListener('keydown', onStatusEditorKeydown))
  }

  return {
    statusEditorOpen,
    statusDraft,
    statusSaving,
    statusError,
    activeStatus,
    openStatusEditor,
    closeStatusEditor,
    saveStatus,
    editStatus,
    clearStatus,
  }
}

import type { ComputedRef } from 'vue'
import type { PostVisibility } from '~/types/api'
import { visibilityTagLabel } from '~/utils/post-visibility'
import { tinyTooltip } from '~/utils/tiny-tooltip'

export function useComposerDestination(opts: {
  mode: ComputedRef<'create' | 'edit'>
  replyTo: ComputedRef<{ groupDisplayName?: string | null; visibility?: PostVisibility } | null | undefined>
  quotedPost: ComputedRef<unknown>
  communityGroupId: ComputedRef<string | null | undefined>
  lockedVisibility: ComputedRef<PostVisibility | null>
  checkinPrompt: ComputedRef<string | undefined>
  groupComposer: ComputedRef<boolean | undefined>
  groupName: ComputedRef<string | undefined>
  hideVisibilityPicker: ComputedRef<boolean | undefined>
  showChatDestinationProp: ComputedRef<boolean | undefined>
  allowedVisibilities: ComputedRef<PostVisibility[] | undefined>
  viewerIsVerified: ComputedRef<boolean>
  isAuthed: ComputedRef<boolean>
  isPremium: ComputedRef<boolean>
  isBusy: () => boolean
}) {
  const selectedGroupId = ref<string | null>(null)
  const { groups: myGroups, loading: myGroupsLoading, error: myGroupsError, load: loadSharedMyGroups } = useMyGroups()
  const effectiveGroupId = computed(() => selectedGroupId.value ?? opts.communityGroupId.value ?? null)
  const canChooseGroup = computed(() =>
    opts.mode.value === 'create'
    && !opts.replyTo.value
    && !opts.quotedPost.value
    && !opts.communityGroupId.value
    && !opts.lockedVisibility.value
    && !opts.checkinPrompt.value
    && opts.viewerIsVerified.value,
  )
  const selectedGroupReadLabel = computed(() => {
    const group = myGroups.value.find(group => group.id === effectiveGroupId.value)
    return group?.joinPolicy === 'open' ? 'Verified members can read' : 'Visibility set by group'
  })

  async function loadMyGroups() {
    if (opts.communityGroupId.value) return
    try {
      await loadSharedMyGroups()
    } catch {
      // The picker can remain empty; a later open retries through the shared cache.
    }
  }

  const { rememberFeed, rememberGroup } = useShareDestination()
  const { visibility } = useComposerVisibility()

  function selectDestinationVisibility(value: PostVisibility) {
    if (opts.isBusy()) return
    visibility.value = value
    selectGroup(null)
  }

  function selectGroup(id: string | null) {
    if (opts.isBusy()) return
    selectedGroupId.value = id
    if (id) {
      const name = myGroups.value.find((group) => group.id === id)?.name
      rememberGroup(id, name)
    } else {
      rememberFeed(visibility.value)
    }
  }

  watch(visibility, (vis) => {
    if (selectedGroupId.value || opts.communityGroupId.value) return
    rememberFeed(vis)
  })

  const allowedComposerVisibilities = computed<PostVisibility[]>(() => {
    if (!opts.isAuthed.value) return ['public']
    if (opts.lockedVisibility.value) return [opts.lockedVisibility.value]

    const tierAllowed: PostVisibility[] = !opts.viewerIsVerified.value
      ? ['onlyMe']
      : (opts.isPremium.value ? ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe'] : ['public', 'verifiedOnly', 'onlyMe'])

    const propAllowed = Array.isArray(opts.allowedVisibilities.value) ? opts.allowedVisibilities.value : null
    if (!propAllowed) return tierAllowed

    const propSet = new Set(propAllowed)
    const intersected = tierAllowed.filter((v) => propSet.has(v))
    if (!intersected.length) return [propAllowed[0] ?? 'public']
    return intersected
  })

  watch(
    allowedComposerVisibilities,
    (allowed) => {
      if (opts.lockedVisibility.value) return
      const set = new Set(allowed)
      if (!set.has(visibility.value)) visibility.value = allowed[0] ?? 'public'
    },
    { immediate: true },
  )

  const effectiveVisibility = computed(() =>
    effectiveGroupId.value || opts.replyTo.value?.groupDisplayName
      ? 'verifiedOnly'
      : (opts.replyTo.value?.visibility ?? opts.lockedVisibility.value ?? visibility.value),
  )

  const replyGroupDisplayLabel = computed(() => (opts.replyTo.value?.groupDisplayName ?? '').trim())
  const replyShowsGroupScope = computed(() => Boolean(replyGroupDisplayLabel.value))
  const useGroupScopeChrome = computed(
    () => Boolean(effectiveGroupId.value || opts.replyTo.value?.groupDisplayName || opts.groupComposer.value) || replyShowsGroupScope.value,
  )

  const showChatDestination = computed(() => {
    if (!opts.showChatDestinationProp.value) return false
    if (opts.replyTo.value || opts.quotedPost.value || opts.checkinPrompt.value) return false
    if (opts.communityGroupId.value || opts.groupComposer.value) return false
    return opts.mode.value === 'create'
  })

  const showVisibilityPicker = computed(() => {
    if (opts.replyTo.value) return false
    if (opts.hideVisibilityPicker.value || effectiveGroupId.value) return false
    if (opts.lockedVisibility.value) return false
    return true
  })
  const showGroupScopeIcon = computed(() => useGroupScopeChrome.value)

  const scopeTagLabel = computed(() => {
    if (opts.groupComposer.value && !opts.replyTo.value) return opts.groupName.value || 'Group'
    if (replyShowsGroupScope.value) return replyGroupDisplayLabel.value
    return visibilityTagLabel(effectiveVisibility.value) ?? 'Public'
  })
  const scopeTagTooltip = computed(() => {
    if (useGroupScopeChrome.value) {
      return tinyTooltip('Visible to members of this group only')
    }
    const v = effectiveVisibility.value
    if (v === 'verifiedOnly') return tinyTooltip('Visible to verified members')
    if (v === 'premiumOnly') return tinyTooltip('Visible to premium members')
    if (v === 'onlyMe') return tinyTooltip('Visible only to you')
    return tinyTooltip('Visible to everyone')
  })

  return {
    selectedGroupId,
    myGroups,
    myGroupsLoading,
    myGroupsError,
    effectiveGroupId,
    canChooseGroup,
    selectedGroupReadLabel,
    loadMyGroups,
    rememberFeed,
    rememberGroup,
    visibility,
    selectDestinationVisibility,
    selectGroup,
    allowedComposerVisibilities,
    effectiveVisibility,
    replyGroupDisplayLabel,
    replyShowsGroupScope,
    useGroupScopeChrome,
    showChatDestination,
    showVisibilityPicker,
    showGroupScopeIcon,
    scopeTagLabel,
    scopeTagTooltip,
  }
}

<template>
  <button
    type="button"
    class="relative z-[2] moh-tap moh-focus inline-flex shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--moh-surface-hover)]"
    :class="vertical ? 'min-h-11 w-10 flex-col gap-0.5 py-1' : 'min-h-9 gap-1 px-1.5'"
    :aria-label="boosted ? 'Remove boost' : 'Boost'"
    :aria-pressed="boosted"
    :disabled="disabled"
    @click.stop.prevent="onClick"
  >
    <AppIconGlyph name="boost" :selected="boosted" :size="vertical ? 20 : 18" :style="{ color: boosted ? activeColor : 'var(--moh-text-muted)' }" />
    <span class="text-xs tabular-nums font-medium" :style="{ color: boosted ? activeColor : 'var(--moh-text-muted)' }">{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
import { userActionColor } from '~/utils/user-tier'

const props = withDefaults(defineProps<{
  postId: string
  points: number
  viewerHasBoosted: boolean
  vertical?: boolean
  disabled?: boolean
}>(), { vertical: false, disabled: false })

const boostState = useBoostState()
const { user } = useAuth()
const { requireMember } = useBoardAccess()

const postLike = computed(() => ({ id: props.postId, boostCount: props.points, viewerHasBoosted: props.viewerHasBoosted }))
const entry = computed(() => boostState.get(postLike.value))
const boosted = computed(() => entry.value.viewerHasBoosted)
const count = computed(() => entry.value.boostCount)
const activeColor = computed(() => userActionColor(user.value))

async function onClick() {
  if (!requireMember('boost')) return
  await boostState.toggleBoost(postLike.value)
}
</script>

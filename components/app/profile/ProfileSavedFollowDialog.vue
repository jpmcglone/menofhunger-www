<template>
  <!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=830-706 -->
  <AppModal
    :model-value="visible"
    title="People to follow"
    subtitle="Profile saved. These men aren’t in your circle yet."
    max-width-class="max-w-[30rem]"
    body-class="p-0"
    @update:model-value="onVisibility"
  >
    <div class="moh-divide">
      <div v-for="person in users" :key="person.id" class="moh-gutter-x">
        <AppWhoToFollowCompactRow :user="person" />
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
/**
 * Shown after you save your own profile, and only when someone is left to follow.
 * Closing it does not undo the save.
 */
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const suggestionLimit = 5
const revealed = ref(false)
let requestId = 0

const { users, refresh } = useWhoToFollow({
  enabled: ref(false),
  defaultLimit: suggestionLimit,
})

const visible = computed(() => props.modelValue && revealed.value)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      revealed.value = false
      return
    }
    const id = ++requestId
    await refresh({ force: true, limit: suggestionLimit })
    if (id !== requestId || !props.modelValue) return
    if (users.value.length === 0) {
      emit('update:modelValue', false)
      return
    }
    revealed.value = true
  },
)

function onVisibility(open: boolean) {
  if (!open) emit('update:modelValue', false)
}
</script>

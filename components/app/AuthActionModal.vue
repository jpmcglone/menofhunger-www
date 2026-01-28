<template>
  <Dialog
    v-model:visible="open"
    modal
    :header="title"
    :draggable="false"
    class="w-[min(30rem,calc(100vw-2rem))]"
  >
    <div class="text-sm moh-text-muted">
      {{ message }}
    </div>

    <template #footer>
      <Button label="Not now" severity="secondary" text @click="hide" />
      <Button :label="primaryLabel" @click="onPrimary" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const { open, kind, action, hide } = useAuthActionModal()

const title = computed(() => {
  if (kind.value === 'login') return 'Log in to continue'
  if (kind.value === 'verify') return 'Verify to comment'
  if (kind.value === 'setUsername') return 'Set a username to boost'
  return 'Continue'
})

const message = computed(() => {
  if (kind.value === 'login') {
    if (action.value === 'comment') return 'You need to log in to comment.'
    return 'You need to log in to boost posts.'
  }
  if (kind.value === 'verify') {
    return 'Commenting is for verified members. Verify your account to comment.'
  }
  // setUsername
  return 'Boosting is available once you’ve set your username.'
})

const primaryLabel = computed(() => {
  if (kind.value === 'login') return 'Log in'
  if (kind.value === 'verify') return 'Go to settings'
  if (kind.value === 'setUsername') return 'Go to settings'
  return 'Continue'
})

async function onPrimary() {
  hide()
  if (kind.value === 'login') {
    await navigateTo('/login')
    return
  }
  // verify / setUsername both live in settings for now.
  await navigateTo('/settings')
}
</script>


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
      <Button
        :label="primaryLabel"
        :icon="primaryIcon"
        severity="secondary"
        rounded
        @click="onPrimary"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const { open, kind, action, hide } = useAuthActionModal()

const title = computed(() => {
  if (kind.value === 'login') return 'Log in to continue'
  if (kind.value === 'verify') return 'Verify to reply'
  if (kind.value === 'setUsername') return 'Set a username to boost'
  return 'Continue'
})

const message = computed(() => {
  if (kind.value === 'login') {
    if (action.value === 'comment') return 'You need to log in to reply.'
    if (action.value === 'bookmark') return 'You need to log in to save posts.'
    return 'You need to log in to boost posts.'
  }
  if (kind.value === 'verify') {
    return 'Replying is for verified members. Verify your account to reply.'
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

const primaryIcon = computed(() => {
  if (kind.value === 'login') return 'pi pi-sign-in'
  if (kind.value === 'verify') return 'pi pi-cog'
  if (kind.value === 'setUsername') return 'pi pi-cog'
  return undefined
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


<template>
  <div class="md:hidden">
    <Button
      as="NuxtLink"
      to="/admin"
      text
      severity="secondary"
      aria-label="Back"
    >
      <template #icon>
        <Icon name="tabler:chevron-left" aria-hidden="true" />
      </template>
    </Button>
  </div>
</template>

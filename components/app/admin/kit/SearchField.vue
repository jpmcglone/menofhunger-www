<template>
  <InputText
    v-model="model"
    class="w-full"
    :placeholder="placeholder"
    @keydown.enter.prevent="emit('submit')"
  />
</template>

<script setup lang="ts">
defineProps<{ placeholder: string }>()

const model = defineModel<string>({ required: true })

const emit = defineEmits<{ submit: [] }>()
</script>

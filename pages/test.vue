<template>
  <section class="w-full space-y-6">
    <header class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <Tag value="PrimeVue" severity="info" />
        <Tag value="Playground" severity="secondary" />
      </div>
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        Component Test
      </h1>
      <p class="text-sm sm:text-base text-gray-600 dark:text-gray-300">
        Lightweight checks for component rendering + theming inside the narrow app rail.
      </p>
    </header>

    <div class="space-y-6">
      <div class="space-y-3">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">Buttons, Tags, Badges</h2>
        <div class="flex flex-wrap items-center gap-3">
          <Button label="Primary" />
          <Button label="Secondary" severity="secondary" />
          <Button label="Success" severity="success" />
          <Button label="Danger" severity="danger" />
          <Button label="Loading" :loading="loading" @click="loading = !loading" />

          <span class="ml-2 inline-flex items-center gap-2">
            <Tag value="Men of Hunger" severity="info" />
            <Badge value="NEW" />
          </span>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">Inputs</h2>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
            <InputText v-model="name" placeholder="Type your name…" class="w-full" />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
            <Password v-model="password" :feedback="true" toggleMask class="w-full" />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
            <Textarea v-model="notes" rows="4" placeholder="Write something…" class="w-full" />
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">Pickers & Toggles</h2>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <Checkbox v-model="agree" binary inputId="agree" />
            <label for="agree" class="text-sm text-gray-700 dark:text-gray-200">
              I agree to do the work.
            </label>
          </div>

          <div class="flex items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-200">Notifications</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">Example toggle</div>
            </div>
            <ToggleSwitch v-model="notifications" />
          </div>

          <Divider />

          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Role</label>
            <Select
              v-model="role"
              :options="roles"
              optionLabel="label"
              optionValue="value"
              placeholder="Select a role…"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">Slider + Progress</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-600 dark:text-gray-300">Intensity</div>
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">{{ intensity }}</div>
          </div>

          <Slider v-model="intensity" :min="0" :max="100" class="w-full" />
          <ProgressBar :value="intensity" />
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">Debug</h2>
        <Tabs v-model:value="debugTab" :scrollable="false">
          <TabList>
            <Tab value="state">State</Tab>
            <Tab value="notes">Notes</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="state">
              <pre class="text-xs whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800"><code>{{ stateDump }}</code></pre>
            </TabPanel>
            <TabPanel value="notes">
              <div class="space-y-2 text-gray-700 dark:text-gray-300">
                <p>
                  This page exists just to validate PrimeVue components render correctly inside the narrow app rail.
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">It's safe to delete later.</p>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Test'
})

usePageSeo({
  title: 'Test',
  description: 'Internal PrimeVue component playground for Men of Hunger.',
  noindex: true
})

const debugTab = ref<'state' | 'notes'>('state')

const loading = ref(false)

const name = ref('')
const password = ref('')
const notes = ref('')

const agree = ref(false)
const notifications = ref(true)

const roles = [
  { label: 'Builder', value: 'builder' },
  { label: 'Leader', value: 'leader' },
  { label: 'Operator', value: 'operator' }
]
const role = ref<(typeof roles)[number]['value'] | null>(null)

const intensity = ref(42)

const stateDump = computed(() =>
  JSON.stringify(
    {
      name: name.value,
      passwordLength: password.value.length,
      notes: notes.value,
      agree: agree.value,
      notifications: notifications.value,
      role: role.value,
      intensity: intensity.value
    },
    null,
    2
  )
)
</script>

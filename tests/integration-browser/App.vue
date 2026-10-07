<template>
  <main class="max-w-3xl mx-auto p-6 space-y-6">
    <h1 class="moh-h1">Integration fixtures</h1>
    <p>Synthetic data. No provider requests.</p>
    <Button label="Toggle theme" @click="toggle" />
    <nav class="flex flex-wrap gap-6">
      <MetadataPreview v-for="identity in ['fixture','no-dm','unavailable','expired']" :key="identity" url="https://x.com/fixture_man" title="@fixture_man" :x-profile-user-id="identity"><a :id="identity" href="https://x.com/fixture_man">X {{ identity }}</a></MetadataPreview>
      <MetadataPreview url="/location/US/VA" title="Virginia" state-code="VA"><a id="state" href="/location/US/VA">Virginia</a></MetadataPreview>
      <MetadataPreview v-for="site in ['pickax.com','rumble.com']" :key="site" :url="`https://${site}/fixture`" :title="site"><a :id="site" :href="`https://${site}/fixture`">{{ site }}</a></MetadataPreview>
    </nav>
    <XPublishing post-id="fixture" />
    <XPublishing post-id="partial" />
    <IntegrationAdmin />
  </main>
</template>
<script setup lang="ts">
import MetadataPreview from '../../components/app/profile/MetadataPreview.vue'
import XPublishing from '../../components/app/kit/XPublishing.vue'
import IntegrationAdmin from '../../pages/admin/integrations.vue'
function toggle() { document.documentElement.classList.toggle('dark') }
</script>

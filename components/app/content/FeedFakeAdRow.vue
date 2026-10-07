<template>
  <div class="px-4 py-4 border-b moh-border">
    <ClientOnly>
      <AppAdSlot placement="feed" />
      <template #fallback>
        <div
          aria-hidden="true"
          class="relative w-full rounded-xl border border-dotted moh-border bg-transparent overflow-hidden h-[120px] sm:h-[250px]"
        />
      </template>
    </ClientOnly>
  </div>
</template>


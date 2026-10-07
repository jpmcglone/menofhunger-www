<template>
                <div
                  class="py-3"
                >
                    <div class="flex items-start gap-2.5">
                      <AppAvatarCircle
                        :src="post.author.avatarUrl ?? null" :avatar-video="post.author.avatarVideo"
                        :name="post.author.name ?? null"
                        :username="post.author.username ?? null"
                        size-class="h-7 w-7"
                        :round-class="avatarRoundClass(Boolean(post.author.isOrganization))"
                        bg-class="bg-gray-200 dark:bg-zinc-700"
                        class="mt-0.5 shrink-0"
                      />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-[13px] font-semibold leading-tight text-gray-900 dark:text-white">
                          {{ post.author.name || post.author.username || 'User' }}
                          <span class="ml-1 font-normal text-gray-400 dark:text-gray-500">@{{ post.author.username }}</span>
                        </p>
                        <p
                          v-if="post.body"
                          class="mt-0.5 line-clamp-3 text-[13px] leading-snug text-gray-700 dark:text-gray-300"
                        >{{ post.body }}</p>
                        <!-- First image thumbnail if present -->
                        <div
                          v-if="post.media?.length"
                          class="mt-1.5 flex gap-1"
                        >
                          <div
                            v-for="m in post.media.slice(0, 3)"
                            :key="m.id"
                            class="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-200 dark:bg-zinc-700"
                          >
                            <AppImg
                              v-if="m.url"
                              :src="m.url"
                              alt=""
                              class="h-full w-full object-cover"
                              width="48"
                              height="48"
                              sizes="48px"
                            />
                          </div>
                          <div
                            v-if="post.media.length > 3"
                            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gray-200 text-[11px] font-semibold text-gray-500 dark:bg-zinc-700 dark:text-gray-400"
                          >+{{ post.media.length - 3 }}</div>
                        </div>
                      </div>
                    </div>
                  </div>

</template>
<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { avatarRoundClass } from '~/utils/avatar-rounding'
defineProps<{ post: FeedPost }>()
</script>

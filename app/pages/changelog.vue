<template>
  <div class="min-h-dvh bg-stone-50 text-stone-800">
    <header class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
        <NuxtLink to="/editor" class="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-indigo-600">
          <span class="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
            <UIcon name="i-lucide-code-2" class="size-4 text-white" />
          </span>
          <span class="font-bold tracking-tight text-stone-900">CodeCraft</span>
        </NuxtLink>
        <span class="hidden text-stone-300 sm:inline">/</span>
        <span class="hidden text-sm font-semibold text-stone-600 sm:inline">มีอะไรใหม่</span>
        <NuxtLink
          to="/editor"
          class="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4" />
          <span class="hidden sm:inline">กลับไปสร้างแอป</span>
          <span class="sm:hidden">สร้างแอป</span>
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <div class="border-b border-stone-200 py-10 sm:py-14">
        <h1 class="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">มีอะไรใหม่ใน CodeCraft</h1>
        <p class="mt-3 text-base leading-relaxed text-stone-600 sm:text-lg">
          ฟีเจอร์ใหม่ สิ่งที่ปรับปรุง และบั๊กที่แก้ในแต่ละเวอร์ชัน เวอร์ชันล่าสุดอยู่บนสุด
        </p>
      </div>

      <article
        v-for="(release, ri) in releases"
        :id="`v${release.version}`"
        :key="release.version"
        class="scroll-mt-20 border-b border-stone-200 py-10 last:border-0"
        :data-testid="`release-${release.version}`"
      >
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 class="text-2xl font-bold tracking-tight text-stone-900">
            <span class="font-mono">v{{ release.version }}</span>
          </h2>
          <time :datetime="release.date" class="text-sm text-stone-500">{{ formatDate(release.date) }}</time>
          <span
            v-if="ri === 0"
            class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700"
          >ล่าสุด</span>
        </div>
        <p v-if="release.summary" class="mt-2 text-base leading-relaxed text-stone-600">{{ release.summary }}</p>

        <section v-for="section in release.sections" :key="section.title" class="mt-6">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide" :class="sectionStyle(section.title).text">
            <UIcon :name="sectionStyle(section.title).icon" class="size-4" />
            {{ section.title }}
          </h3>
          <ul class="flex flex-col gap-2">
            <li v-for="(item, ii) in section.items" :key="ii" class="flex gap-3">
              <span class="mt-2.5 size-1.5 shrink-0 rounded-full" :class="sectionStyle(section.title).dot" />
              <span class="leading-relaxed">
                <template v-for="(part, pi) in splitInline(item)" :key="pi">
                  <code v-if="part.kind === 'code'" class="rounded bg-stone-200/70 px-1.5 py-0.5 font-mono text-[0.9em] text-stone-900">{{ part.text }}</code>
                  <strong v-else-if="part.kind === 'bold'" class="font-semibold text-stone-900">{{ part.text }}</strong>
                  <template v-else>{{ part.text }}</template>
                </template>
              </span>
            </li>
          </ul>
        </section>
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";

import { useChangelog } from "~/composables/useChangelog";
import { splitInline } from "~/utils/changelog";

useHead({ title: "มีอะไรใหม่ — CodeCraft" });

const { releases, markSeen } = useChangelog();

onMounted(markSeen);

const SECTION_STYLES: Record<string, { icon: string; text: string; dot: string }> = {
  ใหม่: { icon: "i-lucide-sparkles", text: "text-indigo-700", dot: "bg-indigo-500" },
  ปรับปรุง: { icon: "i-lucide-wrench", text: "text-emerald-700", dot: "bg-emerald-500" },
  แก้ไข: { icon: "i-lucide-bug", text: "text-amber-700", dot: "bg-amber-500" },
};

function sectionStyle(title: string) {
  return SECTION_STYLES[title] ?? { icon: "i-lucide-dot", text: "text-stone-600", dot: "bg-stone-400" };
}

const dateFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" });
function formatDate(iso: string) {
  return dateFormat.format(new Date(`${iso}T00:00:00`));
}
</script>

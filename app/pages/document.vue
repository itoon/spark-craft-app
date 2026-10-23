<template>
  <div class="manual min-h-dvh bg-stone-50 text-stone-800">
    <!-- Top bar -->
    <header class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <NuxtLink to="/editor" class="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-indigo-600">
          <span class="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
            <UIcon name="i-lucide-code-2" class="size-4 text-white" />
          </span>
          <span class="font-bold tracking-tight text-stone-900">CodeCraft</span>
        </NuxtLink>
        <span class="hidden text-stone-300 sm:inline">/</span>
        <span class="hidden text-sm font-semibold text-stone-600 sm:inline">คู่มือการใช้งาน</span>
        <NuxtLink
          to="/editor"
          class="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4" />
          <span class="hidden sm:inline">กลับไปสร้างแอป</span>
          <span class="sm:hidden">สร้างแอป</span>
        </NuxtLink>
      </div>

      <!-- Mobile table of contents -->
      <nav class="manual-chips flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="สารบัญ">
        <a
          v-for="section in manualSections"
          :key="section.id"
          :href="`#${section.id}`"
          :data-chip="section.id"
          class="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
          :class="activeId === section.id
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-stone-300 bg-white text-stone-600'"
        >
          {{ section.title }}
        </a>
      </nav>
    </header>

    <div class="mx-auto flex max-w-6xl gap-10 px-4 sm:px-6">
      <!-- Desktop table of contents -->
      <aside class="hidden w-56 shrink-0 lg:block">
        <nav class="sticky top-20 py-8" aria-label="สารบัญ">
          <p class="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-stone-400">สารบัญ</p>
          <ol class="flex flex-col gap-0.5">
            <li v-for="(section, i) in manualSections" :key="section.id">
              <a
                :href="`#${section.id}`"
                class="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
                :class="activeId === section.id
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'"
                :aria-current="activeId === section.id ? 'true' : undefined"
              >
                <span class="w-4 text-right font-mono text-xs tabular-nums text-stone-400">{{ i + 1 }}</span>
                {{ section.title }}
              </a>
            </li>
          </ol>
        </nav>
      </aside>

      <main class="min-w-0 flex-1 pb-24">
        <!-- Hero -->
        <div class="border-b border-stone-200 py-10 sm:py-14">
          <h1 class="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">คู่มือการใช้งาน CodeCraft</h1>
          <p class="mt-3 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            ทุกอย่างที่ต้องรู้เพื่อสร้างแอปมือถือของตัวเอง ตั้งแต่วางปุ่มแรก จนติดตั้งแอปลงมือถือจริง
            อ่านทีละหัวข้อ หรือกดข้ามไปหัวข้อที่อยากรู้ได้เลย
          </p>
          <div class="mt-6 flex flex-wrap gap-2">
            <a href="#start" class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">เริ่มอ่านจากข้อแรก</a>
            <a href="#help" class="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100">มีปัญหา? ไปหน้าแก้ปัญหา</a>
          </div>
        </div>

        <section
          v-for="(section, i) in manualSections"
          :id="section.id"
          :key="section.id"
          class="manual-section scroll-mt-28 border-b border-stone-200 py-10 last:border-0 lg:scroll-mt-20"
        >
          <div class="flex items-center gap-3">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <UIcon :name="section.icon" class="size-5" />
            </span>
            <div>
              <p class="font-mono text-xs font-semibold text-stone-400">บทที่ {{ i + 1 }}</p>
              <h2 class="text-2xl font-bold tracking-tight text-stone-900">{{ section.title }}</h2>
            </div>
          </div>
          <p v-if="section.intro" class="mt-4 max-w-2xl text-base leading-relaxed text-stone-600" v-html="inline(section.intro)" />

          <div v-for="(group, gi) in section.groups" :key="gi" class="mt-8">
            <h3 v-if="group.title" class="mb-3 text-lg font-bold text-stone-900">{{ group.title }}</h3>

            <div class="flex max-w-3xl flex-col gap-4">
              <template v-for="(block, bi) in group.blocks" :key="bi">
                <p v-if="block.type === 'p'" class="leading-relaxed" v-html="inline(block.text)" />

                <ol v-else-if="block.type === 'steps'" class="flex flex-col gap-2.5">
                  <li v-for="(item, si) in block.items" :key="si" class="flex gap-3">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white tabular-nums">{{ si + 1 }}</span>
                    <span class="pt-0.5 leading-relaxed" v-html="inline(item)" />
                  </li>
                </ol>

                <ul v-else-if="block.type === 'list'" class="flex flex-col gap-2">
                  <li v-for="(item, si) in block.items" :key="si" class="flex gap-3">
                    <span class="mt-2.5 size-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <span class="leading-relaxed" v-html="inline(item)" />
                  </li>
                </ul>

                <figure v-else-if="block.type === 'code'" class="overflow-hidden rounded-xl bg-stone-900">
                  <figcaption class="flex items-center justify-between border-b border-stone-700 px-4 py-2">
                    <span class="text-xs font-semibold text-stone-400">{{ block.title || "โค้ด" }}</span>
                    <button
                      type="button"
                      class="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-stone-400 transition-colors hover:bg-stone-800 hover:text-white"
                      @click="copy(block.code, `${section.id}-${gi}-${bi}`)"
                    >
                      <UIcon :name="copiedKey === `${section.id}-${gi}-${bi}` ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      {{ copiedKey === `${section.id}-${gi}-${bi}` ? "คัดลอกแล้ว" : "คัดลอก" }}
                    </button>
                  </figcaption>
                  <pre class="overflow-x-auto px-4 py-3 font-mono text-sm leading-relaxed text-stone-100"><code>{{ block.code }}</code></pre>
                </figure>

                <div v-else-if="block.type === 'tip'" class="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <UIcon name="i-lucide-lightbulb" class="mt-0.5 size-5 shrink-0 text-emerald-700" />
                  <p class="leading-relaxed text-emerald-950" v-html="inline(block.text)" />
                </div>

                <div v-else-if="block.type === 'warn'" class="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-5 shrink-0 text-amber-700" />
                  <p class="leading-relaxed text-amber-950" v-html="inline(block.text)" />
                </div>

                <div v-else-if="block.type === 'table'" class="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                  <table class="w-full text-left text-sm">
                    <thead class="bg-stone-100 text-xs font-bold text-stone-500">
                      <tr>
                        <th class="px-4 py-2.5">{{ block.head[0] }}</th>
                        <th class="px-4 py-2.5">{{ block.head[1] }}</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-stone-100">
                      <tr v-for="(row, ri) in block.rows" :key="ri" class="align-top">
                        <td class="px-4 py-2.5 sm:whitespace-nowrap" v-html="inline(row[0])" />
                        <td class="px-4 py-2.5 leading-relaxed text-stone-600" v-html="inline(row[1])" />
                      </tr>
                    </tbody>
                  </table>
                </div>

                <figure v-else-if="block.type === 'shot'" class="flex flex-col gap-3">
                  <figcaption v-if="block.title" class="text-sm font-semibold text-stone-500">{{ block.title }}</figcaption>
                  <a
                    :href="block.src"
                    target="_blank"
                    rel="noopener"
                    class="group relative block overflow-hidden border border-stone-200 bg-stone-900 shadow-sm"
                    :class="block.phone ? 'mx-auto w-64 rounded-[2rem] border-[6px] border-stone-800' : 'rounded-xl'"
                    :aria-label="`ดูภาพใหญ่: ${block.alt}`"
                  >
                    <img :src="block.src" :alt="block.alt" loading="lazy" decoding="async" class="block h-auto w-full" >
                    <span
                      v-if="!block.phone"
                      class="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <UIcon name="i-lucide-maximize-2" class="size-3" />
                      ดูภาพใหญ่
                    </span>
                  </a>
                  <ol v-if="block.notes?.length" class="flex flex-col gap-2">
                    <li v-for="(note, ni) in block.notes" :key="ni" class="flex gap-3">
                      <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white ring-2 ring-white tabular-nums">{{ ni + 1 }}</span>
                      <span class="pt-0.5 leading-relaxed" v-html="inline(note)" />
                    </li>
                  </ol>
                </figure>

                <ol v-else-if="block.type === 'lessons'" class="grid gap-3 sm:grid-cols-2">
                  <li
                    v-for="lesson in lessons"
                    :key="lesson.id"
                    class="flex gap-3 rounded-xl border border-stone-200 bg-white p-4"
                  >
                    <span class="flex size-10 shrink-0 items-center justify-center rounded-lg text-white" :class="lesson.accent.bg">
                      <UIcon :name="lesson.icon" class="size-5" />
                    </span>
                    <div class="min-w-0">
                      <p class="font-bold text-stone-900">{{ lesson.order }}. {{ lesson.title }}</p>
                      <p class="mt-0.5 text-sm leading-snug text-stone-600">{{ lesson.tagline }}</p>
                      <p class="mt-1.5 flex items-center gap-2 text-xs text-stone-500">
                        <span aria-label="ระดับความยาก">{{ "★".repeat(lesson.level) }}<span class="text-stone-300">{{ "★".repeat(5 - lesson.level) }}</span></span>
                        <span>· ~{{ lesson.minutes }} นาที</span>
                      </p>
                    </div>
                  </li>
                </ol>
              </template>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import { lessons } from "~/data/lessons";
import { manualSections } from "~/data/manual";

useHead({ title: "คู่มือการใช้งาน — CodeCraft", htmlAttrs: { class: "motion-safe:scroll-smooth" } });

const activeId = ref(manualSections[0]?.id ?? "");
const copiedKey = ref("");
let observer: IntersectionObserver | null = null;
let copyTimer: ReturnType<typeof setTimeout> | null = null;

// Keep the active chip visible in the mobile table of contents.
watch(activeId, (id) => {
  const chip = document.querySelector<HTMLElement>(`[data-chip="${id}"]`);
  const bar = chip?.parentElement;
  if (!chip || !bar || bar.offsetParent === null) return;
  bar.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
});

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Static manual text → HTML with **bold** and `code` only (input is escaped first). */
function inline(text: string) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="manual-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-stone-900">$1</strong>');
}

async function copy(code: string, key: string) {
  try {
    await navigator.clipboard.writeText(code);
    copiedKey.value = key;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copiedKey.value = ""), 1500);
  } catch {
    // Clipboard blocked: nothing to do, the code is still selectable.
  }
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) activeId.value = visible[0].target.id;
    },
    { rootMargin: "-20% 0px -70% 0px" },
  );
  document.querySelectorAll(".manual-section").forEach((el) => observer?.observe(el));
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (copyTimer) clearTimeout(copyTimer);
});
</script>

<style scoped>
.manual :deep(.manual-code) {
  border-radius: 0.375rem;
  background: rgb(231 229 228 / 0.7);
  padding: 0.05rem 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875em;
  color: #3730a3;
  overflow-wrap: anywhere;
}
.manual-chips {
  scrollbar-width: none;
}
.manual-chips::-webkit-scrollbar {
  display: none;
}
</style>

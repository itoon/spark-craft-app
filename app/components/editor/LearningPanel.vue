<template>
  <aside
    class="editor-learn relative flex h-full w-(--cc-learn-w) shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white text-neutral-800"
    aria-label="บทเรียน"
  >
    <!-- ═════════════ Lesson picker ═════════════ -->
    <template v-if="!lesson">
      <header class="shrink-0 border-b border-neutral-200 px-4 pb-3 pt-4">
        <h2 class="text-base font-bold text-neutral-900">เลือกแอปที่อยากสร้าง</h2>
        <p class="mt-0.5 text-[13px] text-neutral-500">
          5 แอป เรียงจากง่ายไปยาก · ทำเสร็จแล้ว {{ learning.completedCount.value }}/{{ learning.lessons.length }}
        </p>
      </header>

      <ol class="flex-1 space-y-2 overflow-y-auto p-3" data-testid="lesson-list">
        <li v-for="item in learning.lessons" :key="item.id">
          <button
            type="button"
            class="group flex w-full items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-2 focus-visible:outline-indigo-500"
            :data-testid="`lesson-${item.id}`"
            @click="learning.openLesson(item.id)"
          >
            <span
              class="relative flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
              :class="item.accent.bg"
            >
              <UIcon :name="item.icon" class="size-5" />
              <span
                class="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-neutral-900 text-[10px] font-bold"
              >
                {{ item.order }}
              </span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-neutral-900">{{ item.title }}</span>
                <UIcon
                  v-if="learning.getProgress(item.id).completed"
                  name="i-lucide-badge-check"
                  class="size-4 shrink-0 text-emerald-600"
                  aria-label="เสร็จแล้ว"
                />
              </span>
              <span class="mt-0.5 block text-[12px] leading-snug text-neutral-500">{{ item.tagline }}</span>
              <span class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                <span class="flex shrink-0 items-center gap-1" :aria-label="`ความยาก ${item.level} จาก 5`">
                  <span
                    v-for="n in 5"
                    :key="n"
                    class="h-1.5 w-3 rounded-full"
                    :class="n <= item.level ? item.accent.bg : 'bg-neutral-200'"
                  />
                </span>
                <span class="whitespace-nowrap">~{{ item.minutes }} นาที</span>
                <span v-if="statusLabel(item.id)" class="ml-auto whitespace-nowrap font-medium" :class="item.accent.text">
                  {{ statusLabel(item.id) }}
                </span>
              </span>
            </span>
          </button>
        </li>
      </ol>

      <footer class="shrink-0 border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-[12px] leading-snug text-neutral-500">
        อยากสร้างแอปของตัวเองแบบไม่มีบทเรียน? สลับไปโหมด <b class="text-neutral-700">สร้างเอง</b> ที่แถบด้านบน
      </footer>
    </template>

    <!-- ═════════════ Finished screen ═════════════ -->
    <template v-else-if="showFinished">
      <div class="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
        <div class="flex size-16 items-center justify-center rounded-2xl text-white" :class="lesson.accent.bg">
          <UIcon name="i-lucide-trophy" class="size-8" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-neutral-900">สร้าง “{{ lesson.title }}” สำเร็จ!</h2>
          <p class="mt-1 text-[13px] leading-relaxed text-neutral-500">
            ได้เรียน {{ lesson.concepts.join(" · ") }}
          </p>
        </div>
        <div class="flex w-full flex-col gap-2">
          <UButton
            v-if="nextLesson"
            :label="`บทต่อไป: ${nextLesson.title}`"
            trailing-icon="i-lucide-arrow-right"
            color="primary"
            size="md"
            class="justify-center"
            @click="learning.openLesson(nextLesson.id)"
          />
          <UButton
            label="กลับไปหน้ารายการบทเรียน"
            color="neutral"
            variant="outline"
            size="md"
            class="justify-center"
            @click="backToList"
          />
          <UButton
            label="ดูขั้นตอนอีกครั้ง"
            color="neutral"
            variant="ghost"
            size="sm"
            class="justify-center"
            @click="showFinished = false"
          />
        </div>
      </div>
    </template>

    <!-- ═════════════ Lesson ═════════════ -->
    <template v-else>
      <header class="shrink-0 text-white" :class="lesson.accent.bg">
        <div class="flex items-center gap-1 px-2 pt-2">
          <button
            type="button"
            class="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/15"
            aria-label="กลับไปหน้ารายการบทเรียน"
            @click="backToList"
          >
            <UIcon name="i-lucide-chevron-left" class="size-5" />
          </button>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold">{{ lesson.order }}. {{ lesson.title }}</p>
          </div>
          <UDropdownMenu :items="lessonMenu" :content="{ align: 'end' }">
            <button
              type="button"
              class="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/15"
              aria-label="ตัวเลือกบทเรียน"
            >
              <UIcon name="i-lucide-ellipsis-vertical" class="size-4" />
            </button>
          </UDropdownMenu>
        </div>

        <!-- Step progress: one segment per step -->
        <div class="px-4 pb-3 pt-2">
          <div class="flex gap-1" aria-label="ขั้นตอน">
            <button
              v-for="(step, index) in lesson.steps"
              :key="step.id"
              type="button"
              class="flex h-4 flex-1 items-center disabled:cursor-not-allowed"
              :aria-label="`ขั้นที่ ${index + 1}: ${step.title}`"
              :aria-current="index === stepIndex ? 'step' : undefined"
              :disabled="index > furthestReachable"
              @click="goTo(index)"
            >
              <span class="h-1.5 w-full rounded-full transition-colors" :class="segmentClass(index)" />
            </button>
          </div>
          <p class="mt-1 text-[11px] font-medium text-white/90">
            ขั้นที่ {{ stepIndex + 1 }} จาก {{ lesson.steps.length }}
          </p>
        </div>
      </header>

      <div ref="scrollRef" class="flex-1 overflow-y-auto">
        <Transition name="step-fade" mode="out-in">
          <article :key="step.id" class="space-y-3 px-4 pb-6 pt-4">
            <h2 class="text-[17px] font-bold leading-snug text-neutral-900">{{ step.title }}</h2>

            <template v-for="block in step.blocks" :key="block.id">
              <p v-if="block.type === 'text'" class="text-[13px] leading-relaxed text-neutral-700">
                {{ block.content }}
              </p>

              <ol
                v-else-if="block.type === 'steps'"
                class="space-y-2 rounded-xl bg-neutral-50 p-3 text-[13px] leading-relaxed text-neutral-700"
              >
                <li v-for="(item, i) in block.items" :key="item" class="flex gap-2.5">
                  <span
                    class="mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    :class="[lesson.accent.soft, lesson.accent.text]"
                  >{{ i + 1 }}</span>
                  <span>{{ item }}</span>
                </li>
              </ol>

              <ul
                v-else-if="block.type === 'bullet-list'"
                class="space-y-1.5 pl-5 text-[13px] leading-relaxed text-neutral-700"
              >
                <li v-for="item in block.items" :key="item" class="list-disc marker:text-neutral-400">{{ item }}</li>
              </ul>

              <div
                v-else-if="block.type === 'tip' || block.type === 'note' || block.type === 'warning'"
                class="flex gap-2 rounded-lg border p-2.5"
                :class="messageClassMap[block.type]"
              >
                <UIcon :name="messageIconMap[block.type]" class="mt-0.5 size-4 shrink-0" />
                <span class="text-[12.5px] leading-snug">{{ block.content }}</span>
              </div>

              <div v-else-if="block.type === 'tags'" class="flex flex-wrap gap-1">
                <span
                  v-for="item in block.items"
                  :key="item"
                  class="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500"
                >{{ item }}</span>
              </div>

              <figure v-else-if="block.type === 'code'" class="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                <figcaption class="flex items-center justify-between gap-2 border-b border-neutral-800 px-3 py-1.5">
                  <span class="truncate text-[12px] font-medium text-neutral-300">{{ block.title || "ตัวอย่างโค้ด" }}</span>
                  <button
                    type="button"
                    class="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                    @click="copyCode(block.id, block.code)"
                  >
                    <UIcon :name="copiedId === block.id ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                    {{ copiedId === block.id ? "คัดลอกแล้ว" : "คัดลอก" }}
                  </button>
                </figcaption>
                <pre class="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-neutral-100"><code>{{ block.code }}</code></pre>
              </figure>

              <img
                v-else-if="block.type === 'image'"
                :src="block.src"
                :alt="block.alt || step.title"
                class="w-full rounded-xl border border-neutral-200"
                loading="lazy"
              />

              <a
                v-else-if="block.type === 'youtube'"
                :href="`https://www.youtube.com/watch?v=${block.videoId}`"
                target="_blank"
                rel="noopener"
                class="flex items-center gap-2 rounded-xl border border-neutral-200 p-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <UIcon name="i-lucide-circle-play" class="size-5 text-red-600" />
                {{ block.title || "ดูวิดีโอ" }}
              </a>
            </template>

            <!-- Mission checklist -->
            <section
              v-if="results.length"
              class="rounded-xl border p-3"
              :class="allMet ? 'border-emerald-200 bg-emerald-50/60' : 'border-neutral-200 bg-white'"
              aria-live="polite"
              data-testid="mission-check"
            >
              <div class="mb-2 flex items-center justify-between">
                <h3 class="text-[13px] font-bold text-neutral-900">ภารกิจ</h3>
                <span class="text-[11px] font-medium" :class="allMet ? 'text-emerald-700' : 'text-neutral-500'">
                  {{ metCount }}/{{ results.length }} เสร็จ
                </span>
              </div>
              <ul class="space-y-1.5">
                <li v-for="result in results" :key="result.id">
                  <button
                    v-if="result.manual"
                    type="button"
                    role="checkbox"
                    :aria-checked="result.met"
                    class="flex w-full items-start gap-2 rounded-md p-1 text-left text-[13px] leading-snug transition-colors hover:bg-neutral-100"
                    :class="result.met ? 'text-emerald-800' : 'text-neutral-700'"
                    @click="learning.toggleManual(lesson.id, result.id)"
                  >
                    <UIcon
                      :name="result.met ? 'i-lucide-square-check' : 'i-lucide-square'"
                      class="mt-px size-4 shrink-0"
                      :class="result.met ? 'text-emerald-600' : 'text-neutral-400'"
                    />
                    <span>{{ result.message }} <span v-if="!result.met" class="text-neutral-400">(แตะเพื่อติ๊ก)</span></span>
                  </button>
                  <div
                    v-else
                    class="flex items-start gap-2 p-1 text-[13px] leading-snug"
                    :class="result.met ? 'text-emerald-800' : 'text-neutral-700'"
                  >
                    <UIcon
                      :name="result.met ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                      class="mt-px size-4 shrink-0"
                      :class="result.met ? 'text-emerald-600' : 'text-neutral-300'"
                    />
                    <span>
                      {{ result.message }}
                      <span v-if="!result.met && result.detail" class="mt-0.5 block text-[11.5px] text-amber-700">
                        {{ result.detail }}
                      </span>
                    </span>
                  </div>
                </li>
              </ul>
            </section>

            <div v-if="step.hint && !allMet">
              <button
                type="button"
                class="flex items-center gap-1.5 text-[12px] font-medium text-indigo-600 hover:text-indigo-800"
                :aria-expanded="showHint"
                @click="showHint = !showHint"
              >
                <UIcon name="i-lucide-lightbulb" class="size-3.5" />
                {{ showHint ? "ซ่อนคำใบ้" : "ติดอยู่? ขอคำใบ้" }}
              </button>
              <p v-if="showHint" class="mt-1.5 rounded-lg bg-indigo-50 p-2.5 text-[12.5px] leading-snug text-indigo-800">
                {{ step.hint }}
              </p>
            </div>
          </article>
        </Transition>
      </div>

      <footer class="flex shrink-0 gap-2 border-t border-neutral-200 bg-neutral-50 px-3 py-2.5">
        <UButton
          v-if="stepIndex > 0"
          label="ย้อนกลับ"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="outline"
          size="sm"
          class="justify-center"
          @click="goTo(stepIndex - 1)"
        />
        <UButton
          v-if="stepIndex < lesson.steps.length - 1"
          :label="allMet ? 'ไปขั้นต่อไป' : 'ทำภารกิจให้ครบก่อน'"
          :trailing-icon="allMet ? 'i-lucide-arrow-right' : undefined"
          :color="allMet ? 'primary' : 'neutral'"
          :variant="allMet ? 'solid' : 'soft'"
          size="sm"
          class="flex-1 justify-center"
          :disabled="!allMet"
          data-testid="lesson-next"
          @click="goTo(stepIndex + 1)"
        />
        <UButton
          v-else
          :label="allMet ? 'จบบทเรียน' : 'ทำภารกิจให้ครบก่อน'"
          :trailing-icon="allMet ? 'i-lucide-trophy' : undefined"
          :color="allMet ? 'success' : 'neutral'"
          :variant="allMet ? 'solid' : 'soft'"
          size="sm"
          class="flex-1 justify-center"
          :disabled="!allMet"
          @click="finish"
        />
      </footer>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import { useEditorStore } from "~/composables/useEditorStore";
import { useLearning } from "~/composables/useLearning";
import type { LessonStep } from "~/data/lessons";
import { evaluateLearningRequirements } from "~/utils/learningRequirements";

const store = useEditorStore();
const learning = useLearning();

const lesson = computed(() => learning.activeLesson.value);
const showFinished = ref(false);
const showHint = ref(false);
const copiedId = ref<string | null>(null);
const scrollRef = ref<HTMLElement | null>(null);

const stepIndex = computed(() => {
  if (!lesson.value) return 0;
  const saved = learning.getProgress(lesson.value.id).step;
  return Math.min(Math.max(0, saved), lesson.value.steps.length - 1);
});
const step = computed<LessonStep>(() => lesson.value!.steps[stepIndex.value]!);

const results = computed(() => {
  if (!lesson.value) return [];
  return evaluateLearningRequirements(step.value.checks, {
    elements: store.elements.value,
    currentPageId: store.currentPageId.value,
    jsCode: store.jsCode.value,
    jsCodeByPage: store.jsCodeByPage.value,
    pages: store.pages.value,
    manualChecks: learning.getProgress(lesson.value.id).manual,
  });
});

const metCount = computed(() => results.value.filter((result) => result.met).length);
const allMet = computed(() => metCount.value === results.value.length);

/** Learners may revisit any step they already reached. */
const furthestReachable = computed(() => stepIndex.value + (allMet.value ? 1 : 0));

const nextLesson = computed(() => {
  if (!lesson.value) return null;
  return learning.lessons.find((item) => item.order === lesson.value!.order + 1) ?? null;
});

const lessonMenu = computed(() => [
  [
    {
      label: "เริ่มบทเรียนนี้ใหม่ทั้งหมด",
      icon: "i-lucide-rotate-ccw",
      onSelect: () => {
        if (!lesson.value) return;
        const ok = window.confirm("ลบงานในบทเรียนนี้แล้วเริ่มใหม่ตั้งแต่ขั้นแรก?");
        if (ok) learning.restartLesson(lesson.value.id);
      },
    },
  ],
]);

function statusLabel(lessonId: string) {
  const item = learning.lessons.find((candidate) => candidate.id === lessonId)!;
  const progress = learning.getProgress(lessonId);
  if (progress.completed) return "";
  if (progress.step > 0) return `ทำต่อ ขั้น ${progress.step + 1}/${item.steps.length}`;
  return "";
}

function segmentClass(index: number) {
  if (index === stepIndex.value) return "bg-white";
  if (index < stepIndex.value) return "bg-white/70 hover:bg-white";
  return "bg-white/25";
}

function goTo(index: number) {
  if (!lesson.value) return;
  if (index < 0 || index >= lesson.value.steps.length) return;
  if (index > stepIndex.value && !allMet.value) return;
  learning.setStep(lesson.value.id, index);
}

function finish() {
  if (!lesson.value || !allMet.value) return;
  learning.completeLesson(lesson.value.id);
  showFinished.value = true;
}

function backToList() {
  showFinished.value = false;
  learning.closeLesson();
}

async function copyCode(id: string, code: string) {
  try {
    await navigator.clipboard.writeText(code);
    copiedId.value = id;
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null;
    }, 1600);
  } catch {
    copiedId.value = null;
  }
}

const messageClassMap = {
  tip: "border-indigo-100 bg-indigo-50 text-indigo-800",
  note: "border-sky-100 bg-sky-50 text-sky-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
} satisfies Record<"tip" | "note" | "warning", string>;

const messageIconMap = {
  tip: "i-lucide-lightbulb",
  note: "i-lucide-info",
  warning: "i-lucide-triangle-alert",
} satisfies Record<"tip" | "note" | "warning", string>;

watch(
  () => [lesson.value?.id, stepIndex.value],
  () => {
    showHint.value = false;
    nextTick(() => scrollRef.value?.scrollTo({ top: 0 }));
  },
);

watch(
  () => lesson.value?.id,
  () => {
    showFinished.value = false;
  },
);
</script>

<style scoped>
.step-fade-enter-active,
.step-fade-leave-active {
  transition:
    opacity 0.16s ease-out,
    transform 0.16s ease-out;
}
.step-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
@media (prefers-reduced-motion: reduce) {
  .step-fade-enter-active,
  .step-fade-leave-active {
    transition: none;
  }
}
</style>

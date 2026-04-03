<template>
  <aside
    ref="panelRef"
    class="editor-learn relative flex h-full w-90 shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white"
  >
    <div class="flex items-center gap-2 border-b border-neutral-200 bg-indigo-600 px-3 py-2.5 shrink-0">
      <UIcon name="i-lucide-book-open" class="size-4 shrink-0 text-white" />
      <span class="flex-1 truncate text-xs font-bold uppercase tracking-widest text-white">
        {{ title }}
      </span>
    </div>

    <div class="flex items-center justify-between gap-2 border-b border-neutral-100 bg-neutral-50 px-3 py-2 shrink-0">
      <button
        class="rounded p-1 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
        :disabled="currentPage === 0"
        @click="prev"
      >
        <UIcon name="i-lucide-chevron-left" class="size-4 text-neutral-600" />
      </button>

      <div class="flex flex-1 flex-wrap items-center justify-center gap-1">
        <button
          v-for="(_, idx) in pages"
          :key="idx"
          class="rounded-full transition-all duration-150"
          :class="idx === currentPage ? 'h-2 w-4 bg-indigo-600' : 'h-2 w-2 bg-neutral-300 hover:bg-indigo-300'"
          @click="goToPage(idx)"
        />
      </div>

      <button
        class="rounded p-1 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
        :disabled="currentPage === pages.length - 1"
        @click="next"
      >
        <UIcon name="i-lucide-chevron-right" class="size-4 text-neutral-600" />
      </button>
    </div>

    <div class="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-3 py-1.5 shrink-0">
      <span class="text-[10px] font-medium text-neutral-400">
        Step {{ currentPage + 1 }} of {{ pages.length }}
      </span>
      <div class="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
        <div
          class="h-full rounded-full bg-indigo-500 transition-all duration-300"
          :style="{ width: `${((currentPage + 1) / pages.length) * 100}%` }"
        />
      </div>
      <span class="text-[10px] font-semibold text-indigo-500">
        {{ Math.round(((currentPage + 1) / pages.length) * 100) }}%
      </span>
    </div>

    <div class="flex-1 overflow-y-auto">
      <transition name="page-fade" mode="out-in">
        <div :key="page.id" class="flex flex-col">
          <div class="relative aspect-video w-full shrink-0 overflow-hidden bg-neutral-100">
            <img :src="page.heroImage" :alt="page.heroAlt || page.title" class="h-full w-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div class="absolute bottom-2 left-3 right-3">
              <span class="block text-xs font-bold leading-tight text-white drop-shadow">
                {{ page.title }}
              </span>
            </div>
          </div>

          <div class="space-y-3 p-3">
            <div
              v-if="requirementResults.length"
              class="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5"
            >
              <p class="mb-2 text-[11px] font-semibold text-indigo-700">Mission Check</p>
              <div
                v-for="result in requirementResults"
                :key="result.id"
                class="flex items-start gap-2 text-[11px] leading-snug"
                :class="result.met ? 'text-emerald-700' : 'text-amber-700'"
              >
                <UIcon
                  :name="result.met ? 'i-lucide-check-circle-2' : 'i-lucide-circle-alert'"
                  class="mt-0.5 size-3.5 shrink-0"
                />
                <span>{{ result.message }}</span>
              </div>
            </div>

            <template v-for="block in page.blocks" :key="block.id">
              <p
                v-if="block.type === 'text'"
                class="text-xs leading-relaxed text-neutral-700"
              >
                {{ block.content }}
              </p>

              <div
                v-else-if="block.type === 'tip' || block.type === 'note' || block.type === 'warning'"
                class="flex gap-2 rounded-lg border p-2"
                :class="messageClassMap[block.type]"
              >
                <UIcon :name="messageIconMap[block.type]" class="mt-0.5 size-3.5 shrink-0" />
                <span class="text-[11px] leading-snug">{{ block.content }}</span>
              </div>

              <ul
                v-else-if="block.type === 'bullet-list'"
                class="space-y-1.5 pl-4 text-xs leading-relaxed text-neutral-700"
              >
                <li v-for="item in block.items" :key="item" class="list-disc">
                  {{ item }}
                </li>
              </ul>

              <div
                v-else-if="block.type === 'tags'"
                class="flex flex-wrap gap-1"
              >
                <span
                  v-for="item in block.items"
                  :key="item"
                  class="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500"
                >
                  {{ item }}
                </span>
              </div>

              <button
                v-else-if="block.type === 'image'"
                class="group block w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 text-left transition-shadow hover:shadow-md"
                @click="openImage(block)"
              >
                <img
                  :src="block.src"
                  :alt="block.alt || page.title"
                  class="aspect-video w-full object-cover"
                />
                <div v-if="block.caption" class="px-2.5 py-2 text-[11px] text-neutral-500">
                  {{ block.caption }}
                </div>
              </button>

              <button
                v-else-if="block.type === 'youtube'"
                class="group block w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 text-left transition-shadow hover:shadow-md"
                @click="openYoutube(block)"
              >
                <div class="relative aspect-video w-full overflow-hidden bg-neutral-900">
                  <img
                    :src="youtubeThumbnail(block)"
                    :alt="block.title || page.title"
                    class="h-full w-full object-cover opacity-90 transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                  <div class="absolute inset-0 bg-black/20" />
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="flex size-14 items-center justify-center rounded-2xl bg-red-600 shadow-lg">
                      <UIcon name="i-lucide-play" class="ml-0.5 size-7 text-white" />
                    </div>
                  </div>
                </div>
                <div class="space-y-1 px-2.5 py-2">
                  <p v-if="block.title" class="text-xs font-semibold text-neutral-800">
                    {{ block.title }}
                  </p>
                  <p v-if="block.caption" class="text-[11px] text-neutral-500">
                    {{ block.caption }}
                  </p>
                </div>
              </button>

              <div
                v-else-if="block.type === 'code'"
                class="group relative rounded-xl border border-dashed border-neutral-300 bg-white p-2.5"
                @mouseenter="showCodePreview(block, $event)"
                @mouseleave="scheduleHideCodePreview"
              >
                <div class="mb-2 flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-semibold text-neutral-700">
                      {{ block.title || 'Code Example' }}
                    </p>
                    <p v-if="block.language" class="text-[10px] uppercase tracking-wider text-neutral-400">
                      {{ block.language }}
                    </p>
                  </div>
                  <UButton
                    label="Copy"
                    icon="i-lucide-copy"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click.stop="copyCode(block.code)"
                  />
                </div>

                <pre class="max-h-40 overflow-hidden rounded-lg bg-neutral-50 p-3 text-[11px] leading-relaxed text-slate-700"><code>{{ block.code }}</code></pre>
              </div>
            </template>
          </div>
        </div>
      </transition>
    </div>

    <div class="flex gap-2 border-t border-neutral-200 bg-neutral-50 px-3 py-2.5 shrink-0">
      <UButton
        v-if="currentPage > 0"
        label="Back"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="outline"
        size="xs"
        class="flex-1"
        @click="prev"
      />
      <UButton
        v-if="currentPage < pages.length - 1"
        label="Continue"
        trailing-icon="i-lucide-arrow-right"
        color="primary"
        variant="solid"
        size="xs"
        class="flex-1"
        @click="next"
      />
      <UButton
        v-else
        label="Done!"
        trailing-icon="i-lucide-check"
        color="success"
        variant="solid"
        size="xs"
        class="flex-1"
      />
    </div>

    <Teleport to="body">
      <div
        v-if="hoveredCodePreview"
        class="fixed z-[70] w-[520px] max-w-[calc(100vw-32px)] rounded-2xl border border-dashed border-neutral-300 bg-white p-3 shadow-2xl"
        :style="{ left: `${hoveredCodePreview.left}px`, top: `${hoveredCodePreview.top}px` }"
        @mouseenter="clearHideCodePreview"
        @mouseleave="scheduleHideCodePreview"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-neutral-800">
              {{ hoveredCodePreview.block.title || "Code Example" }}
            </p>
            <p v-if="hoveredCodePreview.block.language" class="text-[10px] uppercase tracking-wider text-neutral-400">
              {{ hoveredCodePreview.block.language }}
            </p>
          </div>
          <UButton
            label="Copy"
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            size="xs"
            @click.stop="copyCode(hoveredCodePreview.block.code)"
          />
        </div>
        <pre class="max-h-[420px] overflow-auto rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-slate-700"><code>{{ hoveredCodePreview.block.code }}</code></pre>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="activeOverlay"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
        @click.self="closeOverlay"
      >
        <div class="relative w-full max-w-5xl rounded-2xl bg-white p-3 shadow-2xl">
          <button
            class="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black"
            @click="closeOverlay"
          >
            <UIcon name="i-lucide-x" class="size-4" />
          </button>

          <img
            v-if="activeOverlay.type === 'image'"
            :src="activeOverlay.src"
            :alt="activeOverlay.alt"
            class="max-h-[80vh] w-full rounded-xl object-contain bg-neutral-100"
          />

          <div v-else class="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              class="h-full w-full"
              :src="activeOverlay.embedUrl"
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            />
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useEditorStore } from "~/composables/useEditorStore";

import {
  learningContent,
  type LearningBlock,
  type LearningPage,
} from "~/data/learningContent";
import { evaluateLearningRequirements } from "~/utils/learningRequirements";

type CodeBlock = Extract<LearningBlock, { type: "code" }>;
type ImageBlock = Extract<LearningBlock, { type: "image" }>;
type YoutubeBlock = Extract<LearningBlock, { type: "youtube" }>;

const title = learningContent.title;
const pages = learningContent.pages;
const currentPage = ref(0);
const page = computed<LearningPage>(() => pages[currentPage.value]!);
const panelRef = ref<HTMLElement | null>(null);
const store = useEditorStore();
const requirementResults = computed(() =>
  evaluateLearningRequirements(
    page.value.requirements,
    {
      elements: store.elements.value,
      currentPageId: store.currentPageId.value,
      jsCode: store.jsCode.value,
    },
  ),
);
const hasUnmetRequirements = computed(() =>
  requirementResults.value.some((result) => !result.met),
);

const messageClassMap = {
  tip: "border-indigo-100 bg-indigo-50 text-indigo-700",
  note: "border-sky-100 bg-sky-50 text-sky-700",
  warning: "border-amber-100 bg-amber-50 text-amber-800",
} satisfies Record<"tip" | "note" | "warning", string>;

const messageIconMap = {
  tip: "i-lucide-lightbulb",
  note: "i-lucide-info",
  warning: "i-lucide-triangle-alert",
} satisfies Record<"tip" | "note" | "warning", string>;

const hoveredCodePreview = ref<{
  block: CodeBlock;
  left: number;
  top: number;
} | null>(null);

const activeOverlay = ref<
  | { type: "image"; src: string; alt: string }
  | { type: "youtube"; embedUrl: string }
  | null
>(null);

let hidePreviewTimer: ReturnType<typeof setTimeout> | null = null;

function prev() {
  if (currentPage.value > 0) currentPage.value--;
}

function next() {
  goToPage(currentPage.value + 1);
}

function goToPage(targetIndex: number) {
  if (targetIndex < 0 || targetIndex >= pages.length) return;

  const isMovingForward = targetIndex > currentPage.value;
  if (isMovingForward && hasUnmetRequirements.value) {
    const firstUnmet = requirementResults.value.find((result) => !result.met);
    window.alert(firstUnmet?.message || "Please complete this step before continuing.");
    return;
  }

  currentPage.value = targetIndex;
}

async function copyCode(code: string) {
  await navigator.clipboard?.writeText(code).catch(() => undefined);
}

function clearHideCodePreview() {
  if (hidePreviewTimer) {
    clearTimeout(hidePreviewTimer);
    hidePreviewTimer = null;
  }
}

function scheduleHideCodePreview() {
  clearHideCodePreview();
  hidePreviewTimer = setTimeout(() => {
    hoveredCodePreview.value = null;
  }, 120);
}

function showCodePreview(block: CodeBlock, event: MouseEvent) {
  clearHideCodePreview();
  const blockRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const panelRect = panelRef.value?.getBoundingClientRect();
  const left = Math.min(
    (panelRect?.right ?? blockRect.right) + 12,
    window.innerWidth - 540,
  );
  const top = Math.min(blockRect.top, window.innerHeight - 520);

  hoveredCodePreview.value = {
    block,
    left: Math.max(16, left),
    top: Math.max(16, top),
  };
}

function openImage(block: ImageBlock) {
  activeOverlay.value = {
    type: "image",
    src: block.src,
    alt: block.alt || page.value.title,
  };
}

function youtubeThumbnail(block: YoutubeBlock) {
  return block.thumbnail || `https://img.youtube.com/vi/${block.videoId}/hqdefault.jpg`;
}

function openYoutube(block: YoutubeBlock) {
  activeOverlay.value = {
    type: "youtube",
    embedUrl: `https://www.youtube.com/embed/${block.videoId}?autoplay=1&rel=0`,
  };
}

function closeOverlay() {
  activeOverlay.value = null;
}

onBeforeUnmount(() => {
  clearHideCodePreview();
});
</script>

<style scoped>
.page-fade-enter-active,
.page-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>

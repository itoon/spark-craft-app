<template>
  <aside
    class="editor-learn flex flex-col h-full bg-white border-r border-neutral-200 w-90 shrink-0 overflow-hidden"
  >
    <!-- Panel header -->
    <div
      class="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-200 shrink-0 bg-indigo-600"
    >
      <UIcon name="i-lucide-book-open" class="text-white size-4 shrink-0" />
      <span
        class="text-xs font-bold text-white uppercase tracking-widest truncate flex-1"
        >{{ title }}</span
      >
    </div>

    <!-- Page navigation bar -->
    <div
      class="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-100 bg-neutral-50 shrink-0"
    >
      <button
        class="p-1 rounded hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        :disabled="currentPage === 0"
        @click="prev"
      >
        <UIcon name="i-lucide-chevron-left" class="size-4 text-neutral-600" />
      </button>

      <!-- Page dots -->
      <div class="flex items-center gap-1 flex-1 justify-center flex-wrap">
        <button
          v-for="(_, idx) in pages"
          :key="idx"
          class="rounded-full transition-all duration-150"
          :class="
            idx === currentPage
              ? 'bg-indigo-600 w-4 h-2'
              : 'bg-neutral-300 hover:bg-indigo-300 w-2 h-2'
          "
          @click="currentPage = idx"
        />
      </div>

      <button
        class="p-1 rounded hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        :disabled="currentPage === pages.length - 1"
        @click="next"
      >
        <UIcon name="i-lucide-chevron-right" class="size-4 text-neutral-600" />
      </button>
    </div>

    <!-- Progress label -->
    <div
      class="flex items-center justify-between px-3 py-1.5 bg-neutral-50 border-b border-neutral-100 shrink-0"
    >
      <span class="text-[10px] text-neutral-400 font-medium"
        >Step {{ currentPage + 1 }} of {{ pages.length }}</span
      >
      <div class="flex-1 mx-2 h-1 bg-neutral-200 rounded-full overflow-hidden">
        <div
          class="h-full bg-indigo-500 rounded-full transition-all duration-300"
          :style="{ width: `${((currentPage + 1) / pages.length) * 100}%` }"
        />
      </div>
      <span class="text-[10px] text-indigo-500 font-semibold"
        >{{ Math.round(((currentPage + 1) / pages.length) * 100) }}%</span
      >
    </div>

    <!-- Page content (scrollable) -->
    <div class="flex-1 overflow-y-auto">
      <transition name="page-fade" mode="out-in">
        <div :key="currentPage" class="flex flex-col gap-0">
          <!-- Image -->
          <div
            class="relative w-full aspect-video bg-neutral-100 overflow-hidden shrink-0"
          >
            <img
              :src="page.image"
              :alt="page.title"
              class="w-full h-full object-cover"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
            />
            <div class="absolute bottom-2 left-3 right-3">
              <span
                class="text-white text-xs font-bold drop-shadow leading-tight block"
                >{{ page.title }}</span
              >
            </div>
          </div>

          <!-- Text content -->
          <div class="p-3 space-y-2">
            <p class="text-xs text-neutral-700 leading-relaxed">
              {{ page.content }}
            </p>

            <!-- Tips / highlights -->
            <div
              v-if="page.tip"
              class="flex gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-2 mt-1"
            >
              <UIcon
                name="i-lucide-lightbulb"
                class="size-3.5 text-indigo-500 shrink-0 mt-0.5"
              />
              <span class="text-[11px] text-indigo-700 leading-snug">{{
                page.tip
              }}</span>
            </div>

            <!-- Tags -->
            <div v-if="page.tags?.length" class="flex flex-wrap gap-1 pt-1">
              <span
                v-for="tag in page.tags"
                :key="tag"
                class="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded font-medium"
                >{{ tag }}</span
              >
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- Bottom nav buttons -->
    <div
      class="flex gap-2 px-3 py-2.5 border-t border-neutral-200 shrink-0 bg-neutral-50"
    >
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
        label="Next"
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
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const title = "Calculator App";

interface LearningPage {
  title: string;
  content: string;
  image: string;
  tip?: string;
  tags?: string[];
}

const pages: LearningPage[] = [
  {
    title: "Welcome to CodeCraft",
    content:
      "In this tutorial you will build a fully working Calculator app from scratch using the CodeCraft visual editor. No prior coding knowledge is required — just follow each step!",
    image:
      "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400&h=225&fit=crop",
    tip: "Each step builds on the last. Take your time and experiment freely.",
    tags: ["Beginner", "Calculator"],
  },
  {
    title: "The Design Canvas",
    content:
      "The center area is your Design Canvas. This is where your app takes shape. You can drag elements from the left panel onto the canvas and rearrange them freely.",
    image:
      "https://images.unsplash.com/photo-1545665277-5937489579f2?w=400&h=225&fit=crop",
    tip: "Try dragging a Button element onto the canvas now to get a feel for it.",
    tags: ["Canvas", "Drag & Drop"],
  },
  {
    title: "Adding a Text Box",
    content:
      'Find "Text box" in the Elements panel on the left. Click it or drag it to the canvas to add a display label. This will show the numbers the user types.',
    image:
      "https://images.unsplash.com/photo-1555421689-d68471e189f2?w=400&h=225&fit=crop",
    tip: "Select the element after placing it to edit its content in the Properties panel on the right.",
    tags: ["Text box", "UI"],
  },
  {
    title: "Creating Number Inputs",
    content:
      'Add two Input elements below the Text box. These will hold the first and second numbers for the calculation. Set their labels to "Number 1" and "Number 2".',
    image:
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=225&fit=crop",
    tip: "Use the Properties panel to set the placeholder text for each input field.",
    tags: ["Input", "Forms"],
  },
  {
    title: "Adding Operator Buttons",
    content:
      "Place four Button elements on the canvas — one each for Addition, Subtraction, Multiplication, and Division. Color-code them: cyan, red, green, and yellow.",
    image:
      "https://images.unsplash.com/photo-1596496181848-3091d4878b24?w=400&h=225&fit=crop",
    tip: "Hold Shift while clicking elements to select multiple buttons at once.",
    tags: ["Buttons", "Layout"],
  },
  {
    title: "Adding a Result Display",
    content:
      "Add a final Text box at the bottom. This element will show the calculation result. Give it a larger font size (e.g. 28) to make the result stand out clearly.",
    image:
      "https://images.unsplash.com/photo-1510519138101-570d1dca3d66?w=400&h=225&fit=crop",
    tip: "Set the text color to a highlight color so the result is easy to read at a glance.",
    tags: ["Text box", "Result"],
  },
  {
    title: "Writing the Logic",
    content:
      "Switch to the Block or Code tab at the top. For each button, write logic that reads the two input values, performs the math operation, and writes the result to the result Text box.",
    image:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop",
    tip: "Use the Block editor for a visual approach, or the Code tab if you prefer JavaScript.",
    tags: ["Logic", "Block", "Code"],
  },
  {
    title: "Handling Division by Zero",
    content:
      'Add a condition in the Division button logic: if the second number equals 0, show "Error: divide by zero" in the result display instead of crashing.',
    image:
      "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=225&fit=crop",
    tip: "Good apps handle edge cases gracefully. Users will always find unexpected ways to use your app!",
    tags: ["Logic", "Error Handling"],
  },
  {
    title: "Preview Your App",
    content:
      "Click the green Run button in the header to launch a live preview of your calculator. Try entering numbers and pressing each operation button to verify everything works.",
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=225&fit=crop",
    tip: "The preview panel at the bottom mirrors a real mobile device screen.",
    tags: ["Run", "Preview", "Test"],
  },
  {
    title: "Export & Share",
    content:
      "Press the Export button to download your finished Calculator app as a Vue SFC file. You can open it in any code editor, deploy it, or share it with friends!",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop",
    tip: "Congratulations on finishing your first CodeCraft app! Try building something new next.",
    tags: ["Export", "Deploy", "Share"],
  },
];

const currentPage = ref(0);
const page = computed(() => pages[currentPage.value]!);

function prev() {
  if (currentPage.value > 0) currentPage.value--;
}
function next() {
  if (currentPage.value < pages.length - 1) currentPage.value++;
}
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

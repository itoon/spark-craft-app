<template>
  <div class="pointer-events-none absolute inset-0 z-[60] overflow-hidden">
    <!-- Alerts / confirms: blocking dialog, like App Inventor's Notifier.ShowAlert / ShowChooseDialog -->
    <div
      v-if="dialog"
      class="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 p-6"
      role="alertdialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[260px] rounded-2xl bg-white p-4 text-center shadow-2xl">
        <p class="whitespace-pre-line break-words text-sm leading-relaxed text-neutral-800">
          {{ dialog.message }}
        </p>
        <div v-if="dialog.kind === 'confirm'" class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-xl bg-neutral-100 py-2 text-sm font-semibold text-neutral-700 active:scale-[0.98]"
            @click="emit('answer', dialog.id, false)"
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white active:scale-[0.98]"
            @click="emit('answer', dialog.id, true)"
          >
            OK
          </button>
        </div>
        <button
          v-else
          type="button"
          class="mt-4 w-full rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white active:scale-[0.98]"
          @click="emit('dismiss', dialog.id)"
        >
          OK
        </button>
      </div>
    </div>

    <!-- Toasts: short messages near the bottom -->
    <TransitionGroup
      tag="div"
      name="cc-toast"
      class="absolute inset-x-3 bottom-8 flex flex-col items-center gap-2"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        role="status"
        class="max-w-full break-words rounded-full bg-neutral-900/90 px-4 py-2 text-center text-xs font-medium leading-snug text-white shadow-lg"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { RuntimeNotification } from "~/utils/runtimeServices";

const props = defineProps<{ items: RuntimeNotification[] }>();
const emit = defineEmits<{
  (e: "dismiss", id: number): void;
  (e: "answer", id: number, ok: boolean): void;
}>();

const toasts = computed(() => props.items.filter((item) => item.kind === "toast"));
const dialog = computed(
  () => props.items.find((item) => item.kind === "alert" || item.kind === "confirm") ?? null,
);
</script>

<style scoped>
.cc-toast-enter-active,
.cc-toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.cc-toast-enter-from,
.cc-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (prefers-reduced-motion: reduce) {
  .cc-toast-enter-active,
  .cc-toast-leave-active {
    transition: none;
  }
}
</style>

<template>
  <div class="pointer-events-none absolute inset-0 z-[60] overflow-hidden">
    <!-- Alerts: blocking dialog, like App Inventor's Notifier.ShowAlert -->
    <div
      v-if="alert"
      class="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 p-6"
      role="alertdialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[260px] rounded-2xl bg-white p-4 text-center shadow-2xl">
        <p class="whitespace-pre-line break-words text-sm leading-relaxed text-neutral-800">
          {{ alert.message }}
        </p>
        <button
          type="button"
          class="mt-4 w-full rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white active:scale-[0.98]"
          @click="emit('dismiss', alert.id)"
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
const emit = defineEmits<{ (e: "dismiss", id: number): void }>();

const toasts = computed(() => props.items.filter((item) => item.kind === "toast"));
const alert = computed(() => props.items.find((item) => item.kind === "alert") ?? null);
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

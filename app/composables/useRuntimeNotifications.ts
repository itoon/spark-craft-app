import { ref } from "vue";

import type { RuntimeNotification } from "~/utils/runtimeServices";

const TOAST_MS = 2600;

/**
 * Local (per-runtime) queue for notify.toast / notify.alert / notify.confirm.
 * Toasts dismiss themselves; alerts and confirms stay until the user answers.
 */
export function useRuntimeNotifications() {
  const items = ref<RuntimeNotification[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  function dismiss(id: number) {
    // A confirm closed without an answer (e.g. the run restarted) counts as Cancel
    answer(id, false);
  }

  /** Close an alert / confirm; a confirm's await gets `ok` */
  function answer(id: number, ok: boolean) {
    const item = items.value.find((candidate) => candidate.id === id);
    item?.respond?.(ok);
    items.value = items.value.filter((candidate) => candidate.id !== id);
    const handle = timers.get(id);
    if (handle) clearTimeout(handle);
    timers.delete(id);
  }

  function push(notification: RuntimeNotification) {
    // Keep the screen readable: at most 3 toasts at a time.
    const toasts = items.value.filter((item) => item.kind === "toast");
    if (notification.kind === "toast" && toasts.length >= 3) {
      dismiss(toasts[0]!.id);
    }
    items.value = [...items.value, notification];
    if (notification.kind === "toast") {
      timers.set(
        notification.id,
        setTimeout(() => dismiss(notification.id), TOAST_MS),
      );
    }
  }

  function clear() {
    for (const handle of timers.values()) clearTimeout(handle);
    timers.clear();
    for (const item of items.value) item.respond?.(false);
    items.value = [];
  }

  return { items, push, dismiss, answer, clear };
}

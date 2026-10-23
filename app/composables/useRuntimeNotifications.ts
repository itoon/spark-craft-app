import { ref } from "vue";

import type { RuntimeNotification } from "~/utils/runtimeServices";

const TOAST_MS = 2600;

/**
 * Local (per-runtime) queue for notify.toast / notify.alert.
 * Toasts dismiss themselves; alerts stay until the user taps OK.
 */
export function useRuntimeNotifications() {
  const items = ref<RuntimeNotification[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  function dismiss(id: number) {
    items.value = items.value.filter((item) => item.id !== id);
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
    items.value = [];
  }

  return { items, push, dismiss, clear };
}

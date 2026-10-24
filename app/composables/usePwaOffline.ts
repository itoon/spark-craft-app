import { onMounted, ref } from "vue";

/**
 * Makes a shared app (/pwa/<id>) work offline: registers /sw.js (it caches the
 * whole build — server/utils/serviceWorker.ts) and stores this app's data.
 *
 *   unsupported  `bun run dev`, plain http, or an old browser
 *   insecure     https the phone doesn't trust yet → install the classroom CA (/cert)
 *   preparing    downloading
 *   ready        opens with no network from now on
 *   error        failed (offline on first open?) — tried again next time
 */
export type PwaOfflineState = "unsupported" | "insecure" | "preparing" | "ready" | "error";

const DATA_CACHE = "codecraft-data"; // same name as in the service worker

export function isIos() {
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1);
}

/** Opened from the home screen rather than a browser tab. */
export function isStandalone() {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

export function usePwaOffline(shareId: string) {
  const state = ref<PwaOfflineState>("unsupported");

  onMounted(async () => {
    if (import.meta.dev || !("serviceWorker" in navigator) || !("caches" in window)) return;
    if (!window.isSecureContext) {
      state.value = "insecure";
      return;
    }
    state.value = "preparing";
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch {
      // Safari refuses a worker from a certificate it doesn't trust
      state.value = "insecure";
      return;
    }
    try {
      await navigator.serviceWorker.ready; // resolves once the build is cached
      const cache = await caches.open(DATA_CACHE);
      await cache.addAll([`/api/export/link/${shareId}`, `/api/pwa/${shareId}/manifest.webmanifest`]);
      await cache.add(`/api/pwa/${shareId}/icon.png`).catch(() => {}); // older links have no icon
      state.value = "ready";
    } catch {
      state.value = "error";
    }
  });

  return { state };
}

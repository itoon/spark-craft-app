<template>
  <div>
    <ExportSharedAppViewer v-if="payload" :payload="payload" />

    <div
      v-else-if="errorMessage"
      class="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 text-center"
    >
      <div>
        <p class="text-lg font-semibold">{{ errorMessage }}</p>
        <p class="mt-2 text-sm text-neutral-400">This shared app link may have been removed or was never created.</p>
      </div>
    </div>

    <div
      v-else
      class="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6"
    >
      <p class="text-sm text-neutral-400">Loading shared app...</p>
    </div>

    <ExportPwaInstallHint
      v-if="payload"
      :share-id="shareId"
      :app-name="payload.appName"
      :state="offline.state.value"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { usePwaOffline } from "~/composables/usePwaOffline";
import type { SharedExportRecord } from "~/utils/sharedExport";

const route = useRoute();
const shareId = String(route.params.id);
const payload = ref<SharedExportRecord | null>(null);
const errorMessage = ref("");
// Registers the offline worker (production build over trusted https only)
const offline = usePwaOffline(shareId);

try {
  payload.value = await $fetch<SharedExportRecord>(`/api/export/link/${shareId}`);
  const appName = payload.value.appName;
  useHead({
    title: appName,
    // iPhone "Add to Home Screen" reads these: own name + icon, opens full screen
    link: [
      { rel: "manifest", href: `/api/pwa/${shareId}/manifest.webmanifest` },
      { rel: "apple-touch-icon", href: `/api/pwa/${shareId}/icon.png` },
    ],
    meta: [
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: appName },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "theme-color", content: "#ffffff" },
    ],
  });
} catch (error) {
  errorMessage.value = error instanceof Error ? error.message : "Shared app not found";
}
</script>

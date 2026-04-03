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
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import type { SharedExportRecord } from "~/utils/sharedExport";

const route = useRoute();
const payload = ref<SharedExportRecord | null>(null);
const errorMessage = ref("");

try {
  payload.value = await $fetch<SharedExportRecord>(`/api/export/link/${route.params.id}`);
  useHead({
    title: `${payload.value.appName} — Shared Preview`,
  });
} catch (error) {
  errorMessage.value = error instanceof Error ? error.message : "Shared app not found";
}
</script>

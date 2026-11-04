<template>
  <!-- UApp is required by Nuxt UI v4 for portal-based components
       (toasts, modals, tooltips) to render correctly. -->
  <UApp>
    <NuxtPage />
  </UApp>
</template>

<script setup lang="ts">
import { watchEffect } from "vue";

import { useUiTheme } from "~/composables/useUiTheme";

// The editor theme is for CodeCraft's own pages; the app players
// (/app, /pwa, /live/<code>) always show the student's app as built.
const PLAYER_ROUTES = /^\/(app|pwa|live\/[^/]+)(\/|$)/;

const route = useRoute();
const { theme } = useUiTheme();

watchEffect(() => {
  if (!import.meta.client) return;
  const themed = theme.value !== "codecraft" && !PLAYER_ROUTES.test(route.path);
  if (themed) document.documentElement.dataset.theme = theme.value;
  else delete document.documentElement.dataset.theme;
});
</script>

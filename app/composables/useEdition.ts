import { computed } from "vue";

/**
 * Web edition (GitHub Pages) vs. local edition (`bun run dev`). The web build
 * has no server, so features that need one — Build APK, Share link, Live
 * (มือถือ), Ionic export — are hidden there.
 */
export function useEdition() {
  const config = useRuntimeConfig();
  const isWeb = computed(() => Boolean(config.public.codecraftWeb));
  return { isWeb };
}

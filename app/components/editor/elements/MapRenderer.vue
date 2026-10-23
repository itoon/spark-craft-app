<template>
  <div class="relative h-full w-full overflow-hidden bg-neutral-100">
    <div
      ref="mapRef"
      class="h-full w-full"
      :class="{ 'pointer-events-none': !interactive }"
      role="application"
      aria-label="แผนที่"
    />
    <div
      v-if="status !== 'ready'"
      class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-100 p-4 text-center"
    >
      <UIcon
        :name="status === 'offline' ? 'i-lucide-wifi-off' : 'i-lucide-map'"
        class="size-7 text-neutral-400"
      />
      <p class="text-xs leading-snug text-neutral-500">
        {{ status === "offline" ? "แผนที่ต้องต่ออินเทอร์เน็ต" : "กำลังโหลดแผนที่…" }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import { loadLeaflet, type LeafletApi } from "~/utils/leafletLoader";

export interface MapMarker {
  lat: number;
  lng: number;
  text?: string;
}

const props = defineProps<{
  lat: number;
  lng: number;
  zoom: number;
  markers: MapMarker[];
  interactive?: boolean;
}>();

const emit = defineEmits<{
  (e: "map-click", lat: number, lng: number): void;
}>();

const mapRef = ref<HTMLElement | null>(null);
const status = ref<"loading" | "ready" | "offline">("loading");

let L: LeafletApi | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let markerLayer: any = null;
let resizeObserver: ResizeObserver | null = null;

function renderMarkers() {
  if (!L || !markerLayer) return;
  markerLayer.clearLayers();
  for (const marker of props.markers ?? []) {
    if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) continue;
    const circle = L.circleMarker([marker.lat, marker.lng], {
      radius: 8,
      color: "#ffffff",
      weight: 2,
      fillColor: "#4f46e5",
      fillOpacity: 1,
    });
    if (marker.text) circle.bindTooltip(String(marker.text), { permanent: false, direction: "top" });
    markerLayer.addLayer(circle);
  }
}

onMounted(async () => {
  try {
    L = await loadLeaflet();
  } catch {
    status.value = "offline";
    return;
  }
  if (!mapRef.value) return;
  map = L.map(mapRef.value, {
    zoomControl: Boolean(props.interactive),
    attributionControl: true,
    dragging: Boolean(props.interactive),
    scrollWheelZoom: Boolean(props.interactive),
    doubleClickZoom: Boolean(props.interactive),
    touchZoom: Boolean(props.interactive),
    keyboard: Boolean(props.interactive),
  }).setView([props.lat, props.lng], props.zoom);
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  });
  tiles.on("tileerror", () => {
    if (!navigator.onLine) status.value = "offline";
  });
  tiles.addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  renderMarkers();
  map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
    if (!props.interactive) return;
    emit("map-click", Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
  });
  status.value = "ready";

  // Leaflet needs a nudge when its box changes size (device switch, scaling)
  resizeObserver = new ResizeObserver(() => map?.invalidateSize());
  resizeObserver.observe(mapRef.value);
});

watch(
  () => [props.lat, props.lng, props.zoom],
  () => {
    if (map && Number.isFinite(props.lat) && Number.isFinite(props.lng)) {
      map.setView([props.lat, props.lng], props.zoom || map.getZoom());
    }
  },
);

watch(() => props.markers, renderMarkers, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  map?.remove();
  map = null;
});
</script>

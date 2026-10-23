<template>
  <div
    class="cc-cam"
    :class="[`cc-cam--${platform === 'ios' ? 'ios' : 'md'}`, `is-${status}`]"
    :style="{ height: `${height}px` }"
  >
    <!-- Live video comes from the parent so capture() can find it -->
    <slot />

    <img
      v-if="frozenFrame"
      :key="shotKey"
      :src="frozenFrame"
      class="cc-cam__shot"
      alt="Captured photo"
    />
    <div v-if="frozenFrame" :key="`flash-${shotKey}`" class="cc-cam__flash" aria-hidden="true" />

    <!-- Viewfinder chrome: only over a picture -->
    <template v-if="status === 'live' || status === 'frozen'">
      <span class="cc-cam__frame" aria-hidden="true">
        <i class="cc-cam__corner cc-cam__corner--tl" />
        <i class="cc-cam__corner cc-cam__corner--tr" />
        <i class="cc-cam__corner cc-cam__corner--br" />
        <i class="cc-cam__corner cc-cam__corner--bl" />
      </span>
      <span class="cc-cam__pill cc-cam__pill--status">
        <template v-if="status === 'live'">
          <span class="cc-cam__rec" aria-hidden="true" />LIVE
        </template>
        <template v-else>
          <svg viewBox="0 0 24 24" class="cc-cam__pill-icon" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>ถ่ายแล้ว
        </template>
      </span>
      <span v-if="filterName" class="cc-cam__pill cc-cam__pill--filter">{{ filterName }}</span>
    </template>

    <!-- Closed / starting / error: a calm message on the dark lens surface -->
    <div v-else class="cc-cam__message" :role="status === 'error' ? 'alert' : undefined">
      <span class="cc-cam__glyph" aria-hidden="true">
        <svg v-if="status === 'error' || status === 'closed'" viewBox="0 0 24 24">
          <path d="M3 3l18 18" />
          <path d="M9.5 5H15l1.5 2H19a2 2 0 0 1 2 2v8.5M17 19H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1" />
          <path d="M9.9 10.4a3 3 0 0 0 4.2 4.2" />
        </svg>
        <svg v-else viewBox="0 0 24 24">
          <path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z" />
          <circle cx="12" cy="12.5" r="3.5" />
        </svg>
      </span>
      <span class="cc-cam__title">{{ title }}</span>
      <span v-if="detail" class="cc-cam__detail">{{ detail }}</span>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * How the Camera element looks in the app: a phone-style viewfinder.
 *  design   — editor canvas (nothing runs yet)
 *  closed   — running, camera.open() not called
 *  starting — open() called, waiting for the first frame
 *  live     — video showing
 *  frozen   — capture() froze the frame until reset()
 *  error    — the camera could not start
 */
export type CameraViewStatus = "design" | "closed" | "starting" | "live" | "frozen" | "error";
</script>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = defineProps<{
  status: CameraViewStatus;
  platform: string;
  height: number;
  filterName?: string;
  frozenFrame?: string | null;
  error?: string;
}>();

// Replays the shutter flash for every new capture
const shotKey = ref(0);
watch(
  () => props.frozenFrame,
  (next, prev) => {
    if (next && next !== prev) shotKey.value += 1;
  },
);

const title = computed(() => {
  if (props.status === "error") return "เปิดกล้องไม่ได้";
  if (props.status === "starting") return "กำลังเปิดกล้อง…";
  if (props.status === "design") return "กล้อง";
  return "กล้องปิดอยู่";
});

const detail = computed(() => {
  if (props.status === "error") return props.error || "ลองใหม่อีกครั้ง";
  if (props.status === "design") return "ภาพจากกล้องจะแสดงตรงนี้ เมื่อโค้ดเรียก .open()";
  return "";
});
</script>

<style scoped>
.cc-cam {
  --cam-radius: 22px;
  --cam-surface: #0d0d0f;
  --cam-ink: rgb(255 255 255 / 0.92);
  --cam-ink-soft: rgb(255 255 255 / 0.66);
  --cam-scrim: rgb(0 0 0 / 0.4);
  --cam-rec: #ff453a;
  --cam-warn: #ffb340;
  --cam-ease: cubic-bezier(0.16, 1, 0.3, 1);

  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: 120px;
  overflow: hidden;
  border-radius: var(--cam-radius);
  background:
    radial-gradient(120% 90% at 50% 40%, rgb(255 255 255 / 0.06), transparent 62%),
    var(--cam-surface);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.06),
    0 10px 28px -16px rgb(0 0 0 / 0.55);
  color: var(--cam-ink);
  user-select: none;
  -webkit-user-select: none;
}

.cc-cam--md {
  --cam-radius: 14px;
  --cam-rec: #f44336;
}

.cc-cam :deep(video),
.cc-cam__shot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Fades the picture in instead of popping when the first frame arrives */
.cc-cam :deep(video) {
  opacity: 0;
  transition: opacity 360ms var(--cam-ease);
}
.cc-cam.is-live :deep(video),
.cc-cam.is-frozen :deep(video) {
  opacity: 1;
}

.cc-cam__shot {
  z-index: 1;
  animation: cc-cam-settle 520ms var(--cam-ease) both;
}

.cc-cam__flash {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: #fff;
  pointer-events: none;
  animation: cc-cam-flash 360ms var(--cam-ease) both;
}

.cc-cam__frame {
  position: absolute;
  inset: 12px;
  z-index: 3;
  pointer-events: none;
  transition: opacity 240ms var(--cam-ease);
}
.cc-cam.is-frozen .cc-cam__frame {
  opacity: 0;
}

/* Focus brackets: fixed 18px corners whatever the camera's size */
.cc-cam__corner {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 0 solid rgb(255 255 255 / 0.8);
}
.cc-cam__corner--tl {
  top: 0;
  left: 0;
  border-top-width: 2px;
  border-left-width: 2px;
  border-top-left-radius: 6px;
}
.cc-cam__corner--tr {
  top: 0;
  right: 0;
  border-top-width: 2px;
  border-right-width: 2px;
  border-top-right-radius: 6px;
}
.cc-cam__corner--br {
  right: 0;
  bottom: 0;
  border-right-width: 2px;
  border-bottom-width: 2px;
  border-bottom-right-radius: 6px;
}
.cc-cam__corner--bl {
  bottom: 0;
  left: 0;
  border-bottom-width: 2px;
  border-left-width: 2px;
  border-bottom-left-radius: 6px;
}

.cc-cam__pill {
  position: absolute;
  top: 20px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  /* Blur keeps the label readable over any picture behind it */
  background: var(--cam-scrim);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  backdrop-filter: blur(10px) saturate(140%);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.06em;
  color: var(--cam-ink);
  pointer-events: none;
}
.cc-cam__pill--status {
  left: 20px;
}
.cc-cam__pill--filter {
  right: 20px;
  letter-spacing: 0.02em;
  font-weight: 500;
}

.cc-cam__rec {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cam-rec);
  box-shadow: 0 0 0 2px rgb(255 69 58 / 0.25);
  animation: cc-cam-rec 1.6s ease-in-out infinite;
}

.cc-cam__pill-icon {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cc-cam__message {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 20px;
  text-align: center;
}

.cc-cam__glyph {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 4px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.07);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
  color: var(--cam-ink-soft);
}
.cc-cam__glyph svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.cc-cam.is-error .cc-cam__glyph {
  color: var(--cam-warn);
  background: rgb(255 179 64 / 0.12);
  box-shadow: inset 0 0 0 1px rgb(255 179 64 / 0.28);
}
.cc-cam.is-starting .cc-cam__glyph {
  animation: cc-cam-breathe 1.4s ease-in-out infinite;
}

.cc-cam__title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--cam-ink);
}

.cc-cam__detail {
  max-width: 30ch;
  font-size: 11px;
  line-height: 1.5;
  color: var(--cam-ink-soft);
  text-wrap: balance;
}

@keyframes cc-cam-flash {
  from {
    opacity: 0.85;
  }
  to {
    opacity: 0;
  }
}

@keyframes cc-cam-settle {
  from {
    transform: scale(1.04);
    filter: brightness(1.18);
  }
  to {
    transform: none;
    filter: none;
  }
}

@keyframes cc-cam-rec {
  50% {
    opacity: 0.35;
  }
}

@keyframes cc-cam-breathe {
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cc-cam :deep(video),
  .cc-cam__shot,
  .cc-cam__flash,
  .cc-cam__rec,
  .cc-cam__glyph {
    animation: none !important;
    transition: none !important;
  }
  .cc-cam__flash {
    display: none;
  }
}
</style>

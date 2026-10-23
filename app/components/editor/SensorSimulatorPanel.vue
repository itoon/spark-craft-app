<template>
  <aside
    class="flex w-72 shrink-0 flex-col overflow-hidden border-l border-neutral-800 bg-neutral-900/40 text-neutral-200"
    aria-label="ตัวจำลองมือถือ"
  >
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-neutral-700 bg-neutral-900 px-3">
      <UIcon name="i-lucide-smartphone" class="size-3.5 text-neutral-500" />
      <span class="text-[10px] font-bold uppercase tracking-widest text-neutral-500">ตัวจำลองมือถือ</span>
    </div>

    <div class="flex-1 space-y-4 overflow-y-auto p-3 text-xs">
      <!-- GPS -->
      <section v-if="uses.location" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="flex items-center gap-1.5 font-semibold text-neutral-100">
            <UIcon name="i-lucide-map-pin" class="size-3.5 text-emerald-400" /> GPS
          </h3>
          <USwitch v-model="sim.state.sensors" size="xs" label="จำลอง" />
        </div>
        <template v-if="sim.state.sensors">
          <select
            class="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs"
            aria-label="สถานที่ตัวอย่าง"
            @change="pickPreset(($event.target as HTMLSelectElement).value)"
          >
            <option value="">เลือกสถานที่ตัวอย่าง…</option>
            <option v-for="(preset, i) in LOCATION_PRESETS" :key="preset.label" :value="i">
              {{ preset.label }}
            </option>
          </select>
          <div class="grid grid-cols-2 gap-2">
            <label class="space-y-1">
              <span class="text-[10px] text-neutral-400">lat</span>
              <input
                v-model.number="draftLat"
                type="number"
                step="0.0001"
                class="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono"
              />
            </label>
            <label class="space-y-1">
              <span class="text-[10px] text-neutral-400">lng</span>
              <input
                v-model.number="draftLng"
                type="number"
                step="0.0001"
                class="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono"
              />
            </label>
          </div>
          <UButton
            label="ย้ายไปที่นี่"
            icon="i-lucide-navigation"
            size="xs"
            color="neutral"
            variant="subtle"
            block
            @click="moveTo"
          />
        </template>
        <p v-else class="leading-snug text-neutral-500">
          ใช้ตำแหน่งจริงของคอมพิวเตอร์ (เบราว์เซอร์จะถามขออนุญาต)
        </p>
      </section>

      <!-- Motion -->
      <section v-if="uses.motion" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="flex items-center gap-1.5 font-semibold text-neutral-100">
            <UIcon name="i-lucide-vibrate" class="size-3.5 text-amber-400" /> การเคลื่อนไหว
          </h3>
          <USwitch v-model="sim.state.sensors" size="xs" label="จำลอง" />
        </div>
        <template v-if="sim.state.sensors">
          <UButton
            label="เขย่ามือถือ"
            icon="i-lucide-move"
            size="sm"
            color="warning"
            variant="soft"
            block
            data-testid="sim-shake"
            @click="sim.shake()"
          />
          <label class="block space-y-1">
            <span class="flex justify-between text-[10px] text-neutral-400">
              <span>เอียงซ้าย / ขวา (x)</span><span class="font-mono">{{ sim.state.tilt.x.toFixed(1) }}</span>
            </span>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              class="w-full accent-amber-400"
              :value="sim.state.tilt.x"
              @input="sim.setTilt({ x: Number(($event.target as HTMLInputElement).value) })"
            />
          </label>
          <label class="block space-y-1">
            <span class="flex justify-between text-[10px] text-neutral-400">
              <span>เอียงหน้า / หลัง (y)</span><span class="font-mono">{{ sim.state.tilt.y.toFixed(1) }}</span>
            </span>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              class="w-full accent-amber-400"
              :value="sim.state.tilt.y"
              @input="sim.setTilt({ y: Number(($event.target as HTMLInputElement).value) })"
            />
          </label>
        </template>
        <p v-else class="leading-snug text-neutral-500">คอมพิวเตอร์ส่วนใหญ่ไม่มีเซนเซอร์นี้ ลองทดสอบบนมือถือ</p>
      </section>

      <!-- Bluetooth board -->
      <section v-if="uses.ble" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="flex items-center gap-1.5 font-semibold text-neutral-100">
            <UIcon name="i-lucide-bluetooth" class="size-3.5 text-sky-400" /> บอร์ด Bluetooth
          </h3>
          <USwitch v-model="sim.state.board" size="xs" label="จำลอง" />
        </div>
        <template v-if="sim.state.board">
          <div class="max-h-36 space-y-1 overflow-y-auto rounded-md bg-neutral-950/60 p-2 font-mono text-[11px]">
            <p v-if="!sim.state.boardLog.length" class="text-neutral-600">ยังไม่มีข้อความ</p>
            <p
              v-for="entry in sim.state.boardLog"
              :key="entry.id"
              :class="entry.direction === 'app-to-board' ? 'text-sky-300' : 'text-emerald-300'"
            >
              {{ entry.direction === "app-to-board" ? "แอป → บอร์ด" : "บอร์ด → แอป" }}: {{ entry.text }}
            </p>
          </div>
          <form class="flex gap-1.5" @submit.prevent="sendFromBoard">
            <input
              v-model="boardDraft"
              placeholder="ข้อความจากบอร์ด เช่น 25.4"
              aria-label="ข้อความที่บอร์ดจำลองส่งมา"
              class="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1"
            />
            <UButton type="submit" icon="i-lucide-send" size="xs" color="info" variant="soft" aria-label="ส่ง" />
          </form>
        </template>
        <p v-else class="leading-snug text-neutral-500">
          ใช้บอร์ดจริง: ble.connect() จะเปิดหน้าต่างเลือกอุปกรณ์ของ Chrome
        </p>
      </section>

      <p class="leading-snug text-neutral-500">เปลี่ยนสวิตช์แล้วกด Restart Session เพื่อเริ่มแอปใหม่</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { LOCATION_PRESETS, useSensorSimulator } from "~/composables/useSensorSimulator";

defineProps<{
  uses: { location: boolean; motion: boolean; ble: boolean };
}>();

const sim = useSensorSimulator();
const draftLat = ref(sim.state.location.lat);
const draftLng = ref(sim.state.location.lng);
const boardDraft = ref("");

function pickPreset(index: string) {
  const preset = LOCATION_PRESETS[Number(index)];
  if (!preset || index === "") return;
  draftLat.value = preset.point.lat;
  draftLng.value = preset.point.lng;
  sim.setLocation(preset.point);
}

function moveTo() {
  if (!Number.isFinite(draftLat.value) || !Number.isFinite(draftLng.value)) return;
  sim.setLocation({ lat: draftLat.value, lng: draftLng.value, accuracy: 10 });
}

function sendFromBoard() {
  sim.sendFromBoard(boardDraft.value);
  boardDraft.value = "";
}
</script>

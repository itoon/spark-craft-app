<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-companion-title"
        class="flex max-h-[calc(100vh-2rem)] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl"
      >
        <!-- Header -->
        <header class="flex items-start gap-3 border-b border-neutral-800 px-5 py-4">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
            <UIcon name="i-lucide-smartphone" class="size-5 text-white" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 id="live-companion-title" class="text-base font-semibold text-white">
              ทดสอบบนมือถือ
            </h2>
            <p class="text-xs text-neutral-400">
              สแกนแล้วแอปจะเปิดบนมือถือ แก้ตรงนี้ปุ๊บ มือถืออัปเดตเองทันที
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label="Close"
            @click="emit('close')"
          >
            <UIcon name="i-lucide-x" class="size-4" />
          </button>
        </header>

        <div class="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 sm:grid-cols-[240px_1fr]">
          <!-- QR + code -->
          <div class="flex flex-col items-center gap-3">
            <div class="flex size-[220px] items-center justify-center rounded-xl bg-white p-2">
              <img
                v-if="qrDataUrl"
                :src="qrDataUrl"
                alt="QR code to open the app on your phone"
                class="size-full"
              />
              <UIcon
                v-else-if="live.status.value === 'starting'"
                name="i-lucide-loader-circle"
                class="size-8 animate-spin text-neutral-400"
              />
              <p v-else class="px-4 text-center text-xs text-neutral-500">
                ไม่พบที่อยู่ในวง Wi‑Fi — ดูวิธีแก้ด้านล่าง
              </p>
            </div>

            <div v-if="live.code.value" class="text-center">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                รหัสเชื่อมต่อ
              </p>
              <p
                class="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-white"
                data-testid="live-code"
              >
                {{ live.code.value }}
              </p>
            </div>

            <div class="flex w-full gap-2">
              <UButton
                :label="copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'"
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                color="neutral"
                variant="subtle"
                size="sm"
                class="flex-1 justify-center"
                :disabled="!live.phoneUrl.value"
                @click="copyUrl"
              />
            </div>
          </div>

          <!-- Steps + status -->
          <div class="flex min-w-0 flex-col gap-4">
            <ol class="space-y-3">
              <li v-for="(step, index) in steps" :key="index" class="flex gap-3">
                <span
                  class="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-emerald-400"
                >
                  {{ index + 1 }}
                </span>
                <p class="pt-0.5 text-sm leading-relaxed text-neutral-200">
                  {{ step }}
                </p>
              </li>
            </ol>

            <p
              v-if="live.phoneUrl.value"
              class="break-all rounded-lg bg-neutral-950 px-3 py-2 font-mono text-[11px] text-neutral-400 select-all"
            >
              {{ live.phoneUrl.value }}
            </p>

            <div
              v-if="isInsecure"
              class="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-200"
              role="note"
            >
              <UIcon name="i-lucide-shield-alert" class="mt-0.5 size-4 shrink-0" />
              <span>
                ตอนนี้เปิดแบบ http — บนมือถือจะใช้ GPS, เซนเซอร์ และ Bluetooth ไม่ได้
                ถ้าแอปใช้สิ่งเหล่านี้ ให้ปิด dev server แล้วรัน
                <code class="rounded bg-black/30 px-1 font-mono text-amber-100">bun run dev:https</code>
                เปิด editor ที่ <span class="font-mono">https://localhost:3000</span> แล้วสแกนใหม่
                (มือถือจะเตือนเรื่องใบรับรอง ให้กด “ขั้นสูง → ดำเนินการต่อ” ครั้งแรกครั้งเดียว)
              </span>
            </div>

            <p class="text-xs leading-relaxed text-neutral-400">
              มือถือจะแสดงหน้าตาตาม OS ของเครื่อง (Android หรือ iPhone)
              และหน้าออกแบบบนคอมจะสลับเป็น <b class="text-neutral-200">{{ deviceLabel }}</b> ให้ตรงกับมือถือที่ต่ออยู่
            </p>

            <label
              v-if="live.isLoopback.value && live.lanAddresses.value.length > 1"
              class="flex items-center gap-2 text-xs text-neutral-400"
            >
              <span class="shrink-0">เครือข่าย</span>
              <select
                v-model="live.selectedAddress.value"
                class="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono text-xs text-neutral-200"
              >
                <option
                  v-for="item in live.lanAddresses.value"
                  :key="item.address"
                  :value="item.address"
                >
                  {{ item.address }} ({{ item.name }})
                </option>
              </select>
            </label>

            <!-- Connection status -->
            <div class="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
              <p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                สถานะ
              </p>
              <div
                v-if="live.clients.value.length === 0"
                class="flex items-center gap-2 text-sm text-neutral-400"
              >
                <span class="relative flex size-2">
                  <span class="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60 motion-reduce:animate-none" />
                  <span class="relative inline-flex size-2 rounded-full bg-amber-400" />
                </span>
                รอมือถือเชื่อมต่อ…
              </div>
              <ul v-else class="space-y-1.5">
                <li
                  v-for="client in live.clients.value"
                  :key="client.id"
                  class="flex items-center gap-2 text-sm text-neutral-200"
                >
                  <span class="size-2 rounded-full bg-emerald-400" />
                  <UIcon
                    :name="client.platform === 'other' ? 'i-lucide-monitor' : 'i-lucide-smartphone'"
                    class="size-4 text-neutral-400"
                  />
                  {{ platformLabel(client.platform) }}
                  <span class="text-xs text-neutral-500">เชื่อมต่อแล้ว</span>
                </li>
              </ul>
              <p v-if="live.errorMessage.value" class="mt-2 text-xs text-red-400">
                {{ live.errorMessage.value }}
              </p>
            </div>

            <!-- Phone console -->
            <div v-if="live.logs.value.length" class="rounded-xl border border-neutral-800 bg-neutral-950/60">
              <div class="flex items-center justify-between px-3 pt-2">
                <p class="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                  Console จากมือถือ
                </p>
                <button
                  type="button"
                  class="text-[11px] text-neutral-500 hover:text-neutral-300"
                  @click="live.clearLogs()"
                >
                  ล้าง
                </button>
              </div>
              <div class="max-h-32 overflow-y-auto px-3 pb-2 pt-1 font-mono text-[11px]">
                <p
                  v-for="entry in live.logs.value"
                  :key="entry.seq"
                  class="break-words leading-relaxed"
                  :class="logClass(entry.type)"
                >
                  {{ entry.message }}
                </p>
              </div>
            </div>

            <details class="group text-xs text-neutral-400">
              <summary class="cursor-pointer select-none text-neutral-300 hover:text-white">
                สแกนแล้วเปิดไม่ขึ้น?
              </summary>
              <ul class="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                <li>มือถือกับคอมพิวเตอร์ต้องต่อ Wi‑Fi วงเดียวกัน (Wi‑Fi โรงเรียนบางที่กั้นเครื่องไม่ให้คุยกัน ลองใช้ฮอตสปอตจากมือถือแทน)</li>
                <li>Mac: ถ้ามีหน้าต่าง Firewall ถามว่าให้ node/bun รับการเชื่อมต่อไหม ให้กด Allow</li>
                <li>Dev server ต้องรันด้วย <code class="font-mono text-neutral-300">host: 0.0.0.0</code> (ตั้งไว้ใน nuxt.config แล้ว)</li>
                <li>ลองพิมพ์ลิงก์ด้านบนในเบราว์เซอร์มือถือเอง หรือเปิด <span class="font-mono text-neutral-300">/live</span> แล้วกรอกรหัส</li>
              </ul>
            </details>
          </div>
        </div>

        <footer class="flex items-center justify-between gap-2 border-t border-neutral-800 px-5 py-3">
          <UButton
            label="หยุดเชื่อมต่อ"
            icon="i-lucide-unplug"
            color="error"
            variant="ghost"
            size="sm"
            :disabled="!live.code.value"
            @click="stopSession"
          />
          <UButton label="เสร็จ" color="primary" size="sm" @click="emit('close')" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import QRCode from "qrcode";

import { useEditorStore } from "~/composables/useEditorStore";
import { useLiveCompanion } from "~/composables/useLiveCompanion";
import { getPreviewDevice } from "~/composables/usePreviewDevices";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const live = useLiveCompanion();
const store = useEditorStore();
const isInsecure = computed(() => import.meta.client && window.location.protocol === "http:");
const deviceLabel = computed(() => getPreviewDevice(store.activeDeviceId.value).label);
const qrDataUrl = ref("");
const copied = ref(false);

const steps = computed(() => [
  "ต่อมือถือ Android (หรือ iPhone) เข้า Wi‑Fi เดียวกับคอมพิวเตอร์เครื่องนี้",
  "เปิดกล้องมือถือ สแกน QR ทางซ้าย แล้วแตะลิงก์ที่ขึ้นมา",
  "แก้หน้าจอหรือโค้ดในคอมได้เลย มือถือจะเปลี่ยนตามเองภายในไม่ถึงวินาที",
]);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void live.start();
      void live.loadNetwork();
    }
  },
  { immediate: true },
);

watch(
  live.phoneUrl,
  async (url) => {
    if (!import.meta.client || !url) {
      qrDataUrl.value = "";
      return;
    }
    qrDataUrl.value = await QRCode.toDataURL(url, { width: 400, margin: 1 });
  },
  { immediate: true },
);

function platformLabel(platform: string) {
  if (platform === "android") return "Android";
  if (platform === "ios") return "iPhone / iPad";
  return "เบราว์เซอร์";
}

function logClass(type: string) {
  if (type === "error") return "text-red-400";
  if (type === "warn") return "text-amber-400";
  if (type === "success") return "text-emerald-400";
  return "text-neutral-400";
}

async function copyUrl() {
  if (!live.phoneUrl.value) return;
  try {
    await navigator.clipboard.writeText(live.phoneUrl.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    copied.value = false;
  }
}

function stopSession() {
  live.stop();
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="close"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="build-apk-title"
        class="flex max-h-[calc(100vh-2rem)] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl"
      >
        <header class="flex items-start gap-3 border-b border-neutral-800 px-5 py-4">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime-600">
            <UIcon name="i-lucide-package" class="size-5 text-white" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 id="build-apk-title" class="text-base font-semibold text-white">Build APK</h2>
            <p class="text-xs text-neutral-400">
              สร้างแอปจริงแล้วติดตั้งลงมือถือ Android ผ่านสาย USB หรือ Wi‑Fi
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label="Close"
            @click="close"
          >
            <UIcon name="i-lucide-x" class="size-4" />
          </button>
        </header>

        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-sm">
          <p v-if="saveError" class="text-red-400" role="alert">{{ saveError }}</p>

          <!-- The app that will be built: name + icon from "แอปของฉัน" -->
          <div v-if="!job" class="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
            <EditorAppIconTile :icon="store.appIcon.value" :size="40" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-white">{{ appDisplayName }}</p>
              <p class="text-xs text-neutral-400">ชื่อและไอคอนที่จะเห็นบนมือถือ</p>
            </div>
            <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-pencil" data-testid="apk-edit-app" @click="emit('edit-app')">
              เปลี่ยน
            </UButton>
          </div>

          <!-- ── Phone status ── -->
          <section
            v-if="!job"
            class="rounded-xl border p-3"
            :class="phoneReady ? 'border-emerald-700/60 bg-emerald-500/10' : 'border-neutral-800 bg-neutral-950/60'"
            aria-live="polite"
          >
            <div class="flex items-center gap-2">
              <UIcon
                :name="phoneReady ? 'i-lucide-smartphone' : 'i-lucide-usb'"
                class="size-4"
                :class="phoneReady ? 'text-emerald-400' : 'text-neutral-400'"
              />
              <p class="flex-1 font-medium" :class="phoneReady ? 'text-emerald-200' : 'text-neutral-200'">
                {{ phoneHeadline }}
              </p>
              <button
                type="button"
                class="rounded-md px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-white"
                @click="refreshDevices"
              >
                ตรวจใหม่
              </button>
            </div>

            <ol
              v-if="devicesState === 'none'"
              class="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-neutral-400"
            >
              <li>มือถือ: ตั้งค่า → เกี่ยวกับโทรศัพท์ → แตะ “หมายเลขบิลด์” 7 ครั้ง</li>
              <li>ตั้งค่า → ตัวเลือกสำหรับนักพัฒนา → เปิด “การแก้ไขข้อบกพร่อง USB”</li>
              <li>เสียบสาย USB แล้วกด “อนุญาต” ที่หน้าจอมือถือ</li>
            </ol>

            <!-- Wireless debugging: same one-click install, no cable -->
            <details
              v-if="devicesState === 'none'"
              class="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-2.5 text-xs"
              data-testid="apk-wireless"
              @toggle="onWirelessToggle"
            >
              <summary class="cursor-pointer select-none font-medium text-neutral-200 hover:text-white">
                ไม่อยากเสียบสาย? เชื่อมผ่าน Wi‑Fi (Android 11 ขึ้นไป)
              </summary>

              <!-- Pair with QR code: scan once, then every build installs over Wi-Fi -->
              <div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start" data-testid="apk-wireless-qr">
                <div class="flex size-36 shrink-0 items-center justify-center self-center rounded-lg bg-white p-1 sm:self-start">
                  <img v-if="pairQr" :src="pairQr" alt="QR จับคู่มือถือผ่าน Wi‑Fi" class="size-full" >
                  <UIcon v-else name="i-lucide-loader-circle" class="size-6 animate-spin text-neutral-400 motion-reduce:animate-none" />
                </div>
                <div class="min-w-0 flex-1 space-y-2">
                  <ol class="list-decimal space-y-1 pl-5 leading-relaxed text-neutral-400">
                    <li>มือถือกับคอมต่อ Wi‑Fi วงเดียวกัน</li>
                    <li>มือถือ: ตัวเลือกสำหรับนักพัฒนา → <b class="text-neutral-200">การแก้ไขข้อบกพร่องแบบไร้สาย</b> → เปิด</li>
                    <li>แตะ <b class="text-neutral-200">จับคู่อุปกรณ์ด้วยคิวอาร์โค้ด</b> แล้วสแกน QR นี้ (ทำครั้งเดียวต่อมือถือ)</li>
                  </ol>
                  <p
                    v-if="pairStatus"
                    class="flex items-start gap-1.5 break-words leading-relaxed"
                    :class="{
                      'text-neutral-300': pairStatus === 'waiting' || pairStatus === 'connecting',
                      'text-emerald-300': pairStatus === 'connected',
                      'text-amber-300': pairStatus === 'failed' || pairStatus === 'expired',
                    }"
                    role="status"
                  >
                    <UIcon
                      v-if="pairStatus === 'waiting' || pairStatus === 'connecting'"
                      name="i-lucide-loader-circle"
                      class="mt-0.5 size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
                    />
                    <span>{{ pairStatusText }}</span>
                  </p>
                  <UButton
                    v-if="pairStatus === 'failed' || pairStatus === 'expired'"
                    size="xs"
                    color="neutral"
                    variant="subtle"
                    icon="i-lucide-refresh-cw"
                    @click="startQrPairing"
                  >
                    สร้าง QR ใหม่
                  </UButton>
                </div>
              </div>

              <!-- Fallback: some Wi-Fi blocks phones from being found (mDNS) -->
              <details class="mt-3 border-t border-neutral-800 pt-2">
                <summary class="cursor-pointer select-none text-neutral-400 hover:text-neutral-200">
                  สแกนแล้วไม่เจอ? กรอก IP กับรหัสเอง
                </summary>
                <ol class="mt-2 list-decimal space-y-1 pl-5 leading-relaxed text-neutral-400">
                  <li>แตะ <b class="text-neutral-200">จับคู่อุปกรณ์ด้วยรหัสการจับคู่</b> แล้วกรอก IP:พอร์ต กับรหัส 6 หลักที่ขึ้นบนมือถือ</li>
                </ol>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <UInput v-model="pairTarget" size="xs" placeholder="IP:พอร์ต จับคู่ เช่น 192.168.1.23:37099" class="min-w-0 flex-1" />
                  <UInput v-model="pairCode" size="xs" placeholder="รหัส 6 หลัก" inputmode="numeric" maxlength="6" class="w-28" />
                  <UButton size="xs" color="neutral" variant="subtle" :loading="wirelessBusy === 'pair'" @click="wireless('pair')">
                    จับคู่
                  </UButton>
                </div>
                <p class="mt-3 leading-relaxed text-neutral-400">
                  2. กลับไปหน้า “การแก้ไขข้อบกพร่องแบบไร้สาย” ดู <b class="text-neutral-200">IP และพอร์ต</b> (ตัวเลขนี้ต่างจากตอนจับคู่) แล้วกดเชื่อมต่อ
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <UInput v-model="connectTarget" size="xs" placeholder="IP:พอร์ต เช่น 192.168.1.23:41235" class="min-w-0 flex-1" />
                  <UButton size="xs" color="success" variant="subtle" :loading="wirelessBusy === 'connect'" @click="wireless('connect')">
                    เชื่อมต่อ
                  </UButton>
                </div>
                <p
                  v-if="wirelessMessage"
                  class="mt-2 break-words leading-relaxed"
                  :class="wirelessOk ? 'text-emerald-300' : 'text-amber-300'"
                  role="status"
                >
                  {{ wirelessMessage }}
                </p>
              </details>
            </details>
            <p v-else-if="devicesState === 'unauthorized'" class="mt-2 text-xs leading-relaxed text-amber-300">
              ดูที่หน้าจอมือถือ แล้วกด “อนุญาต” (ติ๊ก “อนุญาตจากคอมพิวเตอร์นี้เสมอ”)
            </p>
            <p v-else-if="devicesState === 'no-adb'" class="mt-2 text-xs leading-relaxed text-neutral-400">
              ยังไม่มีเครื่องมือ Android บนคอมนี้ — ติดตั้ง
              <a href="https://developer.android.com/studio" target="_blank" rel="noopener" class="text-lime-300 underline">Android Studio</a>
              แล้วเปิดครั้งแรกให้ติดตั้ง SDK (ทำครั้งเดียว ดู docs/build-apk.md)
              <span class="mt-1 block">
                ไม่อยากลง Android Studio? ใช้ Homebrew แทน (คัดลอกทั้งบรรทัดไปวางใน Terminal ทีเดียว):
                <span class="mt-1 flex items-start gap-1.5">
                  <code class="block flex-1 select-all break-all rounded bg-neutral-950 px-2 py-1.5 font-mono text-[11px] text-neutral-300">{{ BREW_SETUP_COMMAND }}</code>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="soft"
                    :icon="brewCopied ? 'i-lucide-check' : 'i-lucide-copy'"
                    :aria-label="brewCopied ? 'คัดลอกแล้ว' : 'คัดลอกคำสั่ง'"
                    @click="copyBrewCommand"
                  />
                </span>
                แล้วเปิด <code class="font-mono">bun run dev</code> ใหม่
              </span>
            </p>
          </section>

          <!-- ── Actions ── -->
          <div v-if="!job" class="flex flex-col gap-2 sm:flex-row">
            <UButton
              label="Build + ติดตั้งลงมือถือ"
              icon="i-lucide-smartphone"
              :color="phoneReady ? 'success' : 'neutral'"
              :variant="phoneReady ? 'solid' : 'soft'"
              size="md"
              class="flex-1 justify-center"
              :disabled="!saved || !phoneReady"
              data-testid="apk-build-install"
              @click="startBuild(true)"
            />
            <UButton
              label="Build ไฟล์ APK อย่างเดียว"
              icon="i-lucide-package"
              color="neutral"
              variant="subtle"
              size="md"
              class="flex-1 justify-center"
              :disabled="!saved || devicesState === 'no-adb' || devicesState === 'blocked'"
              @click="startBuild(false)"
            />
          </div>

          <!-- ── Progress ── -->
          <section v-if="job" class="space-y-3" aria-live="polite">
            <div class="flex items-center gap-2">
              <UIcon
                :name="statusIcon"
                class="size-5"
                :class="{
                  'animate-spin text-lime-400 motion-reduce:animate-none': job.status === 'running',
                  'text-emerald-400': job.status === 'done',
                  'text-red-400': job.status === 'error',
                }"
              />
              <p class="flex-1 font-medium text-white">{{ statusText }}</p>
              <span class="font-mono text-xs text-neutral-500">{{ elapsed }}</span>
            </div>

            <div class="h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                class="h-full rounded-full transition-[width] duration-500"
                :class="job.status === 'error' ? 'bg-red-500' : 'bg-lime-500'"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>

            <p v-if="job.status === 'error' && job.error" class="rounded-lg bg-red-500/10 p-2.5 text-xs leading-relaxed text-red-300" role="alert">
              {{ job.error }}
            </p>
            <p v-if="job.status === 'done' && job.apkPath" class="break-all text-xs text-neutral-400">
              ไฟล์: <span class="font-mono text-neutral-300">{{ job.apkPath }}</span>
            </p>

            <!-- Download to a phone over Wi-Fi (no sending the APK through chat apps) -->
            <div
              v-if="job.status === 'done' && downloadQr"
              class="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3"
              data-testid="apk-download-qr"
            >
              <img :src="downloadQr" alt="QR ดาวน์โหลด APK" class="size-28 shrink-0 rounded-lg bg-white p-1" >
              <div class="min-w-0 space-y-1 text-xs leading-relaxed text-neutral-400">
                <p class="font-medium text-neutral-200">
                  {{ job.install ? "ติดตั้งลงมือถือเครื่องอื่นด้วย?" : "ติดตั้งลงมือถือ: สแกน QR นี้" }}
                </p>
                <p>มือถือต่อ Wi‑Fi เดียวกับคอม → สแกน → ดาวน์โหลด → แตะไฟล์เพื่อติดตั้ง (ครั้งแรกให้อนุญาต “ติดตั้งแอปที่ไม่รู้จัก”)</p>
                <p class="break-all font-mono text-[10px] text-neutral-500">{{ downloadUrl }}</p>
              </div>
            </div>

            <details :open="job.status === 'error'" class="text-xs">
              <summary class="cursor-pointer select-none text-neutral-400 hover:text-white">ดู log</summary>
              <pre
                ref="logRef"
                class="mt-2 max-h-56 overflow-auto rounded-lg bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-neutral-300"
              >{{ logText }}</pre>
            </details>

            <div class="flex gap-2">
              <UButton
                v-if="job.status === 'running'"
                label="ยกเลิก"
                color="error"
                variant="ghost"
                size="sm"
                @click="cancelBuild"
              />
              <UButton
                v-else
                label="Build อีกครั้ง"
                icon="i-lucide-rotate-ccw"
                color="neutral"
                variant="subtle"
                size="sm"
                @click="resetJob"
              />
            </div>
          </section>

          <!-- ── Other ways ── -->
          <details v-if="saved" class="text-xs text-neutral-400">
            <summary class="cursor-pointer select-none hover:text-white">วิธีอื่น (Terminal / GitHub)</summary>
            <div class="mt-2 space-y-2 leading-relaxed">
              <p>
                Terminal ที่โฟลเดอร์ codecraftapp:
                <code class="font-mono text-lime-300">bun run build:apk {{ saved.slug }} --install</code>
              </p>
              <p>
                ไม่มี Android Studio: push โฟลเดอร์
                <span class="font-mono text-neutral-300">exports/apk/{{ saved.slug }}/</span>
                ขึ้น GitHub → Actions → Build CodeCraft APK → ใส่ <span class="font-mono text-neutral-300">{{ saved.slug }}</span>
              </p>
            </div>
          </details>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

import QRCode from "qrcode";

import { useEditorStore } from "~/composables/useEditorStore";
import { renderAppIconPngs } from "~/utils/renderAppIcon";

interface UsbDevice {
  serial: string;
  state: string;
  model: string;
}

interface BuildStatus {
  id: string;
  status: "running" | "done" | "error";
  step: number;
  totalSteps: number;
  install: boolean;
  error: string | null;
  apkPath: string | null;
  lineCount: number;
  lines: string[];
  startedAt: number;
  finishedAt: number | null;
}

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void; (e: "edit-app"): void }>();

const store = useEditorStore();
const appDisplayName = computed(() =>
  store.projectName.value === "Untitled Project" ? "แอปของฉัน" : store.projectName.value,
);

// One line chained with && so it still works when pasted as a single line.
// openjdk@21 is keg-only, so sdkmanager needs JAVA_HOME pointed at it.
const BREW_SETUP_COMMAND =
  'brew install openjdk@21 && brew install --cask android-commandlinetools && export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" && yes | sdkmanager --licenses && sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"';
const brewCopied = ref(false);
async function copyBrewCommand() {
  try {
    await navigator.clipboard.writeText(BREW_SETUP_COMMAND);
    brewCopied.value = true;
    setTimeout(() => (brewCopied.value = false), 1500);
  } catch {
    // clipboard blocked — the command is select-all, so it can still be copied by hand
  }
}
const saved = ref<{ slug: string; appName: string } | null>(null);
const saveError = ref("");
const adbAvailable = ref(true);
const devices = ref<UsbDevice[]>([]);
const job = ref<BuildStatus | null>(null);
const logLines = ref<string[]>([]);
const logRef = ref<HTMLElement | null>(null);
const now = ref(Date.now());

let devicePoll: ReturnType<typeof setInterval> | null = null;
let jobPoll: ReturnType<typeof setInterval> | null = null;
let clock: ReturnType<typeof setInterval> | null = null;

const readyDevice = computed(() => devices.value.find((d) => d.state === "device") ?? null);
const phoneReady = computed(() => Boolean(readyDevice.value));
// Device check refused by the server (e.g. 403) — not the same as "no adb"
const deviceError = ref("");
const devicesState = computed(() => {
  if (deviceError.value) return "blocked";
  if (!adbAvailable.value) return "no-adb";
  if (readyDevice.value) return "ready";
  if (devices.value.some((d) => d.state === "unauthorized")) return "unauthorized";
  return "none";
});
const phoneHeadline = computed(() => {
  if (devicesState.value === "ready") return `เจอมือถือ: ${readyDevice.value!.model || readyDevice.value!.serial}`;
  if (devicesState.value === "unauthorized") return "เจอมือถือแล้ว แต่ยังไม่ได้กดอนุญาต";
  if (devicesState.value === "blocked") return deviceError.value;
  if (devicesState.value === "no-adb") return "ยังไม่ได้ติดตั้งเครื่องมือ Android";
  return "ยังไม่เจอมือถือที่เสียบสาย";
});

const STEP_LABELS: Record<number, string> = {
  1: "สร้างเว็บแอป",
  2: "เตรียมโปรเจกต์ Android",
  3: "ติดตั้ง Capacitor",
  4: "สร้างโฟลเดอร์ android",
  5: "sync",
  6: "build APK (Gradle — ครั้งแรกนาน 5–10 นาที)",
  7: "ติดตั้งลงมือถือ",
};

const statusText = computed(() => {
  if (!job.value) return "";
  if (job.value.status === "done") {
    return job.value.install ? "ติดตั้งและเปิดแอปบนมือถือแล้ว" : "build เสร็จแล้ว";
  }
  if (job.value.status === "error") return "build ไม่สำเร็จ";
  const step = job.value.step;
  return step ? `ขั้น ${step}/${job.value.totalSteps}: ${STEP_LABELS[step] ?? ""}` : "กำลังเริ่ม…";
});
const statusIcon = computed(() => {
  if (job.value?.status === "done") return "i-lucide-circle-check";
  if (job.value?.status === "error") return "i-lucide-circle-x";
  return "i-lucide-loader-circle";
});
const progressPercent = computed(() => {
  if (!job.value) return 0;
  if (job.value.status === "done") return 100;
  return Math.max(4, Math.round(((job.value.step - 0.5) / job.value.totalSteps) * 100));
});
const elapsed = computed(() => {
  if (!job.value) return "";
  const end = job.value.finishedAt ?? now.value;
  const seconds = Math.max(0, Math.round((end - job.value.startedAt) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
});
const logText = computed(() => logLines.value.slice(-400).join("\n"));

async function save() {
  saveError.value = "";
  saved.value = null;
  try {
    saved.value = await $fetch<{ slug: string; appName: string }>("/api/export/apk/save", {
      method: "POST",
      body: {
        appName: appDisplayName.value,
        projectId: store.projectId.value,
        icon: await renderAppIconPngs(store.appIcon.value),
        pages: store.pages.value,
        // design-time state even if Run mode is active
        elements: store.elementSnapshot.value ?? store.elements.value,
        jsCodeByPage: store.jsCodeByPage.value,
        startPageId: store.pages.value[0]?.id ?? store.currentPageId.value,
        activeDeviceId: store.activeDeviceId.value,
      },
    });
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : "บันทึกแอปไม่สำเร็จ";
  }
}

async function refreshDevices() {
  try {
    const result = await $fetch<{ adb: boolean; devices: UsbDevice[] }>("/api/export/apk/devices");
    deviceError.value = "";
    adbAvailable.value = result.adb;
    devices.value = result.devices;
  } catch (error) {
    const { statusCode, statusMessage } = error as { statusCode?: number; statusMessage?: string };
    if (statusCode === 403) deviceError.value = statusMessage || "ใช้ได้จากคอมพิวเตอร์เครื่องนี้เท่านั้น";
    else adbAvailable.value = false;
  }
}

async function pollJob() {
  if (!job.value) return;
  try {
    const result = await $fetch<BuildStatus>(`/api/export/apk/build/${job.value.id}`, {
      query: { after: logLines.value.length },
    });
    logLines.value = [...logLines.value, ...result.lines];
    job.value = result;
    if (result.status !== "running") stopJobPoll();
    await nextTick();
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight;
  } catch {
    // dev server restarting — keep polling
  }
}

function stopJobPoll() {
  if (jobPoll) clearInterval(jobPoll);
  jobPoll = null;
  if (clock) clearInterval(clock);
  clock = null;
}

async function startBuild(install: boolean) {
  if (!saved.value) return;
  await save(); // always build the latest version of the app
  if (!saved.value) return;
  try {
    const { id } = await $fetch<{ id: string }>("/api/export/apk/build", {
      method: "POST",
      body: { slug: saved.value.slug, install },
    });
    logLines.value = [];
    job.value = {
      id,
      status: "running",
      step: 0,
      totalSteps: install ? 7 : 6,
      install,
      error: null,
      apkPath: null,
      lineCount: 0,
      lines: [],
      startedAt: Date.now(),
      finishedAt: null,
    };
    stopDevicePoll();
    jobPoll = setInterval(() => void pollJob(), 1000);
    clock = setInterval(() => (now.value = Date.now()), 1000);
  } catch (error) {
    const message = (error as { statusMessage?: string })?.statusMessage;
    saveError.value = message || "เริ่ม build ไม่ได้";
  }
}

async function cancelBuild() {
  if (!job.value) return;
  await $fetch(`/api/export/apk/build/${job.value.id}`, { method: "DELETE" }).catch(() => undefined);
}

function resetJob() {
  job.value = null;
  logLines.value = [];
  startDevicePoll();
}

function startDevicePoll() {
  stopDevicePoll();
  void refreshDevices();
  devicePoll = setInterval(() => void refreshDevices(), 3000);
}

function stopDevicePoll() {
  if (devicePoll) clearInterval(devicePoll);
  devicePoll = null;
}

// ── Wireless debugging (adb pair / connect) ───────────────────────────────
const WIRELESS_KEY = "codecraft-adb-wireless";
const pairTarget = ref("");
const pairCode = ref("");
const connectTarget = ref(readSaved());
const wirelessBusy = ref<"" | "pair" | "connect">("");
const wirelessMessage = ref("");
const wirelessOk = ref(false);

function readSaved() {
  try {
    return (import.meta.client && localStorage.getItem(WIRELESS_KEY)) || "";
  } catch {
    return "";
  }
}

async function wireless(action: "pair" | "connect", quiet = false) {
  const target = (action === "pair" ? pairTarget.value : connectTarget.value).trim();
  if (!target) return;
  wirelessBusy.value = action;
  if (!quiet) wirelessMessage.value = "";
  try {
    const result = await $fetch<{ ok: boolean; output: string }>("/api/export/apk/wireless", {
      method: "POST",
      body: { action, target, code: pairCode.value },
    });
    if (quiet && !result.ok) return;
    wirelessOk.value = result.ok;
    if (action === "pair") {
      wirelessMessage.value = result.ok
        ? "จับคู่สำเร็จ ✓ ต่อไปกรอก IP:พอร์ต จากหน้าหลัก แล้วกดเชื่อมต่อ"
        : `จับคู่ไม่สำเร็จ: ${result.output || "ลองขอรหัสใหม่บนมือถือ"}`;
      if (result.ok) {
        // usually the same IP; only the port differs
        const host = target.split(":")[0];
        if (!connectTarget.value) connectTarget.value = `${host}:`;
      }
    } else {
      wirelessMessage.value = result.ok
        ? "เชื่อมต่อแล้ว ✓ กด Build + ติดตั้งลงมือถือ ได้เลย"
        : `เชื่อมต่อไม่ได้: ${result.output || "เช็ค IP:พอร์ต อีกครั้ง"}`;
      if (result.ok) {
        try {
          localStorage.setItem(WIRELESS_KEY, target);
        } catch {
          // storage blocked — only the shortcut is lost
        }
      }
    }
    await refreshDevices();
  } catch (error) {
    if (quiet) return;
    wirelessOk.value = false;
    wirelessMessage.value = (error as { statusMessage?: string })?.statusMessage || "ทำไม่สำเร็จ";
  } finally {
    wirelessBusy.value = "";
  }
}

// ── Wireless pairing by QR (like Android Studio) ──────────────────────────
// The phone scans this in Wireless debugging; the server then finds it on the
// Wi-Fi (mDNS), pairs and connects — nothing to type.
type PairStatus = "" | "waiting" | "connecting" | "connected" | "failed" | "expired";
const pairQr = ref("");
const pairStatus = ref<PairStatus>("");
const pairMessage = ref("");
let pairId = "";
let pairPoll: ReturnType<typeof setInterval> | null = null;

async function startQrPairing() {
  stopQrPairing();
  pairQr.value = "";
  pairMessage.value = "";
  pairStatus.value = "waiting";
  try {
    const { id, qr } = await $fetch<{ id: string; qr: string }>("/api/export/apk/wireless/qr", {
      method: "POST",
    });
    pairId = id;
    pairQr.value = await QRCode.toDataURL(qr, { width: 280, margin: 1 });
    pairPoll = setInterval(() => void pollQrPairing(), 2000);
  } catch (error) {
    pairStatus.value = "failed";
    pairMessage.value = (error as { statusMessage?: string })?.statusMessage || "สร้าง QR ไม่ได้";
  }
}

async function pollQrPairing() {
  if (!pairId) return;
  try {
    const result = await $fetch<{ status: PairStatus; message: string }>(
      `/api/export/apk/wireless/qr/${pairId}`,
    );
    pairStatus.value = result.status;
    pairMessage.value = result.message;
    if (result.status === "waiting" || result.status === "connecting") return;
    stopQrPairing();
    if (result.status === "connected") await refreshDevices();
  } catch (error) {
    stopQrPairing();
    pairStatus.value = "failed";
    pairMessage.value = (error as { statusMessage?: string })?.statusMessage || "จับคู่ไม่สำเร็จ";
  }
}

function stopQrPairing() {
  if (pairPoll) clearInterval(pairPoll);
  pairPoll = null;
}

const pairStatusText = computed(() => {
  if (pairStatus.value === "waiting") return "รอสแกน QR…";
  if (pairStatus.value === "connecting") return pairMessage.value || "จับคู่แล้ว กำลังเชื่อมต่อ…";
  if (pairStatus.value === "connected") return "เชื่อมต่อแล้ว ✓ กด Build + ติดตั้งลงมือถือ ได้เลย";
  return pairMessage.value;
});

function onWirelessToggle(event: Event) {
  const isOpen = (event.target as HTMLDetailsElement).open;
  if (isOpen && !pairQr.value && pairStatus.value === "") void startQrPairing();
}

// ── Download QR (after a build) ───────────────────────────────────────────
const downloadUrl = ref("");
const downloadQr = ref("");

async function makeDownloadQr(slug: string) {
  downloadUrl.value = "";
  downloadQr.value = "";
  try {
    let base = window.location.origin;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) {
      const net = await $fetch<{ port: number; addresses: { address: string }[] }>("/api/live/network");
      const address = net.addresses[0]?.address;
      if (!address) return;
      base = `${window.location.protocol}//${address}:${window.location.port || net.port}`;
    }
    downloadUrl.value = `${base}/api/export/apk/download/${slug}.apk`;
    downloadQr.value = await QRCode.toDataURL(downloadUrl.value, { width: 320, margin: 1 });
  } catch {
    downloadQr.value = "";
  }
}

watch(
  () => job.value?.status,
  (status) => {
    if (status === "done" && saved.value) void makeDownloadQr(saved.value.slug);
    else if (status !== "done") downloadQr.value = "";
  },
);

function close() {
  // A running build keeps going on the computer; reopening shows a fresh dialog.
  emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (!job.value || job.value.status !== "running") {
        job.value = null;
        logLines.value = [];
        void save();
        startDevicePoll();
        // reconnect the last wireless phone (quietly; its port may have changed)
        if (connectTarget.value) void wireless("connect", true);
      } else {
        jobPoll ??= setInterval(() => void pollJob(), 1000);
      }
    } else {
      stopDevicePoll();
      stopQrPairing();
    }
  },
);

onBeforeUnmount(() => {
  stopDevicePoll();
  stopJobPoll();
  stopQrPairing();
});
</script>

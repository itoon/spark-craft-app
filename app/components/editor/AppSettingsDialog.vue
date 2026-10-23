<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="close"
      @keydown.esc="close"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
        class="flex max-h-[calc(100vh-2rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl"
        data-testid="app-settings"
      >
        <header class="flex items-center gap-3 border-b border-neutral-800 px-5 py-4">
          <h2 id="app-settings-title" class="flex-1 text-lg font-semibold text-white">แอปของฉัน</h2>
          <button
            type="button"
            class="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label="ปิด"
            @click="close"
          >
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </header>

        <div class="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <!-- Preview: how it looks on the phone's home screen -->
          <div
            class="flex items-center justify-center gap-6 rounded-xl bg-gradient-to-br from-teal-600 via-cyan-800 to-slate-800 py-6"
            aria-label="ตัวอย่างบนหน้าจอมือถือ"
          >
            <div class="flex w-24 flex-col items-center gap-2">
              <EditorAppIconTile :icon="store.appIcon.value" :size="72" />
              <span class="w-full truncate text-center text-xs font-medium text-white drop-shadow">
                {{ draftName.trim() || "แอปของฉัน" }}
              </span>
            </div>
          </div>

          <!-- Name -->
          <label class="block">
            <span class="mb-1.5 block text-sm font-semibold text-neutral-200">ชื่อแอป</span>
            <UInput
              v-model="draftName"
              size="xl"
              maxlength="30"
              placeholder="เช่น เกมแตะเร็ว"
              class="w-full"
              data-testid="app-name-input"
              @blur="commitName"
              @keydown.enter.prevent="commitName"
            />
            <span class="mt-1 block text-xs text-neutral-500">ชื่อนี้จะอยู่ใต้ไอคอนบนมือถือ</span>
          </label>

          <!-- Icon: emoji -->
          <fieldset>
            <legend class="mb-2 text-sm font-semibold text-neutral-200">เลือกไอคอน</legend>
            <div class="grid grid-cols-6 gap-2 sm:grid-cols-9">
              <button
                v-for="emoji in ICON_EMOJIS"
                :key="emoji"
                type="button"
                class="flex aspect-square items-center justify-center rounded-xl border-2 text-2xl transition-colors"
                :class="!store.appIcon.value.image && store.appIcon.value.emoji === emoji
                  ? 'border-lime-400 bg-neutral-800'
                  : 'border-transparent bg-neutral-800/60 hover:bg-neutral-800'"
                :aria-label="`ไอคอน ${emoji}`"
                :aria-pressed="!store.appIcon.value.image && store.appIcon.value.emoji === emoji"
                @click="update({ emoji, image: null })"
              >
                {{ emoji }}
              </button>
              <!-- Own picture -->
              <button
                type="button"
                class="col-span-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-2 py-2.5 text-sm font-medium transition-colors"
                :class="store.appIcon.value.image
                  ? 'border-lime-400 bg-neutral-800 text-lime-200'
                  : 'border-neutral-600 text-neutral-300 hover:border-neutral-400 hover:text-white'"
                data-testid="app-icon-upload"
                @click="fileInput?.click()"
              >
                <UIcon name="i-lucide-image-plus" class="size-4 shrink-0" />
                {{ store.appIcon.value.image ? "เปลี่ยนรูป" : "ใช้รูปของฉัน" }}
              </button>
            </div>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPickImage" >
            <p v-if="imageError" class="mt-2 text-xs text-amber-300" role="alert">{{ imageError }}</p>
          </fieldset>

          <!-- Background colour (emoji icons only) -->
          <fieldset v-if="!store.appIcon.value.image">
            <legend class="mb-2 text-sm font-semibold text-neutral-200">สีพื้นหลัง</legend>
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="color in ICON_COLORS"
                :key="color"
                type="button"
                class="size-9 rounded-full ring-offset-2 ring-offset-neutral-900 transition-shadow"
                :class="store.appIcon.value.color === color ? 'ring-2 ring-lime-400' : 'hover:ring-2 hover:ring-neutral-500'"
                :style="{ backgroundColor: color }"
                :aria-label="`สี ${color}`"
                :aria-pressed="store.appIcon.value.color === color"
                @click="update({ color })"
              />
            </div>
          </fieldset>
          <button
            v-else
            type="button"
            class="text-sm text-neutral-400 underline-offset-2 hover:text-white hover:underline"
            @click="update({ image: null })"
          >
            เอารูปออก กลับไปใช้ไอคอนแบบเลือก
          </button>
        </div>

        <footer class="border-t border-neutral-800 px-5 py-4">
          <UButton
            label="เสร็จแล้ว"
            color="success"
            size="lg"
            block
            data-testid="app-settings-done"
            @click="close"
          />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

import { useEditorStore } from "~/composables/useEditorStore";
import { ICON_COLORS, ICON_EMOJIS, type AppIcon } from "~/utils/appIcon";
import { shrinkImageFile } from "~/utils/renderAppIcon";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const store = useEditorStore();
const draftName = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const imageError = ref("");

// "Untitled Project" is the editor's placeholder — show an empty box instead
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    const name = store.projectName.value;
    draftName.value = name === "Untitled Project" ? "" : name;
    imageError.value = "";
  },
);

function update(patch: Partial<AppIcon>) {
  store.setAppIcon({ ...store.appIcon.value, ...patch });
}

function commitName() {
  store.setProjectName(draftName.value);
}

async function onPickImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  imageError.value = "";
  if (!file.type.startsWith("image/")) {
    imageError.value = "เลือกไฟล์รูปภาพนะ (เช่น .png หรือ .jpg)";
    return;
  }
  try {
    update({ image: await shrinkImageFile(file) });
  } catch {
    imageError.value = "เปิดรูปนี้ไม่ได้ ลองรูปอื่นดูนะ";
  }
}

function close() {
  commitName();
  emit("close");
}
</script>

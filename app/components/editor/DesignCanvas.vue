<template>
  <!-- Outer workspace — dark background, scrollable when device is larger than available space -->
  <div
    ref="workspaceRef"
    class="design-canvas-workspace flex-1 flex flex-col items-center overflow-auto bg-neutral-950 p-4 gap-4"
    @click.self="store.selectElement(null)"
  >
    <div
      class="flex items-center gap-1 shrink-0 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5"
    >
      <button
        v-for="d in DEVICES"
        :key="d.id"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-100"
        :class="
          store.activeDeviceId.value === d.id
            ? 'bg-indigo-600 text-white'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
        "
        @click="store.setActiveDevice(d.id)"
      >
        <UIcon :name="d.icon" class="size-3.5" />
        {{ d.label }}
      </button>
    </div>

    <!-- ─── Page management ────────────────────────────────────────────── -->
    <div
      class="flex items-center gap-2 shrink-0 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1"
    >
      <UButton
        icon="i-lucide-minus"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        :disabled="store.pages.value.length <= 1"
        @click="store.deletePage(store.currentPageId.value)"
        title="Delete Current Page"
      />

      <div class="flex items-center gap-2 px-2 border-x border-neutral-700">
        <UIcon name="i-lucide-file-text" class="size-3 text-indigo-400" />

        <input
          v-if="isEditingPageName"
          ref="pageNameInput"
          v-model="editingName"
          class="bg-neutral-800 text-white text-[11px] font-medium outline-none rounded px-1 py-0.5 w-24"
          @blur="savePageName"
          @keydown.enter="savePageName"
          @keydown.esc="isEditingPageName = false"
        />
        <div
          v-else
          class="flex items-center gap-1 cursor-pointer group"
          data-testid="page-label"
          @click="startEditingPageName"
        >
          <span
            class="text-[11px] font-medium text-neutral-200 min-w-[40px] text-center"
          >
            {{
              store.pages.value.find((p) => p.id === store.currentPageId.value)
                ?.name
            }}
          </span>
          <UIcon
            name="i-lucide-edit-2"
            class="size-2.5 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>

        <!-- Small page switcher if multiple pages exist -->
        <UPopover v-if="store.pages.value.length > 1">
          <UButton
            icon="i-lucide-chevron-down"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            data-testid="page-switcher"
          />
          <template #content>
            <div
              class="p-1 min-w-[120px] bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl"
            >
              <button
                v-for="page in store.pages.value"
                :key="page.id"
                class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-colors"
                :class="
                  store.currentPageId.value === page.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-neutral-400 hover:bg-neutral-700 hover:text-white'
                "
                data-testid="page-option"
                @click="store.switchPage(page.id)"
              >
                <UIcon name="i-lucide-file" class="size-3" />
                {{ page.name }}
              </button>
            </div>
          </template>
        </UPopover>
      </div>

      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        data-testid="add-page-button"
        @click="store.addPage"
        title="Add New Page"
      />
    </div>

    <div v-if="isClientReady" class="shrink-0">
      <PreviewDeviceFrame
        :device="activeDevice"
        ceFrame
        @screen-click="store.selectElement(null)"
      >
        <div
          class="absolute inset-0 overflow-y-auto overflow-x-hidden"
          @click.self="store.selectElement(null)"
        >
          <EditorCanvasContent />
        </div>
      </PreviewDeviceFrame>
    </div>
    <div
      v-else
      class="shrink-0 rounded-[36px] border border-neutral-800 bg-neutral-900/50"
      :style="{
        width: `${activeDevice.totalW}px`,
        height: `${activeDevice.totalH}px`,
      }"
    />

    <!-- Canvas size label -->
    <div class="text-[10px] text-neutral-600 font-mono shrink-0 mt-2">
      {{ activeDevice.canvasW }} × {{ activeDevice.canvasH }} ·
      {{ activeDevice.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useEditorStore } from "~/composables/useEditorStore";
import { PREVIEW_DEVICES } from "~/composables/usePreviewDevices";

const store = useEditorStore();

// ─── Page Name Editing ────────────────────────────────────────────────────

const isEditingPageName = ref(false);
const editingName = ref("");
const pageNameInput = ref<HTMLInputElement | null>(null);

function startEditingPageName() {
  const currentPage = store.pages.value.find(
    (p) => p.id === store.currentPageId.value,
  );
  if (!currentPage) return;

  editingName.value = currentPage.name;
  isEditingPageName.value = true;
  nextTick(() => {
    pageNameInput.value?.focus();
    pageNameInput.value?.select();
  });
}

function savePageName() {
  if (editingName.value.trim()) {
    store.renamePage(store.currentPageId.value, editingName.value.trim());
  }
  isEditingPageName.value = false;
}

// ─── Device definitions ───────────────────────────────────────────────────

const DEVICES = PREVIEW_DEVICES;

const activeDevice = computed(
  () => DEVICES.find((d) => d.id === store.activeDeviceId.value) ?? DEVICES[0],
);

// ─── Client-mount gate ────────────────────────────────────────────────────

const workspaceRef = ref<HTMLElement | null>(null);
const isClientReady = ref(false);

onMounted(() => {
  isClientReady.value = true;
});
</script>

<template>
  <main class="flex min-h-dvh flex-col bg-neutral-950 px-6 py-10 text-white">
    <div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8">
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="flex size-14 items-center justify-center rounded-2xl bg-emerald-600">
          <UIcon name="i-lucide-smartphone" class="size-7 text-white" />
        </div>
        <h1 class="text-2xl font-bold">CodeCraft Live</h1>
        <p class="text-sm leading-relaxed text-neutral-400">
          กรอกรหัส 6 ตัวที่เห็นในหน้าต่าง “ทดสอบบนมือถือ” บนคอมพิวเตอร์
        </p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="connect">
        <label for="live-code" class="sr-only">รหัสเชื่อมต่อ</label>
        <input
          id="live-code"
          v-model="code"
          inputmode="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          maxlength="6"
          placeholder="ABC234"
          class="h-16 w-full rounded-2xl border-2 border-neutral-700 bg-neutral-900 text-center font-mono text-3xl font-bold uppercase tracking-[0.35em] text-white placeholder:text-neutral-700 focus:border-emerald-500 focus:outline-none"
        />
        <p v-if="error" class="text-center text-sm text-red-400" role="alert">{{ error }}</p>
        <button
          type="submit"
          class="h-14 rounded-2xl bg-emerald-600 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          :disabled="normalized.length !== 6 || checking"
        >
          {{ checking ? "กำลังเชื่อมต่อ…" : "เชื่อมต่อ" }}
        </button>
      </form>

      <p class="text-center text-xs leading-relaxed text-neutral-500">
        มือถือกับคอมพิวเตอร์ต้องต่อ Wi‑Fi วงเดียวกัน
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

useHead({ title: "CodeCraft Live" });

const code = ref("");
const error = ref("");
const checking = ref(false);
const normalized = computed(() => code.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));

async function connect() {
  if (normalized.value.length !== 6) return;
  checking.value = true;
  error.value = "";
  try {
    await $fetch(`/api/live/${normalized.value}`, { query: { wait: "0" } });
    await navigateTo(`/live/${normalized.value}`);
  } catch {
    error.value = "ไม่พบรหัสนี้ ลองดูรหัสบนคอมอีกครั้ง";
  } finally {
    checking.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[120] flex items-start justify-center bg-neutral-950/70 px-4 py-10 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        class="flex h-[min(80vh,720px)] w-[min(960px,96vw)] flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl"
      >
        <div class="border-b border-neutral-800 px-4 py-3">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-search" class="size-4 text-neutral-400" />
            <input
              ref="searchRef"
              v-model="query"
              type="text"
              class="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
              placeholder="Search components, attrs, methods, examples..."
              @keydown.esc="emit('close')"
            />
            <kbd
              class="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] font-mono text-neutral-400"
            >
              ESC
            </kbd>
          </div>
        </div>

        <div class="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)]">
          <div class="border-r border-neutral-800 overflow-y-auto">
            <button
              v-for="item in filteredItems"
              :key="item.key"
              type="button"
              class="w-full border-b border-neutral-800 px-4 py-3 text-left transition-colors"
              :class="
                activeKey === item.key
                  ? 'bg-indigo-500/15'
                  : 'hover:bg-neutral-800/70'
              "
              @click="activeKey = item.key"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium text-white">{{ item.title }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider"
                  :class="
                    item.kind === 'component'
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : 'bg-fuchsia-500/15 text-fuchsia-300'
                  "
                >
                  {{ item.kind }}
                </span>
              </div>
              <p class="mt-1 text-xs text-neutral-400">{{ item.subtitle }}</p>
            </button>
          </div>

          <div class="overflow-y-auto p-5">
            <template v-if="activeEntry">
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-semibold text-white">
                  {{ activeEntry.title }}
                </h2>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                  :class="
                    activeEntry.kind === 'component'
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : 'bg-fuchsia-500/15 text-fuchsia-300'
                  "
                >
                  {{ activeEntry.kind }}
                </span>
              </div>
              <p class="mt-1 text-sm text-neutral-400">{{ activeEntry.subtitle }}</p>

              <template v-if="activeEntry.kind === 'component'">
                <div class="mt-5 grid gap-5 lg:grid-cols-2">
                  <section>
                    <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Attrs
                    </h3>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="prop in activeEntry.schema.props"
                        :key="prop"
                        class="rounded-lg border border-amber-400/20 bg-amber-400/8 px-2 py-1 text-xs font-mono text-amber-200"
                      >
                        {{ prop }}
                      </span>
                    </div>
                  </section>

                  <section>
                    <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Methods
                    </h3>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="method in activeEntry.schema.methods"
                        :key="method"
                        class="rounded-lg border border-emerald-400/20 bg-emerald-400/8 px-2 py-1 text-xs font-mono text-emerald-200"
                      >
                        {{ method }}
                      </span>
                    </div>
                  </section>
                </div>

                <section class="mt-6">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Code Example
                    </h3>
                    <button
                      type="button"
                      class="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-[11px] text-neutral-300 transition-colors hover:bg-neutral-700"
                      @click="copyExample(activeEntry.schema.codeExample)"
                    >
                      Copy
                    </button>
                  </div>
                  <pre class="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-xs leading-6 text-green-300"><code>{{ activeEntry.schema.codeExample }}</code></pre>
                </section>
              </template>

              <template v-else>
                <section class="mt-6">
                  <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Methods
                  </h3>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="method in activeEntry.methods"
                      :key="method"
                      class="rounded-lg border border-emerald-400/20 bg-emerald-400/8 px-2 py-1 text-xs font-mono text-emerald-200"
                    >
                      {{ method }}
                    </span>
                  </div>
                </section>

                <section class="mt-6">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Code Example
                    </h3>
                    <button
                      type="button"
                      class="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-[11px] text-neutral-300 transition-colors hover:bg-neutral-700"
                      @click="copyExample(activeEntry.codeExample)"
                    >
                      Copy
                    </button>
                  </div>
                  <pre class="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-xs leading-6 text-green-300"><code>{{ activeEntry.codeExample }}</code></pre>
                </section>
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  CONSOLE_API_METHODS,
  PAGE_API_METHODS,
  getComponentApiSchemas,
  type ComponentApiSchema,
} from "~/utils/componentApi";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

type PaletteEntry =
  | {
      key: string;
      kind: "component";
      title: string;
      subtitle: string;
      schema: ComponentApiSchema;
    }
  | {
      key: string;
      kind: "global";
      title: string;
      subtitle: string;
      methods: string[];
      codeExample: string;
    };

const searchRef = ref<HTMLInputElement | null>(null);
const query = ref("");
const activeKey = ref("");

const entries = computed<PaletteEntry[]>(() => {
  const componentEntries: PaletteEntry[] = getComponentApiSchemas().map((schema) => ({
    key: `component:${schema.className}`,
    kind: "component",
    title: schema.className,
    subtitle: `${schema.label} component`,
    schema,
  }));

  return [
    {
      key: "global:page",
      kind: "global",
      title: "page",
      subtitle: "Page object",
      methods: PAGE_API_METHODS,
      codeExample: ["page.add(button1);", "page.goTo('page2');"].join("\n"),
    },
    {
      key: "global:console",
      kind: "global",
      title: "console",
      subtitle: "Debug console",
      methods: CONSOLE_API_METHODS,
      codeExample: ["console.log('hello');", "console.warn('check this');"].join("\n"),
    },
    ...componentEntries,
  ];
});

const filteredItems = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return entries.value;

  return entries.value.filter((entry) => {
    if (entry.title.toLowerCase().includes(needle)) return true;
    if (entry.subtitle.toLowerCase().includes(needle)) return true;
    if (entry.kind === "component") {
      return (
        entry.schema.props.some((prop) => prop.toLowerCase().includes(needle)) ||
        entry.schema.methods.some((method) => method.toLowerCase().includes(needle)) ||
        entry.schema.codeExample.toLowerCase().includes(needle)
      );
    }
    return (
      entry.methods.some((method) => method.toLowerCase().includes(needle)) ||
      entry.codeExample.toLowerCase().includes(needle)
    );
  });
});

const activeEntry = computed(() => {
  const match = filteredItems.value.find((item) => item.key === activeKey.value);
  return match ?? filteredItems.value[0] ?? null;
});

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    query.value = "";
    activeKey.value = entries.value[0]?.key ?? "";
    await nextTick();
    searchRef.value?.focus();
  },
);

watch(filteredItems, (items) => {
  if (!items.length) {
    activeKey.value = "";
    return;
  }
  if (!items.some((item) => item.key === activeKey.value)) {
    activeKey.value = items[0].key;
  }
});

async function copyExample(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignore clipboard failures in the command palette.
  }
}
</script>

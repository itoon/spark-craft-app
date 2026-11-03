<template>
  <USlideover
    :open="open"
    side="right"
    title="ฐานข้อมูล"
    description="ดูตารางและลองพิมพ์ SQL — ใช้ฐานข้อมูลเดียวกับตอนกด Run"
    :ui="panelUi"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex h-full min-h-0 flex-col gap-3" data-testid="database-panel">
        <!-- Engine loading / failure -->
        <div
          v-if="loadState === 'loading'"
          class="flex items-center gap-2 text-sm text-neutral-300"
          role="status"
        >
          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
          กำลังโหลดฐานข้อมูล…
        </div>

        <div
          v-else-if="loadState === 'error'"
          class="flex flex-wrap items-center gap-3 text-sm text-red-400"
          role="alert"
        >
          <span>{{ loadError }}</span>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            label="ลองอีกครั้ง"
            data-testid="db-retry"
            @click="loadEngine"
          />
        </div>

        <template v-else>
          <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto sm:flex-row">
            <!-- Table list -->
            <nav
              class="flex shrink-0 flex-col gap-1 sm:w-44"
              aria-label="ตารางในฐานข้อมูล"
            >
              <p
                v-if="tableList.length === 0"
                class="rounded-lg border border-dashed border-neutral-700 p-3 text-xs leading-5 text-neutral-400"
                data-testid="db-empty"
              >
                ยังไม่มีตาราง — ลองพิมพ์ CREATE TABLE ด้านล่าง หรือใช้ db.table('ชื่อ').add({...}) ในโค้ด
              </p>
              <button
                v-for="t in tableList"
                :key="t.name"
                type="button"
                class="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                :class="
                  t.name === selected
                    ? 'border-indigo-500 bg-indigo-500/15 text-white'
                    : 'border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:bg-neutral-800'
                "
                :aria-pressed="t.name === selected"
                :data-testid="`db-table-${t.name}`"
                @click="selectTable(t.name)"
              >
                <span class="truncate font-mono">{{ t.name }}</span>
                <UBadge color="neutral" variant="subtle" size="sm" :label="String(t.count)" />
              </button>
            </nav>

            <!-- Rows of the selected table -->
            <section v-if="selected" class="min-w-0 flex-1" :aria-label="`แถวของตาราง ${selected}`">
              <UTable
                :data="tableRows"
                :columns="tableColumns"
                empty="ไม่มีแถว"
                class="max-h-96 overflow-auto rounded-lg border border-neutral-700"
                data-testid="db-table-rows"
              />
              <p v-if="tableTruncated" class="mt-1 text-xs text-neutral-400">แสดง {{ ROW_LIMIT }} แถวแรก</p>
            </section>
          </div>

          <!-- SQL box -->
          <section class="shrink-0 space-y-2" aria-label="ลองพิมพ์ SQL">
            <div
              ref="sqlHostRef"
              class="sql-host h-28 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950"
              data-testid="db-sql-editor"
            />
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                icon="i-lucide-play"
                color="success"
                variant="solid"
                size="sm"
                label="Run"
                data-testid="db-run-sql"
                @click="runSql"
              />
              <span class="hidden text-xs text-neutral-500 sm:inline">⌘/Ctrl + Enter</span>
              <UButton
                class="ml-auto"
                icon="i-lucide-trash-2"
                color="error"
                variant="soft"
                size="sm"
                label="ล้างฐานข้อมูล"
                data-testid="db-reset"
                @click="setConfirm(true)"
              />
            </div>

            <p v-if="sqlError" class="text-sm text-red-400" role="alert" data-testid="db-sql-error">
              {{ sqlError }}
            </p>
            <p v-else-if="sqlMessage" class="text-sm text-emerald-400" role="status" data-testid="db-sql-message">
              {{ sqlMessage }}
            </p>
            <div v-if="sqlResult" data-testid="db-sql-result">
              <UTable
                :data="sqlResult.rows"
                :columns="sqlResult.columns"
                empty="ไม่มีแถว"
                class="max-h-64 overflow-auto rounded-lg border border-neutral-700"
              />
              <p v-if="sqlResult.truncated" class="mt-1 text-xs text-neutral-400">แสดง {{ ROW_LIMIT }} แถวแรก</p>
            </div>
          </section>
        </template>
      </div>
    </template>
  </USlideover>

  <UModal
    v-model:open="confirmOpen"
    title="ลบข้อมูลทั้งหมดของโปรเจกต์นี้? ย้อนกลับไม่ได้"
    :ui="modalUi"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="ยกเลิก" @click="setConfirm(false)" />
        <UButton color="error" variant="solid" label="ลบทั้งหมด" data-testid="db-reset-confirm" @click="resetAll" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from "vue";
import type { TableColumn } from "@nuxt/ui";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { sql } from "@codemirror/lang-sql";
import { tags } from "@lezer/highlight";

import { createRuntimeDb, dbVersion, resetProjectDb, type DbRow } from "~/utils/runtimeDb";
import { quoteName } from "~/utils/sqlBuilders";
import { getLoadedSqlEngine, loadSqlEngine } from "~/utils/sqlEngine";

const props = defineProps<{
  open: boolean;
  namespace: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

/** One extra row is fetched so we can tell "exactly 200" from "more than 200". */
const ROW_LIMIT = 200;

interface TableEntry {
  name: string;
  count: number;
}

interface ResultView {
  rows: DbRow[];
  columns: TableColumn<DbRow>[];
  truncated: boolean;
}

// `dark` re-scopes Nuxt UI's colour tokens: the editor is always dark, whatever the OS theme is.
const panelUi = {
  content: "dark w-full max-w-full sm:max-w-3xl bg-neutral-900 text-neutral-100 border-l border-neutral-700",
  header: "border-b border-neutral-800",
  title: "text-white",
  description: "text-neutral-400",
  body: "min-h-0 flex-1 overflow-hidden",
};
const modalUi = {
  content: "dark bg-neutral-900 text-neutral-100 border border-neutral-700",
  title: "text-white",
  footer: "border-t border-neutral-800",
};

const loadState = ref<"idle" | "loading" | "ready" | "error">("idle");
const loadError = ref("");
const tableList = ref<TableEntry[]>([]);
const selected = ref<string | null>(null);
const tableRows = ref<DbRow[]>([]);
const tableColumns = ref<TableColumn<DbRow>[]>([]);
const tableTruncated = ref(false);

const sqlText = ref("");
const sqlError = ref("");
const sqlMessage = ref("");
const sqlResult = ref<ResultView | null>(null);
const confirmOpen = ref(false);

const sqlHostRef = ref<HTMLDivElement | null>(null);
const sqlView = shallowRef<EditorView | null>(null);

// All instances on one namespace share a single handle, so this sees Run mode's data.
let db = createRuntimeDb({ getEngine: getLoadedSqlEngine, namespace: props.namespace });
watch(
  () => props.namespace,
  (namespace) => {
    db = createRuntimeDb({ getEngine: getLoadedSqlEngine, namespace });
    selected.value = null;
    if (loadState.value === "ready") refresh();
  },
);

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Blob cells would print as "0,1,2…", NULL would be an empty cell: show what they are instead. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Uint8Array) return "[blob]";
  return String(value);
}

function toView(rows: DbRow[], fallbackColumns: string[] = []): ResultView {
  const truncated = rows.length > ROW_LIMIT;
  const shown = truncated ? rows.slice(0, ROW_LIMIT) : rows;
  const keys = shown.length > 0 ? Object.keys(shown[0]!) : fallbackColumns;
  return {
    rows: shown,
    truncated,
    columns: keys.map((key) => ({
      accessorKey: key,
      header: key,
      cell: ({ row }) => cellText(row.original[key]),
    })),
  };
}

function loadEngine() {
  loadState.value = "loading";
  loadError.value = "";
  loadSqlEngine().then(
    () => {
      loadState.value = "ready";
      refresh();
    },
    (err: unknown) => {
      loadState.value = "error";
      loadError.value = `โหลดฐานข้อมูลไม่สำเร็จ — ${messageOf(err)}`;
    },
  );
}

/** Reloads the table list and the selected table's rows. */
function refresh() {
  if (loadState.value !== "ready") return;
  try {
    tableList.value = db.tables().map((name) => {
      let count = 0;
      try {
        count = db.table(name).count();
      } catch {
        // a table with an unusual name: still list it
      }
      return { name, count };
    });
  } catch (err) {
    tableList.value = [];
    sqlError.value = messageOf(err);
  }
  if (!tableList.value.some((t) => t.name === selected.value)) {
    selected.value = tableList.value[0]?.name ?? null;
  }
  loadSelectedRows();
}

function loadSelectedRows() {
  const name = selected.value;
  if (!name) {
    tableRows.value = [];
    tableColumns.value = [];
    tableTruncated.value = false;
    return;
  }
  try {
    const rows = db.query(`SELECT * FROM ${quoteName(name)} LIMIT ${ROW_LIMIT + 1}`);
    // An empty table has no first row to take keys from, so ask SQLite for its columns.
    const fallback =
      rows.length === 0
        ? db.query(`PRAGMA table_info(${quoteName(name)})`).map((col) => String(col.name))
        : [];
    const view = toView(rows, fallback);
    tableRows.value = view.rows;
    tableColumns.value = view.columns;
    tableTruncated.value = view.truncated;
  } catch (err) {
    tableRows.value = [];
    tableColumns.value = [];
    tableTruncated.value = false;
    sqlError.value = messageOf(err);
  }
}

function selectTable(name: string) {
  selected.value = name;
  loadSelectedRows();
}

/** SELECT / WITH / PRAGMA return rows; everything else is a write. */
function returnsRows(statement: string): boolean {
  const withoutComments = statement.replace(/^(?:\s+|--[^\n]*(?:\n|$))+/, "");
  const keyword = /^[(\s]*([A-Za-z]+)/.exec(withoutComments)?.[1]?.toUpperCase();
  return keyword === "SELECT" || keyword === "WITH" || keyword === "PRAGMA";
}

function runSql() {
  const text = (sqlView.value?.state.doc.toString() ?? sqlText.value).trim();
  sqlError.value = "";
  sqlMessage.value = "";
  sqlResult.value = null;
  if (!text || loadState.value !== "ready") return;
  try {
    if (returnsRows(text)) {
      sqlResult.value = toView(db.query(text));
    } else {
      const { changes } = db.run(text);
      sqlMessage.value = `เปลี่ยนแปลง ${changes} แถว`;
    }
  } catch (err) {
    sqlError.value = messageOf(err);
  }
  refresh();
}

// Handler functions rather than inline assignments: vue-tsc rejects `a = x` returning a boolean for @click.
function setConfirm(value: boolean) {
  confirmOpen.value = value;
}

function resetAll() {
  confirmOpen.value = false;
  resetProjectDb(props.namespace);
  sqlResult.value = null;
  sqlMessage.value = "";
  sqlError.value = "";
  selected.value = null;
  refresh();
}

const sqlHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#ff79c6" },
  { tag: [tags.string, tags.special(tags.string)], color: "#f1fa8c" },
  { tag: [tags.number, tags.bool, tags.null], color: "#bd93f9" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "#6272a4", fontStyle: "italic" },
  { tag: [tags.typeName, tags.standard(tags.name)], color: "#8be9fd" },
  { tag: tags.operator, color: "#ff79c6" },
]);

function createSqlView(host: HTMLElement) {
  sqlView.value = new EditorView({
    parent: host,
    state: EditorState.create({
      doc: sqlText.value,
      extensions: [
        lineNumbers(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        syntaxHighlighting(sqlHighlightStyle, { fallback: true }),
        sql(),
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              runSql();
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) sqlText.value = update.state.doc.toString();
        }),
        EditorView.theme({
          "&": {
            height: "100%",
            backgroundColor: "transparent",
            color: "#f8f8f2",
            fontSize: "12px",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
          ".cm-scroller": { overflow: "auto", fontFamily: "inherit", lineHeight: "22px" },
          ".cm-content": { padding: "8px 0", caretColor: "#ff79c6" },
          ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#ff79c6", borderLeftWidth: "2px" },
          ".cm-gutters": {
            backgroundColor: "#0f172b",
            color: "#6272a4",
            borderRight: "1px solid rgba(98, 114, 164, 0.28)",
          },
          ".cm-selectionBackground, ::selection": { backgroundColor: "rgba(68, 71, 90, 0.9) !important" },
        }),
      ],
    }),
  });
}

function destroySqlView() {
  sqlView.value?.destroy();
  sqlView.value = null;
}

// The SQL host only exists while the panel is open and the engine is ready, so the editor
// follows the host element rather than component mount.
watch(sqlHostRef, (host) => {
  destroySqlView();
  if (host) createSqlView(host);
});

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    if (loadState.value === "ready") {
      refresh();
    } else if (loadState.value !== "loading") {
      loadEngine();
    }
  },
  { immediate: true },
);

watch(dbVersion, () => {
  if (props.open) refresh();
});

onBeforeUnmount(destroySqlView);
</script>

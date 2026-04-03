<template>
  <div class="js-editor flex-1 flex flex-col overflow-hidden bg-neutral-950">
    <div
      class="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-700 shrink-0"
    >
      <div class="flex items-center gap-2">
        <div class="size-2.5 rounded-full bg-red-500" />
        <div class="size-2.5 rounded-full bg-yellow-500" />
        <div class="size-2.5 rounded-full bg-green-500" />
        <span class="ml-3 text-xs text-neutral-500 font-mono"
          >{{
            store.pages.value.find((p) => p.id === store.currentPageId.value)
              ?.name ?? "Page"
          }}
          · logic.js</span
        >
      </div>
      <div class="flex items-center gap-2">
        <UBadge color="info" variant="subtle" size="xs" label="Auto-saving" />
      </div>
    </div>

    <div
      class="available-ids bg-neutral-900/60 border-b border-neutral-700/50 shrink-0"
    >
      <div class="flex min-h-[56px] overflow-hidden">
        <div
          class="shrink-0 min-w-[40px] bg-neutral-900/40 border-r border-neutral-700/50"
          aria-hidden="true"
        />
        <div class="flex-1 pl-4 py-2">
          <div class="max-h-[2.9rem] overflow-y-auto overflow-x-hidden pr-1">
            <p
              class="text-[10px] text-neutral-500 font-mono flex flex-wrap items-start gap-1.5 leading-5"
            >
              <span class="text-indigo-400 font-semibold shrink-0 mr-1"
                >Available IDs:</span
              >
              <span
                v-for="(el, i) in currentElements"
                :key="el.id"
                class="inline-flex max-w-full rounded-md border border-amber-400/20 bg-amber-400/8 px-1.5 text-amber-300 cursor-pointer hover:text-amber-200 hover:border-amber-300/30 hover:bg-amber-300/10 transition-colors"
                :title="`${el.type} — click to insert`"
                @click="insertIdSnippet(el)"
              >
                {{ el.id
                }}<span
                  v-if="i < currentElements.length - 1"
                  class="text-neutral-600"
                  >,</span
                >
              </span>
              <span
                v-if="currentElements.length === 0"
                class="text-neutral-600 italic"
                >No elements on current page</span
              >
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden relative">
      <div
        ref="lineNumRef"
        class="select-none text-right pr-3 pt-4 pb-4 bg-neutral-900/40 border-r border-neutral-700/50 font-mono text-[12px] leading-[22px] text-neutral-600 min-w-[40px] overflow-hidden"
        aria-hidden="true"
      >
        <div v-for="n in lineCount" :key="n">{{ n }}</div>
      </div>

      <div class="relative flex-1 overflow-hidden">
        <textarea
          ref="editorRef"
          v-model="store.jsCode.value"
          class="flex-1 w-full h-full bg-transparent text-green-300 font-mono text-[12px] leading-[22px] p-4 resize-none outline-none caret-white selection:bg-indigo-500/30 overflow-y-auto"
          spellcheck="false"
          autocorrect="off"
          autocapitalize="off"
          placeholder="Write your logic here..."
          @keydown="onEditorKeydown"
          @input="scheduleSuggestionUpdate"
          @click="scheduleSuggestionUpdate"
          @keyup="scheduleSuggestionUpdate"
          @scroll="syncScroll"
        />

        <div
          v-if="suggestions.length > 0"
          class="absolute z-20 w-[320px] max-h-[260px] overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-900/95 shadow-2xl backdrop-blur"
          :style="suggestionPanelStyle"
        >
          <button
            v-for="(suggestion, index) in suggestions"
            :key="`${suggestion.label}-${suggestion.insertText}`"
            type="button"
            class="w-full px-3 py-2 text-left border-b border-neutral-800/80 last:border-b-0 transition-colors"
            :class="
              index === selectedSuggestionIndex
                ? 'bg-indigo-500/15'
                : 'hover:bg-neutral-800/80'
            "
            @mousedown.prevent="applySuggestion(index)"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="text-[12px] font-mono text-white">
                {{ suggestion.label }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider"
                :class="suggestion.badgeClass"
              >
                {{ suggestion.kind }}
              </span>
            </div>
            <p class="mt-1 text-[10px] text-neutral-400 leading-4">
              {{ suggestion.detail }}
            </p>
          </button>
        </div>
      </div>
    </div>

    <div
      class="flex items-center justify-between px-3 py-1 bg-neutral-900 border-t border-neutral-700 shrink-0"
    >
      <div
        class="flex items-center gap-3 text-[10px] text-neutral-500 font-mono"
      >
        <span>Javascript</span>
        <span>UTF-8</span>
        <span>{{ lineCount }} lines</span>
      </div>
      <div class="text-[10px] text-neutral-500 font-mono">
        <span v-if="suggestions.length > 0"
          >Suggestions: Enter/Tab to insert · Esc to close</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useEditorStore } from "~/composables/useEditorStore";
import {
  ELEMENT_CLASS_MAP,
  varNameFromId,
  buildScaffold,
} from "~/composables/useRuntime";
import type { AppElement } from "~/composables/useEditorStore";
import {
  CONSOLE_API_METHODS,
  PAGE_API_METHODS,
  findComponentApiSchemaByClassName,
  getComponentApiSchemas,
} from "~/utils/componentApi";

interface EditorSuggestion {
  label: string;
  insertText: string;
  detail: string;
  kind: "class" | "method" | "attr" | "global" | "variable";
  badgeClass: string;
  replaceRange?: { start: number; end: number };
}

const store = useEditorStore();
const editorRef = ref<HTMLTextAreaElement | null>(null);
const lineNumRef = ref<HTMLDivElement | null>(null);
const suggestions = ref<EditorSuggestion[]>([]);
const selectedSuggestionIndex = ref(0);
const suggestionPos = ref({ top: 12, left: 12 });
const suggestionPlacement = ref<"below" | "above">("below");
const componentSchemas = getComponentApiSchemas();

const currentElements = computed(() =>
  store.elements.value.filter(
    (el: AppElement) => el.pageId === store.currentPageId.value,
  ),
);

function initPageCodeIfEmpty() {
  if (!store.jsCode.value || store.jsCode.value.trim() === "") {
    store.setJsCode(buildScaffold(currentElements.value));
  }
}

onMounted(initPageCodeIfEmpty);
watch(() => store.currentPageId.value, initPageCodeIfEmpty);

const lineCount = computed(() => (store.jsCode.value || "").split("\n").length);

const suggestionPanelStyle = computed(() => ({
  top: `${suggestionPos.value.top}px`,
  left: `${suggestionPos.value.left}px`,
}));

function syncScroll() {
  if (editorRef.value && lineNumRef.value) {
    lineNumRef.value.scrollTop = editorRef.value.scrollTop;
  }
  scheduleSuggestionUpdate();
}

function insertTab() {
  const ta = editorRef.value;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const code = store.jsCode.value;
  store.setJsCode(code.substring(0, start) + "  " + code.substring(end));
  nextTick(() => {
    ta.selectionStart = ta.selectionEnd = start + 2;
    updateSuggestions();
  });
}

function insertIdSnippet(el: AppElement) {
  const cls = ELEMENT_CLASS_MAP[el.type] ?? el.type;
  const varName = varNameFromId(el.id);
  const snippet = `var ${varName} = new ${cls}('${el.id}');\npage.add(${varName});\n`;

  const ta = editorRef.value;
  if (ta) {
    const pos = ta.selectionStart;
    const code = store.jsCode.value;
    store.setJsCode(code.substring(0, pos) + snippet + code.substring(pos));
    nextTick(() => {
      ta.selectionStart = ta.selectionEnd = pos + snippet.length;
      ta.focus();
      updateSuggestions();
    });
  } else {
    store.setJsCode((store.jsCode.value || "") + "\n" + snippet);
  }
}

function scheduleSuggestionUpdate() {
  nextTick(() => updateSuggestions());
}

function updateSuggestionPosition(cursor: number) {
  const ta = editorRef.value;
  if (!ta) return;

  const before = store.jsCode.value.slice(0, cursor);
  const lines = before.split("\n");
  const line = Math.max(lines.length - 1, 0);
  const col = lines[lines.length - 1]?.length ?? 0;
  const charWidth = 7.2;
  const lineHeight = 22;
  const panelWidth = 320;
  const panelHeight = Math.min(260, Math.max(120, suggestions.value.length * 52));
  const gutter = 16;
  const caretClearanceX = 42;
  const caretClearanceY = 18;

  const cursorX = 16 + col * charWidth - ta.scrollLeft;
  const cursorY = 16 + line * lineHeight - ta.scrollTop;

  let left = cursorX + caretClearanceX;
  let top = cursorY + lineHeight + caretClearanceY;

  if (left + panelWidth > ta.clientWidth - gutter) {
    left = Math.max(gutter, cursorX - panelWidth - caretClearanceX);
  }

  if (top + panelHeight > ta.clientHeight - gutter) {
    top = Math.max(gutter, cursorY - panelHeight - caretClearanceY);
    suggestionPlacement.value = "above";
  } else {
    suggestionPlacement.value = "below";
  }

  if (
    left <= cursorX + caretClearanceX &&
    left + panelWidth >= cursorX - caretClearanceX &&
    top <= cursorY + lineHeight + caretClearanceY &&
    top + panelHeight >= cursorY - caretClearanceY
  ) {
    const rightCandidate = cursorX + panelWidth + caretClearanceX > ta.clientWidth - gutter
      ? null
      : cursorX + caretClearanceX;
    const leftCandidate = cursorX - panelWidth - caretClearanceX;

    if (rightCandidate !== null) {
      left = rightCandidate;
    } else {
      left = Math.max(gutter, leftCandidate);
    }
  }

  suggestionPos.value = { top, left };
}

function getBadgeClass(kind: EditorSuggestion["kind"]) {
  if (kind === "class") return "bg-cyan-500/15 text-cyan-300";
  if (kind === "method") return "bg-emerald-500/15 text-emerald-300";
  if (kind === "attr") return "bg-amber-500/15 text-amber-300";
  if (kind === "variable") return "bg-violet-500/15 text-violet-300";
  return "bg-fuchsia-500/15 text-fuchsia-300";
}

function getCurrentWordRange(code: string, cursor: number) {
  let start = cursor;
  let end = cursor;

  while (start > 0 && /[\w$]/.test(code[start - 1] || "")) start -= 1;
  while (end < code.length && /[\w$]/.test(code[end] || "")) end += 1;

  return { start, end, word: code.slice(start, end) };
}

function getVariableClassMap(code: string) {
  const variableMap = new Map<string, string>();
  const pattern = /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Za-z_$][\w$]*)\s*\(/g;
  for (const match of code.matchAll(pattern)) {
    variableMap.set(match[1], match[2]);
  }
  return variableMap;
}

function getDeclaredVariables(code: string) {
  const variables = new Set<string>();
  const declarationPattern =
    /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g;
  const functionPattern =
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;

  for (const match of code.matchAll(declarationPattern)) {
    variables.add(match[1]);
  }

  for (const match of code.matchAll(functionPattern)) {
    variables.add(match[1]);
  }

  return Array.from(variables).sort((a, b) => a.localeCompare(b));
}

function buildGlobalSuggestions(word: string, replaceRange: { start: number; end: number }) {
  const needle = word.toLowerCase();
  const items: EditorSuggestion[] = [];

  for (const schema of componentSchemas) {
    if (!needle || schema.className.toLowerCase().includes(needle)) {
      items.push({
        label: schema.className,
        insertText: schema.className,
        detail: `${schema.label} class`,
        kind: "class",
        badgeClass: getBadgeClass("class"),
        replaceRange,
      });
    }
  }

  const globals = [
    { label: "page", detail: "Page API object", kind: "global" as const },
    { label: "console", detail: "Debug console object", kind: "global" as const },
  ];

  for (const entry of globals) {
    if (!needle || entry.label.includes(needle)) {
      items.push({
        label: entry.label,
        insertText: entry.label,
        detail: entry.detail,
        kind: entry.kind,
        badgeClass: getBadgeClass(entry.kind),
        replaceRange,
      });
    }
  }

  for (const variableName of getDeclaredVariables(store.jsCode.value || "")) {
    if (!needle || variableName.toLowerCase().includes(needle)) {
      items.push({
        label: variableName,
        insertText: variableName,
        detail: "Declared variable",
        kind: "variable",
        badgeClass: getBadgeClass("variable"),
        replaceRange,
      });
    }
  }

  return items;
}

function buildObjectSuggestions(
  objectName: string,
  word: string,
  replaceRange: { start: number; end: number },
) {
  const needle = word.toLowerCase();
  const items: EditorSuggestion[] = [];

  if (objectName === "page") {
    for (const method of PAGE_API_METHODS) {
      if (!needle || method.toLowerCase().includes(needle)) {
        items.push({
          label: method,
          insertText: method,
          detail: "Page method",
          kind: "method",
          badgeClass: getBadgeClass("method"),
          replaceRange,
        });
      }
    }
    return items;
  }

  if (objectName === "console") {
    for (const method of CONSOLE_API_METHODS) {
      if (!needle || method.toLowerCase().includes(needle)) {
        items.push({
          label: method,
          insertText: method,
          detail: "Console method",
          kind: "method",
          badgeClass: getBadgeClass("method"),
          replaceRange,
        });
      }
    }
    return items;
  }

  const className = getVariableClassMap(store.jsCode.value).get(objectName);
  const schema = className ? findComponentApiSchemaByClassName(className) : undefined;
  if (!schema) return [];

  for (const method of schema.methods) {
    if (!needle || method.toLowerCase().includes(needle)) {
      items.push({
        label: method,
        insertText: method,
        detail: `${schema.className} method`,
        kind: "method",
        badgeClass: getBadgeClass("method"),
        replaceRange,
      });
    }
  }

  for (const prop of schema.props) {
    if (!needle || prop.toLowerCase().includes(needle)) {
      items.push({
        label: prop,
        insertText: prop,
        detail: `${schema.className} attr`,
        kind: "attr",
        badgeClass: getBadgeClass("attr"),
        replaceRange,
      });
    }
  }

  return items;
}

function updateSuggestions() {
  const ta = editorRef.value;
  if (!ta) return;

  const code = store.jsCode.value || "";
  const cursor = ta.selectionStart ?? 0;
  const before = code.slice(0, cursor);
  const objectMatch = before.match(/([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)?$/);
  const wordRange = getCurrentWordRange(code, cursor);

  let nextSuggestions: EditorSuggestion[] = [];

  if (objectMatch) {
    const objectName = objectMatch[1];
    const partial = objectMatch[2] ?? "";
    nextSuggestions = buildObjectSuggestions(objectName, partial, {
      start: cursor - partial.length,
      end: cursor,
    });
  } else if (wordRange.word.length >= 1) {
    nextSuggestions = buildGlobalSuggestions(wordRange.word, {
      start: wordRange.start,
      end: wordRange.end,
    });
  } else {
    nextSuggestions = [];
  }

  suggestions.value = nextSuggestions.slice(0, 12);
  selectedSuggestionIndex.value = 0;
  if (suggestions.value.length > 0) {
    updateSuggestionPosition(cursor);
  }
}

function applySuggestion(index = selectedSuggestionIndex.value) {
  const ta = editorRef.value;
  const suggestion = suggestions.value[index];
  if (!ta || !suggestion) return;

  const code = store.jsCode.value;
  const range = suggestion.replaceRange ?? {
    start: ta.selectionStart,
    end: ta.selectionEnd,
  };
  const insert = suggestion.insertText;

  store.setJsCode(code.slice(0, range.start) + insert + code.slice(range.end));
  suggestions.value = [];

  nextTick(() => {
    const nextPos = range.start + insert.length;
    ta.selectionStart = ta.selectionEnd = nextPos;
    ta.focus();
    updateSuggestions();
  });
}

function moveSuggestion(delta: number) {
  if (suggestions.value.length === 0) return;
  const next =
    (selectedSuggestionIndex.value + delta + suggestions.value.length) %
    suggestions.value.length;
  selectedSuggestionIndex.value = next;
}

function onEditorKeydown(event: KeyboardEvent) {
  if (suggestions.value.length > 0) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSuggestion(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSuggestion(-1);
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applySuggestion();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      suggestions.value = [];
      return;
    }
  }

  if (event.key === "Tab") {
    event.preventDefault();
    insertTab();
  }
}
</script>

<style scoped>
textarea {
  tab-size: 2;
}
textarea::-webkit-scrollbar {
  width: 10px;
}
textarea::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
}
textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

.available-ids ::-webkit-scrollbar {
  width: 6px;
}

.available-ids ::-webkit-scrollbar-track {
  background: rgba(17, 24, 39, 0.45);
  border-radius: 9999px;
}

.available-ids ::-webkit-scrollbar-thumb {
  background: linear-gradient(
    180deg,
    rgba(99, 102, 241, 0.65),
    rgba(245, 158, 11, 0.45)
  );
  border-radius: 9999px;
  border: 1px solid rgba(17, 24, 39, 0.35);
}

.available-ids ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    180deg,
    rgba(129, 140, 248, 0.8),
    rgba(251, 191, 36, 0.65)
  );
}
</style>

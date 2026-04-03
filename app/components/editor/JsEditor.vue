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

    <div class="flex-1 overflow-hidden">
      <div ref="editorHostRef" class="h-full w-full" />
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
        <span>CodeMirror 6</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { EditorSelection, EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import {
  autocompletion,
  closeBrackets,
  completionKeymap,
  type Completion,
  type CompletionContext,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";

import { useEditorStore } from "~/composables/useEditorStore";
import {
  ELEMENT_CLASS_MAP,
  buildScaffold,
  varNameFromId,
} from "~/composables/useRuntime";
import type { AppElement } from "~/composables/useEditorStore";
import {
  CONSOLE_API_METHODS,
  PAGE_API_METHODS,
  findComponentApiSchemaByClassName,
  getComponentApiSchemas,
} from "~/utils/componentApi";

const store = useEditorStore();
const editorHostRef = ref<HTMLDivElement | null>(null);
const lineCount = ref(1);
const componentSchemas = getComponentApiSchemas();
let editorView: EditorView | null = null;
let syncingFromEditor = false;

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

function getCurrentWordRange(code: string, cursor: number) {
  let start = cursor;
  let end = cursor;

  while (start > 0 && /[\w$]/.test(code[start - 1] || "")) start -= 1;
  while (end < code.length && /[\w$]/.test(code[end] || "")) end += 1;

  return { start, end, word: code.slice(start, end) };
}

function getVariableClassMap(code: string) {
  const variableMap = new Map<string, string>();
  const pattern =
    /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Za-z_$][\w$]*)\s*\(/g;
  for (const match of code.matchAll(pattern)) {
    variableMap.set(match[1], match[2]);
  }
  return variableMap;
}

function getDeclaredVariables(code: string) {
  const variables = new Set<string>();
  const declarationPattern = /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g;
  const functionPattern = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;

  for (const match of code.matchAll(declarationPattern)) {
    variables.add(match[1]);
  }

  for (const match of code.matchAll(functionPattern)) {
    variables.add(match[1]);
  }

  return Array.from(variables).sort((a, b) => a.localeCompare(b));
}

function buildGlobalCompletions(
  code: string,
  word: string,
): Completion[] {
  const needle = word.toLowerCase();
  const completions: Completion[] = [];

  for (const schema of componentSchemas) {
    if (!needle || schema.className.toLowerCase().includes(needle)) {
      completions.push({
        label: schema.className,
        type: "class",
        detail: `${schema.label} class`,
        info: `Attrs: ${schema.props.join(", ")}\nMethods: ${schema.methods.join(", ")}`,
      });
    }
  }

  const globals = [
    { label: "page", detail: "Page API object", type: "constant" as const },
    { label: "console", detail: "Debug console object", type: "constant" as const },
  ];

  for (const entry of globals) {
    if (!needle || entry.label.includes(needle)) {
      completions.push({
        label: entry.label,
        type: entry.type,
        detail: entry.detail,
      });
    }
  }

  for (const variableName of getDeclaredVariables(code)) {
    if (!needle || variableName.toLowerCase().includes(needle)) {
      completions.push({
        label: variableName,
        type: "variable",
        detail: "Declared variable",
      });
    }
  }

  return completions;
}

function buildObjectCompletions(
  code: string,
  objectName: string,
  word: string,
): Completion[] {
  const needle = word.toLowerCase();

  if (objectName === "page") {
    return PAGE_API_METHODS.filter(
      (method) => !needle || method.toLowerCase().includes(needle),
    ).map((method) => ({
      label: method,
      type: "method" as const,
      detail: "Page method",
      apply: method,
    }));
  }

  if (objectName === "console") {
    return CONSOLE_API_METHODS.filter(
      (method) => !needle || method.toLowerCase().includes(needle),
    ).map((method) => ({
      label: method,
      type: "method" as const,
      detail: "Console method",
      apply: method,
    }));
  }

  const className = getVariableClassMap(code).get(objectName);
  const schema = className ? findComponentApiSchemaByClassName(className) : undefined;
  if (!schema) return [];

  const methodCompletions = schema.methods
    .filter((method) => !needle || method.toLowerCase().includes(needle))
    .map((method) => ({
      label: method,
      type: "method" as const,
      detail: `${schema.className} method`,
      apply: method,
    }));

  const propCompletions = schema.props
    .filter((prop) => !needle || prop.toLowerCase().includes(needle))
    .map((prop) => ({
      label: prop,
      type: "property" as const,
      detail: `${schema.className} attr`,
    }));

  return [...methodCompletions, ...propCompletions];
}

function codecraftCompletionSource(context: CompletionContext) {
  const code = context.state.doc.toString();
  const cursor = context.pos;
  const before = code.slice(0, cursor);
  const objectMatch = before.match(/([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)?$/);

  if (objectMatch) {
    const objectName = objectMatch[1];
    const partial = objectMatch[2] ?? "";
    const options = buildObjectCompletions(code, objectName, partial);
    if (!options.length) return null;
    return {
      from: cursor - partial.length,
      options,
    };
  }

  const wordRange = getCurrentWordRange(code, cursor);
  if (!context.explicit && !wordRange.word.length) return null;

  const options = buildGlobalCompletions(code, wordRange.word);
  if (!options.length) return null;

  return {
    from: wordRange.start,
    options,
  };
}

function syncStoreFromEditor(doc: string) {
  syncingFromEditor = true;
  store.setJsCode(doc);
  syncingFromEditor = false;
}

function replaceEditorDoc(nextCode: string) {
  if (!editorView) return;
  const current = editorView.state.doc.toString();
  if (current === nextCode) return;

  editorView.dispatch({
    changes: {
      from: 0,
      to: current.length,
      insert: nextCode,
    },
    selection: EditorSelection.cursor(Math.min(nextCode.length, editorView.state.selection.main.head)),
  });
}

function insertSnippetAtCursor(snippet: string) {
  if (!editorView) return;
  const selection = editorView.state.selection.main;
  editorView.dispatch({
    changes: { from: selection.from, to: selection.to, insert: snippet },
    selection: EditorSelection.cursor(selection.from + snippet.length),
  });
  editorView.focus();
}

function insertIdSnippet(el: AppElement) {
  const cls = ELEMENT_CLASS_MAP[el.type] ?? el.type;
  const varName = varNameFromId(el.id);
  const snippet = `var ${varName} = new ${cls}('${el.id}');\npage.add(${varName});\n`;
  insertSnippetAtCursor(snippet);
}

function createEditorView() {
  if (!editorHostRef.value) return;

  const state = EditorState.create({
    doc: store.jsCode.value || "",
    extensions: [
      lineNumbers(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      foldGutter(),
      highlightActiveLine(),
      javascript(),
      autocompletion({
        override: [codecraftCompletionSource],
        activateOnTyping: true,
      }),
      keymap.of([
        indentWithTab,
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
      ]),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const doc = update.state.doc.toString();
        lineCount.value = update.state.doc.lines;
        syncStoreFromEditor(doc);
      }),
      EditorView.theme({
        "&": {
          height: "100%",
          backgroundColor: "transparent",
          color: "#86efac",
          fontSize: "12px",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "inherit",
          lineHeight: "22px",
        },
        ".cm-content": {
          padding: "16px",
          caretColor: "#ffffff",
        },
        ".cm-gutters": {
          backgroundColor: "rgba(10, 10, 10, 0.35)",
          color: "#6b7280",
          borderRight: "1px solid rgba(64, 64, 64, 0.7)",
          minWidth: "40px",
        },
        ".cm-lineNumbers .cm-gutterElement": {
          paddingRight: "12px",
          paddingLeft: "8px",
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(99, 102, 241, 0.08)",
        },
        ".cm-selectionBackground, ::selection": {
          backgroundColor: "rgba(99, 102, 241, 0.28) !important",
        },
        ".cm-tooltip.cm-tooltip-autocomplete": {
          border: "1px solid rgba(55, 65, 81, 1)",
          backgroundColor: "rgba(10, 15, 30, 0.96)",
          color: "#e5e7eb",
          borderRadius: "14px",
          overflow: "hidden",
          backdropFilter: "blur(10px)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
        },
        ".cm-tooltip-autocomplete ul": {
          fontFamily: "inherit",
          maxHeight: "260px",
        },
        ".cm-tooltip-autocomplete li": {
          padding: "8px 12px",
          borderBottom: "1px solid rgba(31, 41, 55, 0.9)",
        },
        ".cm-tooltip-autocomplete li:last-child": {
          borderBottom: "none",
        },
        ".cm-tooltip-autocomplete li[aria-selected]": {
          backgroundColor: "rgba(99, 102, 241, 0.18)",
          color: "#ffffff",
        },
        ".cm-completionLabel": {
          color: "#ffffff",
        },
        ".cm-completionDetail": {
          color: "#94a3b8",
          fontStyle: "normal",
        },
        ".cm-completionInfo": {
          borderLeft: "1px solid rgba(55, 65, 81, 1)",
          backgroundColor: "rgba(15, 23, 42, 0.96)",
          color: "#cbd5e1",
          padding: "12px",
          whiteSpace: "pre-wrap",
        },
      }),
    ],
  });

  editorView = new EditorView({
    state,
    parent: editorHostRef.value,
  });
  lineCount.value = state.doc.lines;
}

onMounted(() => {
  initPageCodeIfEmpty();
  createEditorView();
});

watch(
  () => store.currentPageId.value,
  () => {
    initPageCodeIfEmpty();
    replaceEditorDoc(store.jsCode.value || "");
    lineCount.value = (store.jsCode.value || "").split("\n").length;
  },
);

watch(
  () => store.jsCode.value,
  (nextCode) => {
    if (syncingFromEditor) return;
    replaceEditorDoc(nextCode || "");
    lineCount.value = (nextCode || "").split("\n").length;
  },
);

onBeforeUnmount(() => {
  editorView?.destroy();
  editorView = null;
});
</script>

<style scoped>
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

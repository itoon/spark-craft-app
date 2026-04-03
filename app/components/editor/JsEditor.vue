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
          class="shrink-0 min-w-[40px] bg-neutral-900 border-r border-neutral-700/50"
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
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { tags } from "@lezer/highlight";

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

interface EditorCompletion extends Completion {
  metaKind?: "class" | "method" | "attr" | "global" | "variable";
  metaDescription?: string;
  metaBadge?: string;
}

const store = useEditorStore();
const editorHostRef = ref<HTMLDivElement | null>(null);
const lineCount = ref(1);
const componentSchemas = getComponentApiSchemas();
let editorView: EditorView | null = null;
let syncingFromEditor = false;

const draculaHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#ff79c6" },
  {
    tag: [
      tags.name,
      tags.deleted,
      tags.character,
      tags.propertyName,
      tags.macroName,
    ],
    color: "#8be9fd",
  },
  {
    tag: [tags.function(tags.variableName), tags.labelName],
    color: "#50fa7b",
  },
  {
    tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
    color: "#bd93f9",
  },
  {
    tag: [tags.definition(tags.name), tags.separator],
    color: "#f8f8f2",
  },
  {
    tag: [
      tags.className,
      tags.number,
      tags.changed,
      tags.annotation,
      tags.modifier,
      tags.self,
      tags.namespace,
    ],
    color: "#bd93f9",
  },
  { tag: [tags.typeName], color: "#8be9fd" },
  { tag: [tags.operator, tags.operatorKeyword], color: "#ff79c6" },
  { tag: [tags.url, tags.escape, tags.regexp, tags.link], color: "#8be9fd" },
  { tag: [tags.meta, tags.comment], color: "#6272a4", fontStyle: "italic" },
  { tag: [tags.strong], fontWeight: "700", color: "#f8f8f2" },
  { tag: [tags.emphasis], fontStyle: "italic", color: "#f8f8f2" },
  { tag: [tags.strikethrough], textDecoration: "line-through" },
  { tag: [tags.link], color: "#8be9fd", textDecoration: "underline" },
  { tag: [tags.heading], fontWeight: "700", color: "#ff79c6" },
  {
    tag: [tags.atom, tags.bool, tags.special(tags.variableName)],
    color: "#bd93f9",
  },
  {
    tag: [tags.processingInstruction, tags.string, tags.inserted],
    color: "#f1fa8c",
  },
  { tag: [tags.invalid], color: "#ff5555" },
]);

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
): EditorCompletion[] {
  const needle = word.toLowerCase();
  const completions: EditorCompletion[] = [];

  for (const schema of componentSchemas) {
    if (!needle || schema.className.toLowerCase().includes(needle)) {
      completions.push({
        label: schema.className,
        type: "class",
        info: `Attrs: ${schema.props.join(", ")}\nMethods: ${schema.methods.join(", ")}`,
        metaKind: "class",
        metaDescription: `${schema.label} class`,
        metaBadge: "CLASS",
      });
    }
  }

  const globals = [
    { label: "page", detail: "Page API object", type: "constant" as const },
    {
      label: "console",
      detail: "Debug console object",
      type: "constant" as const,
    },
  ];

  for (const entry of globals) {
    if (!needle || entry.label.includes(needle)) {
      completions.push({
        label: entry.label,
        type: entry.type,
        metaKind: "global",
        metaDescription: entry.detail,
        metaBadge: "GLOBAL",
      });
    }
  }

  for (const variableName of getDeclaredVariables(code)) {
    if (!needle || variableName.toLowerCase().includes(needle)) {
      completions.push({
        label: variableName,
        type: "variable",
        metaKind: "variable",
        metaDescription: "Declared variable",
        metaBadge: "VAR",
      });
    }
  }

  return completions;
}

function buildObjectCompletions(
  code: string,
  objectName: string,
  word: string,
): EditorCompletion[] {
  const needle = word.toLowerCase();

  if (objectName === "page") {
    return PAGE_API_METHODS.filter(
      (method) => !needle || method.toLowerCase().includes(needle),
    ).map((method) => ({
      label: method,
      type: "method" as const,
      apply: method,
      metaKind: "method" as const,
      metaDescription: "Page method",
      metaBadge: "METHOD",
    }));
  }

  if (objectName === "console") {
    return CONSOLE_API_METHODS.filter(
      (method) => !needle || method.toLowerCase().includes(needle),
    ).map((method) => ({
      label: method,
      type: "method" as const,
      apply: method,
      metaKind: "method" as const,
      metaDescription: "Console method",
      metaBadge: "METHOD",
    }));
  }

  const className = getVariableClassMap(code).get(objectName);
  const schema = className
    ? findComponentApiSchemaByClassName(className)
    : undefined;
  if (!schema) return [];

  const methodCompletions = schema.methods
    .filter((method) => !needle || method.toLowerCase().includes(needle))
    .map((method) => ({
      label: method,
      type: "method" as const,
      apply: method,
      metaKind: "method" as const,
      metaDescription: `${schema.className} method`,
      metaBadge: "METHOD",
    }));

  const propCompletions = schema.props
    .filter((prop) => !needle || prop.toLowerCase().includes(needle))
    .map((prop) => ({
      label: prop,
      type: "property" as const,
      metaKind: "attr" as const,
      metaDescription: `${schema.className} attr`,
      metaBadge: "ATTR",
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
    selection: EditorSelection.cursor(
      Math.min(nextCode.length, editorView.state.selection.main.head),
    ),
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
      syntaxHighlighting(draculaHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      foldGutter(),
      highlightActiveLine(),
      javascript(),
      autocompletion({
        override: [codecraftCompletionSource],
        activateOnTyping: true,
        icons: false,
        optionClass: (completion) => {
          const kind = (completion as EditorCompletion).metaKind;
          return kind ? `cc-completion-${kind}` : "";
        },
        addToOptions: [
          {
            position: 80,
            render: (completion) => {
              const meta = completion as EditorCompletion;
              if (!meta.metaDescription) return null;
              const description = document.createElement("span");
              description.className = "cc-completion-description";
              description.textContent = meta.metaDescription;
              return description;
            },
          },
          {
            position: 100,
            render: (completion) => {
              const meta = completion as EditorCompletion;
              if (!meta.metaBadge) return null;
              const badge = document.createElement("span");
              badge.className = `cc-completion-badge cc-completion-badge-${meta.metaKind ?? "global"}`;
              badge.textContent = meta.metaBadge;
              return badge;
            },
          },
        ],
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
          color: "#f8f8f2",
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
          caretColor: "#ff79c6",
        },
        ".cm-cursor, .cm-dropCursor": {
          borderLeftColor: "#ff79c6",
          borderLeftWidth: "2px",
        },
        ".cm-focused .cm-cursor": {
          borderLeftColor: "#ff79c6",
        },
        ".cm-gutters": {
          backgroundColor: "#0f172b",
          color: "#6272a4",
          borderRight: "1px solid rgba(98, 114, 164, 0.28)",
          minWidth: "40px",
        },
        ".cm-lineNumbers .cm-gutterElement": {
          paddingRight: "12px",
          paddingLeft: "8px",
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(68, 71, 90, 0.7)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#282a36",
          color: "#f8f8f2",
        },
        ".cm-selectionBackground, ::selection": {
          backgroundColor: "rgba(68, 71, 90, 0.9) !important",
        },
        ".cm-tooltip.cm-tooltip-autocomplete": {
          border: "1px solid rgba(98, 114, 164, 0.32)",
          backgroundColor: "#282a36",
          color: "#f8f8f2",
          borderRadius: "10px",
          overflow: "hidden",
          backdropFilter: "blur(10px)",
          boxShadow: "0 18px 48px rgba(0, 0, 0, 0.48)",
          padding: "6px",
        },
        ".cm-tooltip-autocomplete ul": {
          fontFamily: "inherit",
          maxHeight: "260px",
        },
        ".cm-tooltip-autocomplete li": {
          padding: "12px 16px !important",
          margin: "0",
          borderBottom: "1px solid rgba(68, 71, 90, 0.85)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          alignItems: "center",
          columnGap: "12px",
          rowGap: "4px",
          borderRadius: "8px",
          backgroundColor: "#282a36",
        },
        ".cm-tooltip-autocomplete li:last-child": {
          borderBottom: "none",
        },
        ".cm-tooltip-autocomplete li:hover": {
          backgroundColor: "#343746",
        },
        ".cm-tooltip-autocomplete li[aria-selected]": {
          backgroundColor: "#343746 !important",
          borderLeftColor: "#bd93f9",
          color: "#f8f8f2",
        },
        ".cm-completionLabel": {
          color: "#f8f8f2",
          gridColumn: "1 / 2",
          fontSize: "14px",
          lineHeight: "1.35",
          fontWeight: "500",
        },
        ".cm-completionMatchedText": {
          textDecoration: "none",
          color: "#8be9fd",
        },
        ".cc-completion-description": {
          gridColumn: "1 / -1",
          color: "#6272a4",
          fontSize: "12px",
          lineHeight: "1.4",
        },
        ".cc-completion-badge": {
          gridColumn: "2 / 3",
          gridRow: "1 / 2",
          justifySelf: "end",
          alignSelf: "center",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "76px",
          borderRadius: "999px",
          padding: "3px 8px",
          fontSize: "9px",
          fontWeight: "500",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: "1",
          border: "1px solid transparent",
        },
        ".cc-completion-badge-class": {
          backgroundColor: "rgba(139, 233, 253, 0.12)",
          color: "#8be9fd",
          borderColor: "rgba(139, 233, 253, 0.14)",
        },
        ".cc-completion-badge-method": {
          backgroundColor: "rgba(80, 250, 123, 0.12)",
          color: "#50fa7b",
          borderColor: "rgba(80, 250, 123, 0.14)",
        },
        ".cc-completion-badge-attr": {
          backgroundColor: "rgba(255, 184, 108, 0.12)",
          color: "#ffb86c",
          borderColor: "rgba(255, 184, 108, 0.14)",
        },
        ".cc-completion-badge-global": {
          backgroundColor: "rgba(255, 121, 198, 0.12)",
          color: "#ff79c6",
          borderColor: "rgba(255, 121, 198, 0.14)",
        },
        ".cc-completion-badge-variable": {
          backgroundColor: "rgba(189, 147, 249, 0.12)",
          color: "#bd93f9",
          borderColor: "rgba(189, 147, 249, 0.14)",
        },
        ".cm-completionInfo": {
          borderLeft: "1px solid rgba(98, 114, 164, 0.28)",
          backgroundColor: "#21222c",
          color: "#f8f8f2",
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

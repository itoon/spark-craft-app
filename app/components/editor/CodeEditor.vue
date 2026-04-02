<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-neutral-950">
    <!-- macOS-style toolbar bar -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-700 shrink-0">
      <div class="flex items-center gap-2">
        <div class="size-2.5 rounded-full bg-red-500" />
        <div class="size-2.5 rounded-full bg-yellow-500" />
        <div class="size-2.5 rounded-full bg-green-500" />
        <span class="ml-3 text-xs text-neutral-500 font-mono">App.vue</span>
      </div>
      <div class="flex items-center gap-2">
        <UBadge color="warning" variant="subtle" size="xs" label="Read only · Monaco coming soon" />
      </div>
    </div>

    <!-- Line-numbered code display built from computed HTML string -->
    <div class="flex-1 overflow-auto">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="code-body py-3" v-html="renderedCode" />
    </div>

    <!-- Status bar -->
    <div class="flex items-center justify-between px-3 py-1 bg-neutral-900 border-t border-neutral-700 shrink-0">
      <div class="flex items-center gap-3 text-[10px] text-neutral-500 font-mono">
        <span>Vue SFC</span>
        <span>UTF-8</span>
        <span>{{ lineCount }} lines</span>
      </div>
      <div class="flex items-center gap-1 text-[10px] text-neutral-600">
        <UIcon name="i-lucide-info" class="size-3" />
        <span>Monaco Editor integration planned</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Sample SFC source shown in the code panel.
 *
 * The raw strings are built at runtime from fragments to keep the Vue SFC parser
 * from misinterpreting embedded angle-bracket tags or script-close sequences as
 * real template/script blocks.
 */
const T  = '\u003C'   // less-than char, avoids SFC block scanner
const TC = '\u003E'   // greater-than char
const SC = T + '/script' + TC
const SS = T + 'script setup lang="ts"' + TC
const TM = T + 'template' + TC
const TZ = T + '/template' + TC

function tag(name: string, attrs = '', selfClose = false) {
  if (selfClose) return `${T}${name}${attrs ? ' ' + attrs : ''} /${TC}`
  return `${T}${name}${attrs ? ' ' + attrs : ''}${TC}`
}
function close(name: string) {
  return `${T}/${name}${TC}`
}

const RAW_SAMPLE: string[] = [
  TM,
  `  ${tag('div', 'class="app"')}`,
  `    ${tag('header', 'class="app-header"')}`,
  `      ${tag('h1')}My App${close('h1')}`,
  `    ${close('header')}`,
  '',
  `    ${tag('main', 'class="app-main"')}`,
  `      ${tag('UButton')}`,
  `        :label="buttonLabel"`,
  `        color="primary"`,
  `        @click="handleClick"`,
  `      /${TC}`,
  '',
  `      ${tag('UInput')}`,
  `        v-model="inputValue"`,
  `        placeholder="Enter text\u2026"`,
  `        class="mt-4"`,
  `      /${TC}`,
  '',
  `      ${tag('p', 'class="output mt-4 text-sm text-gray-600"')}`,
  '        {{ outputText }}',
  `      ${close('p')}`,
  `    ${close('main')}`,
  `  ${close('div')}`,
  TZ,
  '',
  SS,
  "import { ref, computed } from 'vue'",
  '',
  "const buttonLabel = ref('Click me')",
  "const inputValue  = ref('')",
  'const clickCount  = ref(0)',
  '',
  'const outputText = computed(() =>',
  '  clickCount.value > 0',
  "    ? `Clicked ${'{'}clickCount.value{'}'} time(s)`",
  "    : 'Press the button.'",
  ')',
  '',
  'function handleClick() {',
  '  clickCount.value++',
  '}',
  SC,
  '',
  tag('style', 'scoped'),
  '.app {',
  '  min-height: 100vh;',
  '  padding: 2rem;',
  '}',
  '.app-header { margin-bottom: 1.5rem; }',
  '.app-main   { max-width: 400px; }',
  close('style'),
]

const lineCount = RAW_SAMPLE.length

// Lightweight VS Code-style syntax highlighting — no external dep needed.
function highlight(raw: string): string {
  // Escape HTML entities first
  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  if (s.trim() === '') return '&nbsp;'

  // Apply colour spans in a non-overlapping sequence
  // Comments
  s = s.replace(/(\/\/[^\n]*)/, '<span style="color:#6a9955">$1</span>')
  // HTML/Vue opening/closing tags (already escaped: &lt;)
  s = s.replace(/(&lt;\/?\w[\w-]*)/g, '<span style="color:#7c9fd4">$1</span>')
  // Vue directives & bound attrs (v-model, :prop, @event)
  s = s.replace(/\b([v@:][^\s=]+=)/g, '<span style="color:#9cdcfe">$1</span>')
  // String literals
  s = s.replace(/(["'`][^"'`\n]*["'`])/g, '<span style="color:#ce9178">$1</span>')
  // JS keywords
  s = s.replace(
    /\b(const|ref|computed|function|import|from|return|if|else|let|var)\b/g,
    '<span style="color:#c586c0">$1</span>',
  )
  // Numbers
  s = s.replace(/\b(\d+)\b/g, '<span style="color:#b5cea8">$1</span>')

  return `<span style="color:#d4d4d4">${s}</span>`
}

const renderedCode = computed(() =>
  RAW_SAMPLE.map((line, idx) => {
    const num = idx + 1
    return (
      `<div class="code-line">`
      + `<span class="line-no">${num}</span>`
      + `<span class="line-content">${highlight(line)}</span>`
      + `</div>`
    )
  }).join('')
)
</script>

<style scoped>
.code-body {
  background: transparent;
  font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 20px;
}

.code-line {
  display: flex;
  align-items: flex-start;
  padding-right: 16px;
  min-height: 20px;
}

.code-line:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.line-no {
  display: inline-block;
  width: 40px;
  text-align: right;
  padding-right: 16px;
  color: #4b5563;
  font-size: 10px;
  line-height: 20px;
  flex-shrink: 0;
  user-select: none;
}

.line-content {
  flex: 1;
  white-space: pre;
}
</style>

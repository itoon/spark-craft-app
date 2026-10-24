/**
 * Which design elements the page code actually puts on screen with page.add().
 *
 * Only elements that reach page.add() show up in Run / Live / APK, so the editor
 * uses this to label the rest ("ยังไม่ add") and offer a one-click fix. It is a static read
 * of the code (regex, comments stripped): page.add() inside loops or helper
 * functions with computed ids can't be seen, so the UI words it as a hint.
 */

import { isNonVisualType } from "./componentApi";

const IDENT = "[A-Za-z_$][\\w$]*";
/** A quoted id; `quoteGroup` is the capture-group number of the opening quote. */
const quotedId = (quoteGroup: number) => `(['"\`])([^'"\`\\n]+)\\${quoteGroup}`;

export function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

/** var name → element id, from `var x = new Button('page1_button1')`. */
export function findElementVariables(code: string): Map<string, string> {
  const src = stripComments(code);
  const map = new Map<string, string>();
  const pattern = new RegExp(`\\b(?:var|let|const)\\s+(${IDENT})\\s*=\\s*new\\s+${IDENT}\\s*\\(\\s*${quotedId(2)}`, "g");
  for (const match of src.matchAll(pattern)) map.set(match[1]!, match[3]!);
  return map;
}

/** Element ids that the code passes to page.add(). */
export function findAddedIds(code: string): Set<string> {
  const src = stripComments(code);
  const vars = findElementVariables(src);
  const ids = new Set<string>();
  for (const match of src.matchAll(new RegExp(`\\bpage\\.add\\s*\\(\\s*(${IDENT})\\s*\\)`, "g"))) {
    const id = vars.get(match[1]!);
    if (id) ids.add(id);
  }
  // page.add(new Button('page1_button1'))
  for (const match of src.matchAll(new RegExp(`\\bpage\\.add\\s*\\(\\s*new\\s+${IDENT}\\s*\\(\\s*${quotedId(1)}`, "g"))) {
    ids.add(match[2]!);
  }
  return ids;
}

/** Elements that never need page.add() themselves (added with their children). */
export function needsPageAdd(type: string): boolean {
  // Containers come along with their children; off-screen elements (Sound) are never shown
  return type !== "Container" && !isNonVisualType(type);
}

/**
 * Add `var x = new Cls('id'); page.add(x);` for one element.
 * Reuses an existing variable for that id; otherwise picks a free name.
 * The lines go right after the last page.add(...) so the "connect" block stays together.
 */
export function addElementToCode(code: string, id: string, className: string, preferredName: string): string {
  const vars = findElementVariables(code);
  const existing = [...vars.entries()].find(([, elementId]) => elementId === id)?.[0];

  let lines: string;
  if (existing) {
    lines = `page.add(${existing});`;
  } else {
    const taken = new Set([...stripComments(code).matchAll(new RegExp(`\\b(?:var|let|const|function)\\s+(${IDENT})`, "g"))].map((m) => m[1]!));
    let name = preferredName;
    for (let n = 2; taken.has(name); n += 1) name = `${preferredName}_${n}`;
    lines = `var ${name} = new ${className}('${id}');\npage.add(${name});`;
  }

  const addPattern = /^.*\bpage\.add\s*\(.*$/gm;
  let lastEnd = -1;
  for (const match of code.matchAll(addPattern)) lastEnd = (match.index ?? 0) + match[0].length;

  if (lastEnd >= 0) {
    const rest = code.slice(lastEnd);
    // keep a blank line between the new lines and whatever followed (usually handlers)
    const gap = rest.startsWith("\n\n") || rest.trim() === "" ? "" : "\n";
    return `${code.slice(0, lastEnd)}\n\n${lines}${gap}${rest}`;
  }
  return code.trim() ? `${lines}\n\n${code}` : `${lines}\n`;
}

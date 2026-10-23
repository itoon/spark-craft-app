/**
 * CodeCraft's own release notes. CHANGELOG.md (Keep a Changelog format) is the
 * only source: the "มีอะไรใหม่" page and the version badge read it at build time.
 *
 *   ## [0.4.0] - 2026-10-23
 *   One-line summary (optional)
 *   ### ใหม่
 *   - item with `code` and **bold**
 */

export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string;
  summary: string;
  sections: ChangelogSection[];
}

export interface InlinePart {
  text: string;
  kind: "text" | "code" | "bold";
}

const RELEASE_HEADING = /^##\s+\[([^\]]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/;

export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | null = null;
  let section: ChangelogSection | null = null;

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    const heading = line.match(RELEASE_HEADING);
    if (heading) {
      release = { version: heading[1]!.trim(), date: heading[2]!, summary: "", sections: [] };
      releases.push(release);
      section = null;
      continue;
    }
    if (!release || !line) continue;
    if (line.startsWith("### ")) {
      section = { title: line.slice(4).trim(), items: [] };
      release.sections.push(section);
    } else if (line.startsWith("- ") && section) {
      section.items.push(line.slice(2).trim());
    } else if (!section && !line.startsWith("#")) {
      release.summary = release.summary ? `${release.summary} ${line}` : line;
    }
  }
  return releases;
}

/** Split `code` and **bold** spans so the page can render them without v-html. */
export function splitInline(line: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    if (match.index! > last) parts.push({ text: line.slice(last, match.index), kind: "text" });
    parts.push(match[1] !== undefined ? { text: match[1], kind: "code" } : { text: match[2]!, kind: "bold" });
    last = match.index! + match[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last), kind: "text" });
  return parts;
}

/** The badge shows a dot until the latest version's notes have been opened. */
export function hasUnseenRelease(latest: string, lastSeen: string | null) {
  return latest !== lastSeen;
}

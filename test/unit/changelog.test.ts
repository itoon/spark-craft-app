import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { hasUnseenRelease, parseChangelog, splitInline } from "../../app/utils/changelog";

const SAMPLE = `# Changelog

ข้อความแนะนำด้านบนไม่ใช่เวอร์ชัน

## [0.2.0] - 2026-10-21
ทดสอบบนมือถือได้แล้ว

### ใหม่
- ปุ่ม **มือถือ** สแกน QR
- \`notify.toast()\`

### แก้ไข
- จอมือถือโดนตัด

## [0.1.0] - 2026-04-02
### ใหม่
- เริ่มโปรเจกต์
`;

describe("parseChangelog", () => {
  it("reads versions newest first with date, summary and sections", () => {
    expect(parseChangelog(SAMPLE)).toEqual([
      {
        version: "0.2.0",
        date: "2026-10-21",
        summary: "ทดสอบบนมือถือได้แล้ว",
        sections: [
          { title: "ใหม่", items: ["ปุ่ม **มือถือ** สแกน QR", "`notify.toast()`"] },
          { title: "แก้ไข", items: ["จอมือถือโดนตัด"] },
        ],
      },
      {
        version: "0.1.0",
        date: "2026-04-02",
        summary: "",
        sections: [{ title: "ใหม่", items: ["เริ่มโปรเจกต์"] }],
      },
    ]);
  });

  it("parses the real CHANGELOG.md and matches package.json's version", () => {
    const root = join(__dirname, "../..");
    const releases = parseChangelog(readFileSync(join(root, "CHANGELOG.md"), "utf8"));
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };

    expect(releases.length).toBeGreaterThan(0);
    expect(releases[0]!.version).toBe(pkg.version);
    for (const release of releases) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.sections.length).toBeGreaterThan(0);
    }
  });
});

describe("splitInline", () => {
  it("splits `code` and **bold** spans out of a line", () => {
    expect(splitInline("กด **APK** แล้วใช้ `page.add()` ได้")).toEqual([
      { text: "กด ", kind: "text" },
      { text: "APK", kind: "bold" },
      { text: " แล้วใช้ ", kind: "text" },
      { text: "page.add()", kind: "code" },
      { text: " ได้", kind: "text" },
    ]);
  });
});

describe("hasUnseenRelease", () => {
  it("is true until the latest version has been opened", () => {
    expect(hasUnseenRelease("0.4.0", null)).toBe(true);
    expect(hasUnseenRelease("0.4.0", "0.3.0")).toBe(true);
    expect(hasUnseenRelease("0.4.0", "0.4.0")).toBe(false);
  });
});

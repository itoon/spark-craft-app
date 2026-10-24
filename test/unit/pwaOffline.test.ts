import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// @ts-expect-error plain .mjs script without types
import { certNames, lanAddresses, subjectAltName } from "../../scripts/lan-cert.mjs";
import { buildWebManifest, SHARE_ID } from "../../server/utils/pwaApp";
import { buildServiceWorker, DATA_CACHE, listBuildAssets } from "../../server/utils/serviceWorker";

describe("offline shared apps (PWA)", () => {
  it("precaches every file of the build except source maps", async () => {
    const publicDir = mkdtempSync(join(tmpdir(), "cc-public-"));
    mkdirSync(join(publicDir, "_nuxt", "builds"), { recursive: true });
    writeFileSync(join(publicDir, "_nuxt", "entry.abc.js"), "");
    writeFileSync(join(publicDir, "_nuxt", "entry.abc.js.map"), "");
    writeFileSync(join(publicDir, "_nuxt", "style.css"), "");
    writeFileSync(join(publicDir, "_nuxt", "builds", "latest.json"), "");
    expect(await listBuildAssets(publicDir)).toEqual([
      "/_nuxt/builds/latest.json",
      "/_nuxt/entry.abc.js",
      "/_nuxt/style.css",
    ]);
    // `bun run dev` has no build folder
    expect(await listBuildAssets(join(publicDir, "missing"))).toEqual([]);
  });

  it("gives each build its own cache so a new build replaces the old one", () => {
    const a = buildServiceWorker(["/_nuxt/a.js"]);
    const b = buildServiceWorker(["/_nuxt/b.js"]);
    const version = (sw: string) => sw.match(/codecraft-shell-([0-9a-f]+)/)?.[1];
    expect(version(a)).toBeTruthy();
    expect(version(a)).not.toBe(version(b));
    expect(buildServiceWorker(["/_nuxt/a.js"])).toBe(a);
    expect(a).toContain('"/_nuxt/a.js"');
    // the page stores app data under the same cache name (usePwaOffline)
    expect(a).toContain(JSON.stringify(DATA_CACHE));
    // the worker must be valid JavaScript
    expect(() => new Function(a)).not.toThrow();
  });

  it("builds a manifest that installs the shared app under its own name", () => {
    const manifest = buildWebManifest({ id: "cc123", appName: "เครื่องคิดเลขของฉันแบบยาว" }, true);
    expect(manifest).toMatchObject({
      start_url: "/pwa/cc123",
      scope: "/pwa/cc123",
      display: "standalone",
      name: "เครื่องคิดเลขของฉันแบบยาว",
    });
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.icons[0]?.src).toBe("/api/pwa/cc123/icon.png");
    expect(buildWebManifest({ id: "cc123", appName: "x" }, false).icons).toEqual([]);
  });

  it("accepts share ids but not paths", () => {
    expect(SHARE_ID.test("cc202610231227112za0u")).toBe(true);
    expect(SHARE_ID.test("../secret")).toBe(false);
    expect(SHARE_ID.test("a/b")).toBe(false);
  });

  it("covers this computer's LAN addresses in the HTTPS certificate", () => {
    const interfaces = {
      lo0: [{ address: "127.0.0.1", family: "IPv4", internal: true }],
      en0: [
        { address: "192.168.1.184", family: "IPv4", internal: false },
        { address: "fe80::1", family: "IPv6", internal: false },
      ],
      bridge: [{ address: "169.254.10.2", family: "IPv4", internal: false }],
    };
    expect(lanAddresses(interfaces)).toEqual(["192.168.1.184"]);
    const names = certNames(["192.168.1.184"], "Teacher-Mac.local");
    expect(subjectAltName(names)).toBe(
      "DNS:localhost,DNS:Teacher-Mac.local,IP:127.0.0.1,IP:192.168.1.184",
    );
  });
});

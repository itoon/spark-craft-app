import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PersistedEditorState } from "../../app/composables/useEditorStore";
import { statePayload, writeIonicExport, writeSharedLink } from "../../server/utils/exportWriters";

const state = {
  projectId: "p1",
  projectName: "Demo App",
  shareLinkId: null,
  elements: [],
  pages: [
    { id: "page1", name: "Home" },
    { id: "page2", name: "Two" },
  ],
  currentPageId: "page1",
  activeDeviceId: "android",
  jsCodeByPage: {},
} as unknown as PersistedEditorState;

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "export-writers-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("statePayload", () => {
  it("defaults startPageId to the first page and maps state fields", () => {
    const payload = statePayload(state);
    expect(payload.startPageId).toBe("page1");
    expect(payload.appName).toBe("Demo App");
    expect(payload.activeDeviceId).toBe("android");
    expect(payload.shareId).toBeNull();
  });

  it("uses the given start page", () => {
    expect(statePayload(state, "page2").startPageId).toBe("page2");
  });
});

describe("writeSharedLink", () => {
  it("writes <id>.json with the start page", async () => {
    const { id } = await writeSharedLink(statePayload(state, "page2"), undefined, root);
    const record = JSON.parse(await readFile(join(root, "exports", "shared-links", `${id}.json`), "utf8"));
    expect(record.startPageId).toBe("page2");
    expect(record.id).toBe(id);
  });

  it("keeps the first createdAt when rewriting the same shareId", async () => {
    const first = await writeSharedLink(statePayload(state), undefined, root);
    const file = join(root, "exports", "shared-links", `${first.id}.json`);
    const createdAt = JSON.parse(await readFile(file, "utf8")).createdAt;
    await new Promise((r) => setTimeout(r, 10));
    const second = await writeSharedLink({ ...statePayload(state), shareId: first.id }, undefined, root);
    expect(second.id).toBe(first.id);
    expect(JSON.parse(await readFile(file, "utf8")).createdAt).toBe(createdAt);
  });
});

describe("writeIonicExport", () => {
  it("writes files into a folder under exports/ionic", async () => {
    const result = await writeIonicExport(statePayload(state), root);
    expect(result.fileCount).toBeGreaterThan(0);
    expect(existsSync(result.outputDir)).toBe(true);
    expect(result.outputDir).toBe(join(root, "exports", "ionic", result.folderName));
  });
});

import { describe, expect, it } from "vitest";

import {
  buildShareId,
  type SharedExportPayload,
} from "../../app/utils/sharedExport";

describe("shared export helpers", () => {
  it("builds a deterministic share id", () => {
    const id = buildShareId(new Date("2026-04-03T12:34:56.000Z"), 0.12345);

    expect(id).toBe("cc2026040312345618e3v");
  });

  it("keeps an existing share id in the payload when updating the same link", () => {
    const payload: SharedExportPayload = {
      appName: "CodeCraft Shared App",
      pages: [{ id: "page1", name: "Page 1" }],
      elements: [],
      jsCodeByPage: { page1: "console.log('updated')" },
      startPageId: "page1",
      activeDeviceId: "iphone15",
      iosDeviceId: "iphone15",
      androidDeviceId: "android",
      fallbackDeviceId: "iphone15",
      shareId: "ccexisting12345",
    };

    expect(payload.shareId).toBe("ccexisting12345");
  });
});

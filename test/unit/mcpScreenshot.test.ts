import { beforeEach, describe, expect, it, vi } from "vitest";

const launch = vi.fn();
vi.mock("playwright-core", () => ({ chromium: { launch: () => launch() } }));

const { CHROMIUM_MISSING_MESSAGE, takeScreenshot } = await import("../../mcp/screenshot");

describe("takeScreenshot", () => {
  beforeEach(() => {
    launch.mockReset();
  });

  it("says Chromium is missing when the executable is not installed", async () => {
    launch.mockImplementation(async () => {
      throw new Error("browserType.launch: Executable doesn't exist at /x/chrome\nRun: npx playwright install");
    });
    await expect(takeScreenshot("http://localhost:3000/pwa/a")).rejects.toThrow(CHROMIUM_MISSING_MESSAGE);
  });

  it("passes other launch failures through unchanged", async () => {
    launch.mockImplementation(async () => {
      throw new Error("browserType.launch: Target page, context or browser has been closed");
    });
    await expect(takeScreenshot("http://localhost:3000/pwa/a")).rejects.toThrow("has been closed");
  });
});

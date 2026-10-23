import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseAdbDevices } from "../../server/utils/adb";
import { applyOutputLine, getApkJob, isValidSlug, startApkBuild, type ApkBuildJob } from "../../server/utils/apkBuildJobs";

function emptyJob(): ApkBuildJob {
  return {
    id: "t",
    slug: "demo",
    install: true,
    status: "running",
    lines: [],
    step: 0,
    totalSteps: 7,
    startedAt: 0,
    finishedAt: null,
    error: null,
    apkPath: null,
  };
}

describe("APK build jobs", () => {
  it("reads progress, APK path and errors from the script output", () => {
    const job = emptyJob();
    applyOutputLine(job, "\u001b[1;32m▶ 3/7 ติดตั้ง Capacitor\u001b[0m");
    applyOutputLine(job, "APK: /x/exports/apk/demo/demo.apk");
    applyOutputLine(job, "✗ ไม่เจอมือถือ — เสียบสาย USB");
    expect(job.step).toBe(3);
    expect(job.totalSteps).toBe(7);
    expect(job.apkPath).toBe("/x/exports/apk/demo/demo.apk");
    expect(job.error).toBe("ไม่เจอมือถือ — เสียบสาย USB");
    expect(job.lines[0]).toBe("▶ 3/7 ติดตั้ง Capacitor");
  });

  it("only accepts safe slugs", () => {
    expect(isValidSlug("magic-ball-2")).toBe(true);
    expect(isValidSlug("../etc")).toBe(false);
    expect(isValidSlug("a b")).toBe(false);
  });

  it("parses `adb devices -l` output", () => {
    const devices = parseAdbDevices(
      "List of devices attached\nR58N123ABC device usb:1-1 product:a52 model:SM_A525F device:a52q\nEMU1 unauthorized usb:2-1\n\n",
    );
    expect(devices).toEqual([
      { serial: "R58N123ABC", state: "device", model: "SM A525F" },
      { serial: "EMU1", state: "unauthorized", model: "" },
    ]);
  });

  it("runs the build script and tracks it to completion", async () => {
    const root = mkdtempSync(join(tmpdir(), "cc-apk-"));
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "exports", "apk", "demo"), { recursive: true });
    writeFileSync(join(root, "exports", "apk", "demo", "codecraft-app.json"), "{}");
    writeFileSync(
      join(root, "scripts", "build-apk.sh"),
      'echo "▶ 1/7 start"; echo "args: $@"; echo "APK: /tmp/demo.apk"; exit 0\n',
    );
    const job = startApkBuild("demo", true, root);
    expect(() => startApkBuild("demo", false, root)).toThrow("กำลัง build");
    for (let i = 0; i < 50 && getApkJob(job.id)!.status === "running"; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const done = getApkJob(job.id)!;
    expect(done.status).toBe("done");
    expect(done.lines).toContain("args: demo --install");
    expect(done.apkPath).toBe("/tmp/demo.apk");
  });

  it("refuses to start without a saved app", () => {
    const root = mkdtempSync(join(tmpdir(), "cc-apk-"));
    expect(() => startApkBuild("missing", false, root)).toThrow("ไม่พบไฟล์แอป");
  });
});

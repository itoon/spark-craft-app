import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createError, readBody } from "h3";

import { buildApkMeta } from "../../../../app/utils/apkExport";
import type { SharedExportPayload } from "../../../../app/utils/sharedExport";
import { decodePngDataUrl, type ApkIconUpload } from "../../../utils/apkIcon";
import { assertLocalRequest } from "../../../utils/localOnly";

/**
 * "Build APK" step 1: save the app as exports/apk/<slug>/codecraft-app.json.
 * The heavy build (Gradle) runs in a terminal or on GitHub Actions — see
 * scripts/build-apk.sh and docs/build-apk.md.
 */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const body = await readBody<Partial<SharedExportPayload> & { projectId?: string; icon?: ApkIconUpload }>(event);
  if (!body || !Array.isArray(body.pages) || !Array.isArray(body.elements)) {
    throw createError({ statusCode: 400, statusMessage: "pages and elements are required" });
  }

  const meta = buildApkMeta({ appName: body.appName || "CodeCraft App", projectId: body.projectId });
  const payload: SharedExportPayload = {
    appName: meta.appName,
    pages: body.pages,
    elements: body.elements,
    jsCodeByPage: body.jsCodeByPage ?? {},
    startPageId: body.startPageId || body.pages[0]?.id || "page1",
    activeDeviceId: body.activeDeviceId || "android",
    shareId: `apk-${meta.slug}`,
  };

  const dir = join(process.cwd(), "exports", "apk", meta.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "codecraft-app.json"), JSON.stringify(payload, null, 2), "utf8");
  await writeFile(join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  // Home-screen icon → icon/ (scripts/build-apk.sh turns it into Android icons)
  const iconDir = join(dir, "icon");
  const full = decodePngDataUrl(body.icon?.full);
  const foreground = decodePngDataUrl(body.icon?.foreground);
  const background = decodePngDataUrl(body.icon?.background);
  await rm(iconDir, { recursive: true, force: true });
  if (full && foreground && background) {
    await mkdir(iconDir, { recursive: true });
    await writeFile(join(iconDir, "icon-only.png"), full);
    await writeFile(join(iconDir, "icon-foreground.png"), foreground);
    await writeFile(join(iconDir, "icon-background.png"), background);
  }

  return {
    ok: true,
    ...meta,
    folder: dir,
    command: `bun run build:apk ${meta.slug}`,
  };
});

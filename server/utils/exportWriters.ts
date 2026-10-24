import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { PersistedEditorState } from "../../app/composables/useEditorStore";
import {
  buildExportFolderName,
  buildIonicProjectFiles,
  type IonicExportPayload,
} from "../../app/utils/ionicExport";
import { buildShareId, type SharedExportPayload, type SharedExportRecord } from "../../app/utils/sharedExport";
import { decodePngDataUrl } from "./apkIcon";
import { SHARE_ID } from "./pwaApp";

/** Build an export payload from a (server-side copy of the) editor state. */
export function statePayload(state: PersistedEditorState, startPageId?: string): SharedExportPayload {
  return {
    appName: state.projectName,
    pages: state.pages,
    elements: state.elements,
    jsCodeByPage: state.jsCodeByPage,
    startPageId: startPageId || state.pages[0]?.id || "page1",
    activeDeviceId: state.activeDeviceId,
    shareId: state.shareLinkId,
  };
}

/** Normalize the payload and write <rootDir>/exports/shared-links/<id>.json (+ optional PNG icon). */
export async function writeSharedLink(
  input: SharedExportPayload,
  iconDataUrl?: string,
  rootDir: string = process.cwd(),
): Promise<{ id: string }> {
  const payload: SharedExportPayload = {
    appName: input.appName?.trim() || "CodeCraft App",
    pages: Array.isArray(input.pages) ? input.pages : [],
    elements: Array.isArray(input.elements) ? input.elements : [],
    jsCodeByPage: input.jsCodeByPage ?? {},
    startPageId: input.startPageId || input.pages?.[0]?.id || "page1",
    activeDeviceId: input.activeDeviceId || "iphone15",
    iosDeviceId: input.iosDeviceId || "iphone15",
    androidDeviceId: input.androidDeviceId || "android",
    fallbackDeviceId: input.activeDeviceId || input.fallbackDeviceId || "iphone15",
    shareId: input.shareId || null,
  };

  const requestedId = payload.shareId?.trim();
  const id = requestedId && SHARE_ID.test(requestedId) ? requestedId : buildShareId();
  const directory = join(rootDir, "exports", "shared-links");
  const filePath = join(directory, `${id}.json`);
  await mkdir(directory, { recursive: true });

  let createdAt = new Date().toISOString();
  try {
    const existing = JSON.parse(await readFile(filePath, "utf8")) as Partial<SharedExportRecord>;
    if (typeof existing.createdAt === "string" && existing.createdAt) {
      createdAt = existing.createdAt;
    }
  } catch {
    // No previous shared file for this id yet.
  }

  const record: SharedExportRecord = { ...payload, id, createdAt };
  await writeFile(filePath, JSON.stringify(record, null, 2), "utf8");

  // Home-screen icon for /pwa/<id> (Add to Home Screen on iPhone)
  const iconPath = join(directory, `${id}.png`);
  const icon = decodePngDataUrl(iconDataUrl);
  if (icon) await writeFile(iconPath, icon);
  else await rm(iconPath, { force: true });

  return { id };
}

/** Write an Ionic project to <rootDir>/exports/ionic/<folderName>. */
export async function writeIonicExport(
  input: IonicExportPayload,
  rootDir: string = process.cwd(),
): Promise<{ outputDir: string; folderName: string; fileCount: number }> {
  const payload: IonicExportPayload = {
    appName: input.appName?.trim() || "CodeCraft Ionic App",
    pages: Array.isArray(input.pages) ? input.pages : [],
    elements: Array.isArray(input.elements) ? input.elements : [],
    jsCodeByPage: input.jsCodeByPage ?? {},
    startPageId: input.startPageId || input.pages?.[0]?.id || "page1",
  };

  const folderName = buildExportFolderName(payload.appName);
  const outputDir = join(rootDir, "exports", "ionic", folderName);
  const files = buildIonicProjectFiles(payload);

  await mkdir(outputDir, { recursive: true });

  for (const file of files) {
    const destination = join(outputDir, file.path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.content, "utf8");
  }

  return { outputDir, folderName, fileCount: files.length };
}

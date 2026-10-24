import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { getRequestHost, getRequestProtocol } from "h3";

import { buildShareId, type SharedExportPayload, type SharedExportRecord } from "../../../app/utils/sharedExport";
import { decodePngDataUrl } from "../../utils/apkIcon";
import { SHARE_ID } from "../../utils/pwaApp";

export default defineEventHandler(async (event) => {
  const body = await readBody<SharedExportPayload & { icon?: unknown }>(event);

  const payload: SharedExportPayload = {
    appName: body.appName?.trim() || "CodeCraft App",
    pages: Array.isArray(body.pages) ? body.pages : [],
    elements: Array.isArray(body.elements) ? body.elements : [],
    jsCodeByPage: body.jsCodeByPage ?? {},
    startPageId: body.startPageId || body.pages?.[0]?.id || "page1",
    activeDeviceId: body.activeDeviceId || "iphone15",
    iosDeviceId: body.iosDeviceId || "iphone15",
    androidDeviceId: body.androidDeviceId || "android",
    fallbackDeviceId: body.activeDeviceId || body.fallbackDeviceId || "iphone15",
    shareId: body.shareId || null,
  };

  const requestedId = payload.shareId?.trim();
  const id = requestedId && SHARE_ID.test(requestedId) ? requestedId : buildShareId();
  const directory = join(process.cwd(), "exports", "shared-links");
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

  const record: SharedExportRecord = {
    ...payload,
    id,
    createdAt,
  };

  await writeFile(filePath, JSON.stringify(record, null, 2), "utf8");

  // Home-screen icon for /pwa/<id> (Add to Home Screen on iPhone)
  const iconPath = join(directory, `${id}.png`);
  const icon = decodePngDataUrl(body.icon);
  if (icon) await writeFile(iconPath, icon);
  else await rm(iconPath, { force: true });

  const protocol = getRequestProtocol(event, { xForwardedProto: true });
  const host = getRequestHost(event, { xForwardedHost: true });
  const shareUrl = `${protocol}://${host}/pwa/${id}`;

  return {
    ok: true,
    id,
    shareUrl,
    filePath,
    reused: Boolean(payload.shareId?.trim()),
  };
});

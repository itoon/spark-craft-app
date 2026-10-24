import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createError, type H3Event } from "h3";

import type { SharedExportRecord } from "../../app/utils/sharedExport";

export const SHARE_ID = /^[a-z0-9-]{1,64}$/i;

export function sharedLinksDir() {
  return join(process.cwd(), "exports", "shared-links");
}

export function shareIdParam(event: H3Event): string {
  const id = getRouterParam(event, "id") ?? "";
  if (!SHARE_ID.test(id)) throw createError({ statusCode: 400, statusMessage: "Invalid share id" });
  return id;
}

export async function readSharedRecord(id: string): Promise<SharedExportRecord> {
  try {
    return JSON.parse(await readFile(join(sharedLinksDir(), `${id}.json`), "utf8")) as SharedExportRecord;
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Shared export not found" });
  }
}

/** Web app manifest for one shared app, so it installs under its own name + icon. */
export function buildWebManifest(record: Pick<SharedExportRecord, "id" | "appName">, hasIcon: boolean) {
  const start = `/pwa/${record.id}`;
  return {
    id: start,
    name: record.appName,
    short_name: record.appName.slice(0, 12),
    start_url: start,
    scope: start,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: hasIcon
      ? [{ src: `/api/pwa/${record.id}/icon.png`, sizes: "512x512", type: "image/png", purpose: "any" }]
      : [],
  };
}


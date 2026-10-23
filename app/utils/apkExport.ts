import type { SharedExportPayload } from "./sharedExport";

export interface ApkMeta {
  slug: string;
  appName: string;
  appId: string;
  createdAt: string;
}

/** Folder-safe slug; Thai-only names fall back to "app-<time>". */
export function buildApkSlug(appName: string, now = new Date()): string {
  const ascii = appName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
  return ascii ? ascii : `app-${stamp}`;
}

/** Android application id: lowercase segments that start with a letter. */
export function buildApkAppId(slug: string): string {
  const segment = slug.replace(/[^a-z0-9]/g, "").replace(/^[0-9]+/, "") || "app";
  return `app.codecraft.${segment.slice(0, 40)}`;
}

/**
 * Folder + Android id from the project id, so renaming the app (or a Thai-only
 * name) still updates the same app on the phone instead of installing a copy.
 */
export function buildProjectApkSlug(projectId: string): string | null {
  const id = projectId.replace(/^project_/, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
  return id ? `app-${id}` : null;
}

export function buildApkMeta(
  payload: Pick<SharedExportPayload, "appName"> & { projectId?: string },
  now = new Date(),
): ApkMeta {
  const appName = payload.appName?.trim() || "CodeCraft App";
  const slug = (payload.projectId && buildProjectApkSlug(payload.projectId)) || buildApkSlug(appName, now);
  return { slug, appName, appId: buildApkAppId(slug), createdAt: now.toISOString() };
}

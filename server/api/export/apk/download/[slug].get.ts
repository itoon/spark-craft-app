import { createReadStream, existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { createError, getRouterParam, sendStream, setResponseHeaders } from "h3";

import { isValidSlug } from "../../../../utils/apkBuildJobs";

/**
 * The built APK, so a phone on the same Wi-Fi can download it by scanning the
 * QR code in the Build APK dialog (no sending the file through chat apps).
 */
export default defineEventHandler((event) => {
  const slug = String(getRouterParam(event, "slug") ?? "").replace(/\.apk$/, "");
  if (!isValidSlug(slug)) throw createError({ statusCode: 400, statusMessage: "bad app name" });
  const file = join(process.cwd(), "exports", "apk", slug, `${slug}.apk`);
  if (!existsSync(file)) throw createError({ statusCode: 404, statusMessage: "ยังไม่มีไฟล์ APK — กด Build ก่อน" });
  setResponseHeaders(event, {
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": `attachment; filename="${slug}.apk"`,
    "Content-Length": String(statSync(file).size),
    "Cache-Control": "no-store",
  });
  return sendStream(event, createReadStream(file));
});

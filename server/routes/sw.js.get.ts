import { join } from "node:path";

import { setHeader } from "h3";

import { buildServiceWorker, listBuildAssets } from "../utils/serviceWorker";

/** Offline worker for shared apps — see server/utils/serviceWorker.ts. */
export default defineEventHandler(async (event) => {
  const publicDir = process.env.CODECRAFT_PUBLIC_DIR || join(process.cwd(), ".output", "public");
  setHeader(event, "Content-Type", "text/javascript; charset=utf-8");
  // The browser must always see a new build's worker
  setHeader(event, "Cache-Control", "no-cache");
  return buildServiceWorker(await listBuildAssets(publicDir));
});

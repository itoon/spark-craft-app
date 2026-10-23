import { createError, readBody } from "h3";

import { startApkBuild } from "../../../utils/apkBuildJobs";
import { assertLocalRequest } from "../../../utils/localOnly";

/** Start `scripts/build-apk.sh <slug> [--install]` on this computer. */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const body = await readBody<{ slug?: string; install?: boolean }>(event);
  try {
    const job = startApkBuild(String(body?.slug ?? ""), Boolean(body?.install));
    return { id: job.id };
  } catch (error) {
    throw createError({ statusCode: 409, statusMessage: error instanceof Error ? error.message : "build failed" });
  }
});

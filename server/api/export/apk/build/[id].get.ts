import { createError, getQuery, setResponseHeader } from "h3";

import { getApkJob } from "../../../../utils/apkBuildJobs";

/** Progress of a build: new log lines since `after`, current step, result. */
export default defineEventHandler((event) => {
  const job = getApkJob(getRouterParam(event, "id") ?? "");
  if (!job) throw createError({ statusCode: 404, statusMessage: "build not found" });
  const after = Math.max(0, Number(getQuery(event).after ?? 0) || 0);
  setResponseHeader(event, "Cache-Control", "no-store");
  return {
    id: job.id,
    status: job.status,
    step: job.step,
    totalSteps: job.totalSteps,
    install: job.install,
    error: job.error,
    apkPath: job.apkPath,
    lineCount: job.lines.length,
    lines: job.lines.slice(after),
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
});

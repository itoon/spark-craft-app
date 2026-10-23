/**
 * Runs scripts/build-apk.sh from the editor (local dev only) and keeps its
 * output so the Build APK dialog can show live progress.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface ApkBuildJob {
  id: string;
  slug: string;
  install: boolean;
  status: "running" | "done" | "error";
  lines: string[];
  step: number;
  totalSteps: number;
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
  apkPath: string | null;
}

const MAX_LINES = 1500;
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;
const globalKey = "__codecraftApkJobs";

interface JobStore {
  jobs: Map<string, ApkBuildJob>;
  current: { job: ApkBuildJob; child: ChildProcess } | null;
}

function store(): JobStore {
  const g = globalThis as unknown as Record<string, JobStore | undefined>;
  if (!g[globalKey]) g[globalKey] = { jobs: new Map(), current: null };
  return g[globalKey]!;
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9-]{1,64}$/.test(slug);
}

/** Parse "▶ 3/7 …" progress lines and the last "✗ …" error line. */
export function applyOutputLine(job: ApkBuildJob, raw: string) {
  const line = raw.replace(ANSI, "").replace(/\r/g, "");
  if (!line.trim()) return;
  job.lines.push(line);
  if (job.lines.length > MAX_LINES) job.lines.splice(0, job.lines.length - MAX_LINES);
  const progress = line.match(/^▶\s*(\d+)\/(\d+)/);
  if (progress) {
    job.step = Number(progress[1]);
    job.totalSteps = Number(progress[2]);
  }
  const failure = line.match(/^✗\s*(.+)$/);
  if (failure) job.error = failure[1]!.trim();
  const apk = line.match(/^APK:\s*(.+\.apk)$/);
  if (apk) job.apkPath = apk[1]!.trim();
}

export function getApkJob(id: string) {
  return store().jobs.get(id) ?? null;
}

export function startApkBuild(slug: string, install: boolean, root = process.cwd()): ApkBuildJob {
  const s = store();
  if (s.current?.job.status === "running") {
    throw new Error("กำลัง build แอปอื่นอยู่ — รอให้เสร็จก่อน");
  }
  if (!isValidSlug(slug)) throw new Error("ชื่อแอปไม่ถูกต้อง");
  if (!existsSync(join(root, "exports", "apk", slug, "codecraft-app.json"))) {
    throw new Error("ไม่พบไฟล์แอป — กด APK เพื่อบันทึกใหม่");
  }

  const job: ApkBuildJob = {
    id: `b${Date.now().toString(36)}`,
    slug,
    install,
    status: "running",
    lines: [],
    step: 0,
    totalSteps: install ? 7 : 6,
    startedAt: Date.now(),
    finishedAt: null,
    error: null,
    apkPath: null,
  };
  s.jobs.set(job.id, job);

  const args = [join(root, "scripts", "build-apk.sh"), slug, ...(install ? ["--install"] : [])];
  const child = spawn("bash", args, {
    cwd: root,
    env: {
      ...process.env,
      // GUI-launched dev servers on macOS often miss Homebrew / Android paths
      PATH: [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin"].filter(Boolean).join(":"),
      FORCE_COLOR: "0",
      CI: "1",
    },
  });
  s.current = { job, child };

  let buffer = "";
  const onData = (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) applyOutputLine(job, part);
  };
  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);
  child.on("close", (code) => {
    if (buffer) applyOutputLine(job, buffer);
    job.finishedAt = Date.now();
    job.status = code === 0 ? "done" : "error";
    if (code !== 0 && !job.error) job.error = `build หยุดกลางทาง (exit ${code}) — ดู log`;
    if (s.current?.job.id === job.id) s.current = null;
  });
  child.on("error", (err) => {
    job.status = "error";
    job.error = err.message;
    job.finishedAt = Date.now();
  });
  return job;
}

export function cancelApkBuild(id: string) {
  const s = store();
  if (s.current?.job.id === id) {
    s.current.child.kill("SIGTERM");
    s.current.job.error = "ยกเลิกแล้ว";
  }
}

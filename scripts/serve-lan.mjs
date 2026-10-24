#!/usr/bin/env node
/**
 * Classroom server: CodeCraft over HTTPS on the Wi-Fi, so shared apps
 * (/pwa/<id>) install on iPhones and keep working offline.
 *
 *   bun run serve:lan            build once (if needed), then serve
 *   bun run serve:lan --build    rebuild first (after changing CodeCraft itself)
 *
 * Unlike `bun run dev` this serves the production build — a service worker can
 * only keep a production build for offline use. Port 3443 (PORT=… to change),
 * so it can run next to `bun run dev`.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CERT_DIR, ensureLanCert, lanAddresses, readLanCert } from "./lan-cert.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, ".output-lan");
const SERVER = join(OUTPUT, "server", "index.mjs");
const PORT = Number(process.env.PORT) || 3443;

const cert = ensureLanCert();
if (cert.createdCa) console.log("✓ สร้างใบรับรองห้องเรียนใหม่ — มือถือแต่ละเครื่องต้องติดตั้งครั้งแรก (เปิด /cert บนมือถือ)");

if (process.argv.includes("--build") || !existsSync(SERVER)) {
  console.log("▶ build CodeCraft (ครั้งแรกประมาณ 1–2 นาที)");
  const runner = spawnSync("bunx", ["--version"], { stdio: "ignore" }).status === 0 ? "bunx" : "npx";
  const build = spawnSync(runner, ["nuxi", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, CODECRAFT_BUILD_DIR: ".nuxt-lan", CODECRAFT_OUTPUT_DIR: OUTPUT },
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const { cert: certPem, key } = readLanCert();
const server = spawn(process.execPath, [SERVER], {
  cwd: ROOT, // exports/ lives here
  stdio: ["inherit", "pipe", "inherit"],
  env: {
    ...process.env,
    NITRO_SSL_CERT: certPem,
    NITRO_SSL_KEY: key,
    PORT: String(PORT),
    HOST: "0.0.0.0",
    CODECRAFT_PUBLIC_DIR: join(OUTPUT, "public"),
    CODECRAFT_CA_FILE: join(CERT_DIR, "ca.pem"),
  },
});
server.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  if (!text.startsWith("Listening on")) return void process.stdout.write(text);
  const urls = lanAddresses().map((ip) => `https://${ip}:${PORT}`);
  console.log("\n✓ CodeCraft ห้องเรียนพร้อมแล้ว");
  for (const url of urls) console.log(`  editor:  ${url}/editor`);
  console.log(`  มือถือเครื่องใหม่ติดตั้งใบรับรองก่อน: ${urls[0] ?? `https://<ip>:${PORT}`}/cert`);
  console.log("  (ปิดด้วย Ctrl+C)\n");
});
server.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));

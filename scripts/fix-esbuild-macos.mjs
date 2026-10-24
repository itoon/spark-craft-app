#!/usr/bin/env node
/**
 * macOS 26 kills esbuild before main() with SIGKILL (Code Signature Invalid).
 * The copy Bun installs is a hard link whose signature was made by the Go
 * linker (`flags=0x20002`, linker-signed). amfid rejects that, esbuild's
 * service socket closes, and Nuxt reports "The service was stopped".
 *
 * A new inode signed by `codesign --sign -` (plain ad-hoc, not linker-signed)
 * is accepted. No-op when the installed binary already runs, and on other OSes.
 *
 *   node scripts/fix-esbuild-macos.mjs
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, linkSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const primary = join(root, "node_modules/@esbuild/darwin-arm64/bin/esbuild");
const alias = join(root, "node_modules/esbuild/bin/esbuild");

if (process.platform !== "darwin" || !existsSync(primary)) process.exit(0);

function runs(bin) {
  return spawnSync(bin, ["--version"], { encoding: "utf8" }).status === 0;
}

if (runs(primary)) process.exit(0);

const tmp = join(tmpdir(), `codecraft-esbuild-${process.pid}`);
try {
  writeFileSync(tmp, readFileSync(primary));
  chmodSync(tmp, 0o755);
  spawnSync("xattr", ["-c", tmp], { stdio: "ignore" });
  const signed = spawnSync("codesign", ["--force", "--sign", "-", tmp], { encoding: "utf8" });
  if (signed.status !== 0 || !runs(tmp)) {
    console.error(signed.stderr || "codesign could not sign esbuild");
    process.exit(1);
  }

  const bytes = readFileSync(tmp);
  if (existsSync(alias)) unlinkSync(alias);
  unlinkSync(primary);
  writeFileSync(primary, bytes);
  chmodSync(primary, 0o755);
  spawnSync("xattr", ["-c", primary], { stdio: "ignore" });
  const resigned = spawnSync("codesign", ["--force", "--sign", "-", primary], { encoding: "utf8" });
  if (resigned.status !== 0 || !runs(primary)) {
    console.error(resigned.stderr || "esbuild in node_modules is still killed by macOS");
    process.exit(1);
  }
  if (!existsSync(alias)) linkSync(primary, alias);
  console.log("re-signed esbuild so macOS will let Nuxt start");
} finally {
  rmSync(tmp, { force: true });
}

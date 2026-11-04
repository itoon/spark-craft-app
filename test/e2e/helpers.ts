import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";

// Shared setup for the browser specs: each starts its own `nuxt dev` (local
// edition) on a spare port, as `@nuxt/test-utils` `setup({ browser: true })`
// would force a full production build first.

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

export async function waitFor<T>(
  fn: () => Promise<T | undefined | false>,
  timeoutMs: number,
): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* retry */
    }
    if (Date.now() > end) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** Starts `nuxt dev` on a free port and resolves once it answers. */
export async function startDevServer(): Promise<{ server: ChildProcess; base: string }> {
  const port = await freePort();
  const base = `http://localhost:${port}`;
  // Own process group: `bunx` is a wrapper, so killing only its pid would
  // leave `nuxt dev` running after the test.
  const server = spawn("bunx", ["nuxt", "dev", "--port", String(port)], {
    stdio: ["ignore", "ignore", "pipe"],
    detached: true,
    env: { ...process.env, NUXT_PUBLIC_CODECRAFT_WEB: "" },
  });
  let stderr = "";
  server.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  try {
    await waitFor(async () => (await fetch(base)).ok, 40_000);
  } catch (error) {
    console.error(`nuxt dev did not start. stderr:\n${stderr}`);
    throw error;
  }
  return { server, base };
}

export function stopDevServer(server: ChildProcess | undefined) {
  if (server?.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
}

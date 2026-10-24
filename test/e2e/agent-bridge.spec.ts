import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";

// Starts its own `nuxt dev` (local edition) on a spare port and drives the
// editor with headless Chromium, as `@nuxt/test-utils` `setup({ browser: true })`
// would force a full production build first.
let server: ChildProcess;
let browser: Browser;
let base = "";

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

async function waitFor<T>(
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

beforeAll(async () => {
  const port = await freePort();
  base = `http://localhost:${port}`;
  // Own process group: `bunx` is a wrapper, so killing only its pid would
  // leave `nuxt dev` running after the test.
  server = spawn("bunx", ["nuxt", "dev", "--port", String(port)], {
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
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();
  if (server?.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
});

it("an AI op shows up live in the open editor", async () => {
  const page = await browser.newPage();
  await page.goto(`${base}/editor`);

  const project = async () =>
    (await (await fetch(`${base}/api/agent/project`)).json()) as {
      connected: boolean;
      summary: { pages: { id: string }[] };
    };
  const connected = await waitFor(async () => {
    const p = await project();
    return p.connected ? p : false;
  }, 30_000);

  const res = await fetch(`${base}/api/agent/ops`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      op: "add_element",
      args: {
        pageId: connected.summary.pages[0]!.id,
        type: "Button",
        props: { content: "จาก AI" },
      },
    }),
  });
  expect(res.ok).toBe(true);

  await page.getByText("จาก AI").first().waitFor({ timeout: 3000 });
}, 55_000);

import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";

import { startDevServer, stopDevServer, waitFor } from "./helpers";

// Drives the editor with headless Chromium against its own `nuxt dev`.
let server: ChildProcess;
let browser: Browser;
let base = "";

beforeAll(async () => {
  ({ server, base } = await startDevServer());
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();
  stopDevServer(server);
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

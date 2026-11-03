import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright-core";

import { startDevServer, stopDevServer, waitFor } from "./helpers";

// Learner code -> db service -> localStorage -> Database panel, in a real browser.
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

async function op<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${base}/api/agent/ops`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: name, args }),
  });
  if (!res.ok) throw new Error(`${name} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** The first dev load after a lockfile change can 504 once ("Outdated Optimize Dep"); reload fixes it. */
async function openEditor(page: Page, reload = false) {
  const open = async () => {
    if (reload) await page.reload();
    else await page.goto(`${base}/editor`);
    await page.getByTestId("run-button").waitFor({ timeout: 20_000 });
  };
  try {
    await open();
  } catch {
    reload = true;
    await open();
  }
}

it("stores rows from learner code and shows them in the database panel", async () => {
  const page = await browser.newPage();
  await openEditor(page);

  // First visit: the mode chooser covers the editor until a mode is picked (persisted for the reload).
  await page.getByTestId("choose-create").click({ timeout: 10_000 });

  const connected = await waitFor(async () => {
    const p = (await (await fetch(`${base}/api/agent/project`)).json()) as {
      connected: boolean;
      summary: { pages: { id: string }[] };
    };
    return p.connected ? p : false;
  }, 30_000);
  const pageId = connected.summary.pages[0]!.id;

  // 1. Learner code that writes a row on load (no click needed), then Run.
  const added = await op<{ id?: string; result?: { id: string } }>("add_element", {
    pageId,
    type: "Label",
  });
  const labelId = added.result?.id ?? added.id;
  expect(labelId).toBeTruthy();
  await op("set_page_code", {
    pageId,
    code: [
      `var label1 = new Label('${labelId}');`,
      `var t = db.table('tasks');`,
      `t.add({ title: 'x' });`,
      `label1.text = 'rows: ' + t.count();`,
      `page.add(label1);`,
    ].join("\n"),
  });

  await page.getByTestId("run-button").click();
  await page.getByText("rows: 1").first().waitFor({ timeout: 20_000 });

  // 2. The panel lists the table with its row count (stop Run first: it covers the toolbar state).
  await page.getByTestId("run-button").click();
  await page.getByTestId("open-database-panel").click();
  const tasks = page.getByTestId("db-table-tasks");
  await tasks.waitFor({ timeout: 20_000 });
  expect(await tasks.textContent()).toContain("1");

  // 3. Query it from the SQL box.
  const panel = page.getByTestId("database-panel");
  await panel.locator(".cm-content").click();
  await page.keyboard.type("SELECT COUNT(*) AS n FROM tasks");
  await page.getByTestId("db-run-sql").click();
  const result = page.getByTestId("db-sql-result");
  await result.waitFor({ timeout: 5_000 });
  expect(await result.textContent()).toContain("1");

  // 4. The data survives a reload.
  await openEditor(page, true);
  await page.getByTestId("open-database-panel").click();
  const tasksAfter = page.getByTestId("db-table-tasks");
  await tasksAfter.waitFor({ timeout: 20_000 });
  expect(await tasksAfter.textContent()).toContain("1");

  // 5. Reset wipes it and the empty state comes back.
  await page.getByText("ล้างฐานข้อมูล").first().click();
  await page.getByText("ลบทั้งหมด").first().click();
  await page.getByText("ยังไม่มีตาราง", { exact: false }).waitFor({ timeout: 5_000 });
  expect(await page.getByTestId("db-table-tasks").count()).toBe(0);
}, 120_000);

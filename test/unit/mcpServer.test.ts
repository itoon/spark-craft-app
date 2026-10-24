import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CodeCraftClient } from "../../mcp/client";
import { registerTools } from "../../mcp/tools";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

async function setup(fetchImpl: typeof fetch, screenshot?: any) {
  const server = new McpServer({ name: "t", version: "0" });
  registerTools(
    server,
    new CodeCraftClient("http://localhost:3000", fetchImpl),
    { screenshot },
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "c", version: "0" });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe("mcp server", () => {
  it("lists the 14 tools", async () => {
    const c = await setup(vi.fn() as any);
    const names = (await c.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "get_project", "list_component_types", "new_project", "add_page",
        "rename_page", "delete_page", "add_element", "update_element",
        "move_element", "delete_element", "set_page_code",
        "create_share_link", "export_ionic", "get_screenshot",
      ].sort(),
    );
  });

  it("add_element posts the op and returns the id", async () => {
    const f = vi.fn(async () => json({ version: 2, result: { id: "el_42" } }));
    const c = await setup(f as any);
    const args = { pageId: "p1", type: "Button", props: { content: "Hi" } };
    const res: any = await c.callTool({ name: "add_element", arguments: args });
    const [url, init] = f.mock.calls[0] as any;
    expect(url).toBe("http://localhost:3000/api/agent/ops");
    expect(JSON.parse(init.body)).toEqual({ op: "add_element", args });
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain("el_42");
  });

  it("surfaces a 400 statusMessage as isError", async () => {
    const c = await setup(
      (async () => json({ statusCode: 400, statusMessage: "ไม่พบหน้า" }, 400)) as any,
    );
    const res: any = await c.callTool({
      name: "delete_page",
      arguments: { pageId: "x" },
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toBe("ไม่พบหน้า");
  });

  it("reports server down when fetch rejects", async () => {
    const c = await setup((async () => { throw new TypeError("fail"); }) as any);
    const res: any = await c.callTool({ name: "get_project", arguments: {} });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toBe(
      "ต่อ CodeCraft ที่ http://localhost:3000 ไม่ได้ — รัน bun run dev ก่อน",
    );
  });

  it("get_project reports no editor when not connected", async () => {
    const c = await setup((async () => json({ connected: false })) as any);
    const res: any = await c.callTool({ name: "get_project", arguments: {} });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("ยังไม่มี editor เปิดอยู่");
  });

  it("get_screenshot returns an image using the share link", async () => {
    const f = vi.fn(async () => json({ url: "http://localhost:3000/pwa/abc" }));
    const shot = vi.fn(async () => Buffer.from("PNG"));
    const c = await setup(f as any, shot);
    const res: any = await c.callTool({
      name: "get_screenshot",
      arguments: { pageId: "p2", device: "android" },
    });
    const [url, init] = f.mock.calls[0] as any;
    expect(url).toBe("http://localhost:3000/api/agent/share-link");
    expect(JSON.parse(init.body)).toEqual({ startPageId: "p2" });
    expect(shot).toHaveBeenCalledWith("http://localhost:3000/pwa/abc", {
      width: 412,
      height: 915,
    });
    expect(res.content[0]).toEqual({
      type: "image",
      data: Buffer.from("PNG").toString("base64"),
      mimeType: "image/png",
    });
  });
});

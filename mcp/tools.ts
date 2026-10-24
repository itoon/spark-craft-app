import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PREVIEW_DEVICES } from "../app/composables/usePreviewDevices";
import type { CodeCraftClient } from "./client";
import { takeScreenshot } from "./screenshot";

const NO_EDITOR_MESSAGE =
  "ยังไม่มี editor เปิดอยู่ — เปิด http://localhost:3000 ในเบราว์เซอร์ก่อน";

type ToolResult = {
  isError?: boolean;
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  >;
};

const ok = (message: string, data?: unknown): ToolResult => ({
  content: [
    {
      type: "text",
      text:
        data === undefined
          ? message
          : `${message}\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``,
    },
  ],
});

const fail = (e: unknown): ToolResult => ({
  isError: true,
  content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
});

async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    return fail(e);
  }
}

export function registerTools(
  server: McpServer,
  client: CodeCraftClient,
  deps: { screenshot?: typeof takeScreenshot } = {},
): void {
  const screenshot = deps.screenshot ?? takeScreenshot;

  server.registerTool(
    "get_project",
    {
      description:
        "Get the current CodeCraft project: name, pages, element tree per page (id, type, props, children) and code per page. Call this first, before any edit, to learn the ids you need.",
    },
    () =>
      guard(async () => {
        const res = await client.get<{ connected: boolean; summary: unknown }>(
          "/api/agent/project",
        );
        if (!res.connected) return fail(new Error(NO_EDITOR_MESSAGE));
        return ok("อ่านโปรเจกต์แล้ว", res.summary);
      }),
  );

  server.registerTool(
    "list_component_types",
    {
      description:
        "List element types you may add, with defaultProps and supported events. Call this before add_element. Prop names come from defaultProps (e.g. a Button's label is `content`, not `text`). Events such as onClick are not props: handle them in page code with set_page_code.",
    },
    () =>
      guard(async () =>
        ok(
          "ได้รายการ component แล้ว",
          await client.get("/api/agent/components"),
        ),
      ),
  );

  // Edit tools: each posts { op: <tool name>, args } to /api/agent/ops.
  const editTool = (
    name: string,
    description: string,
    inputSchema: z.ZodRawShape,
    success: string,
  ) =>
    server.registerTool(name, { description, inputSchema }, (args: any) =>
      guard(async () => {
        const res = await client.post<{ version: number; result: unknown }>(
          "/api/agent/ops",
          { op: name, args },
        );
        return ok(success, res.result);
      }),
    );

  editTool(
    "new_project",
    "Replace the whole project with a blank one (one page with a root container). Destroys existing work; use only when asked to start over.",
    { name: z.string().describe("Project name") },
    "สร้างโปรเจกต์ใหม่แล้ว",
  );
  editTool(
    "add_page",
    "Add a page with its own root container. Returns the new page id.",
    { name: z.string().describe("Page name") },
    "เพิ่มหน้าแล้ว",
  );
  editTool(
    "rename_page",
    "Rename a page.",
    { pageId: z.string(), name: z.string() },
    "เปลี่ยนชื่อหน้าแล้ว",
  );
  editTool(
    "delete_page",
    "Delete a page with its elements and code. The last page cannot be deleted.",
    { pageId: z.string() },
    "ลบหน้าแล้ว",
  );
  editTool(
    "add_element",
    "Add an element to a page. parentId defaults to the page's root container; it must be a container. props are merged over the type's defaultProps (see list_component_types). Returns the new element id. Call get_screenshot afterwards to check the design.",
    {
      pageId: z.string(),
      type: z.string().describe("Element type from list_component_types"),
      parentId: z.string().optional(),
      index: z.number().int().optional().describe("Position among siblings"),
      props: z.record(z.string(), z.any()).optional(),
    },
    "เพิ่ม element แล้ว",
  );
  editTool(
    "update_element",
    "Merge props into an existing element. Use prop names from defaultProps.",
    { id: z.string(), props: z.record(z.string(), z.any()) },
    "แก้ไข element แล้ว",
  );
  editTool(
    "move_element",
    "Move an element to another container and/or position.",
    {
      id: z.string(),
      parentId: z.string(),
      index: z.number().int().optional(),
    },
    "ย้าย element แล้ว",
  );
  editTool(
    "delete_element",
    "Delete an element and its children. A root container cannot be deleted.",
    { id: z.string() },
    "ลบ element แล้ว",
  );
  editTool(
    "set_page_code",
    "Set the JavaScript of a page. Use it for behaviour such as onClick handlers; events are wired in code, not in props.",
    { pageId: z.string(), code: z.string() },
    "ตั้งโค้ดของหน้าแล้ว",
  );

  server.registerTool(
    "create_share_link",
    {
      description:
        "Create a URL that runs the app on a phone (the preview). Give the user a lanUrls entry: `url` is localhost and only opens on this computer. Optionally start on a given page.",
      inputSchema: { startPageId: z.string().optional() },
    },
    ({ startPageId }: { startPageId?: string }) =>
      guard(async () => {
        const res = await client.post<{ url: string; lanUrls?: string[] }>(
          "/api/agent/share-link",
          { startPageId },
        );
        const lanUrls = res.lanUrls ?? [];
        const message = lanUrls.length
          ? `สร้างลิงก์แล้ว — เปิดบนมือถือที่ต่อ Wi-Fi เดียวกัน:\n${lanUrls.map((u) => `- ${u}`).join("\n")}`
          : "สร้างลิงก์แล้ว";
        return ok(message, res);
      }),
  );

  server.registerTool(
    "export_ionic",
    {
      description:
        "Export the project as an Ionic Vue project on disk and return its path.",
    },
    () =>
      guard(async () =>
        ok("ส่งออก Ionic แล้ว", await client.post("/api/agent/export-ionic")),
      ),
  );

  server.registerTool(
    "get_screenshot",
    {
      description:
        "Return a PNG of the running app so you can see your own design and fix it. Call after design changes. Optional pageId (start page) and device ('iphone15' default, or 'android').",
      inputSchema: {
        pageId: z.string().optional(),
        device: z.enum(["iphone15", "android"]).optional(),
      },
    },
    ({ pageId, device }: { pageId?: string; device?: string }) =>
      guard(async () => {
        const preset =
          PREVIEW_DEVICES.find((d) => d.id === device) ?? PREVIEW_DEVICES[0]!;
        const { url } = await client.post<{ url: string }>(
          "/api/agent/share-link",
          { startPageId: pageId },
        );
        const png = await screenshot(url, {
          width: preset.canvasW,
          height: preset.canvasH,
        });
        return {
          content: [
            {
              type: "image",
              data: png.toString("base64"),
              mimeType: "image/png",
            },
          ],
        };
      }),
  );
}

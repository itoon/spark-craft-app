import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CodeCraftClient } from "./client";
import { registerTools } from "./tools";

const server = new McpServer({ name: "codecraft", version: "0.1.0" });
registerTools(server, new CodeCraftClient());

await server.connect(new StdioServerTransport());
// stdout belongs to the MCP transport; log to stderr only.
console.error("CodeCraft MCP server ready");

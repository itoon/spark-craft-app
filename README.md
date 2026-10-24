# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## ให้ AI สร้างแอป (MCP)

CodeCraft มี MCP server ให้ AI (Claude Code / Claude Desktop) แก้โปรเจกต์ที่เปิดอยู่ใน editor ได้ เช่น เพิ่มหน้า เพิ่ม element เขียนโค้ด ขอลิงก์พรีวิว ส่งออก Ionic และถ่าย screenshot ของแอปเพื่อดูผลงานตัวเอง

1. รัน `bun run dev` แล้วเปิด http://localhost:3000 ในเบราว์เซอร์ (ต้องเปิด editor ค้างไว้)
2. ติดตั้ง Chromium สำหรับ screenshot (ครั้งเดียว): `bunx playwright install chromium`
3. เพิ่ม MCP server

Claude Code:

```bash
claude mcp add codecraft -- bun /absolute/path/codecraftapp/mcp/server.ts
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "codecraft": {
      "command": "bun",
      "args": ["/absolute/path/codecraftapp/mcp/server.ts"],
      "env": { "CODECRAFT_URL": "http://localhost:3000" }
    }
  }
}
```

`CODECRAFT_URL` ไม่ต้องใส่ถ้าใช้พอร์ต 3000 ตามปกติ

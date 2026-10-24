import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createError, setHeader } from "h3";

import { shareIdParam, sharedLinksDir } from "../../../utils/pwaApp";

/** Home-screen icon of a shared app (saved by POST /api/export/link). */
export default defineEventHandler(async (event) => {
  const id = shareIdParam(event);
  try {
    const png = await readFile(join(sharedLinksDir(), `${id}.png`));
    setHeader(event, "Content-Type", "image/png");
    setHeader(event, "Cache-Control", "no-cache");
    return png;
  } catch {
    throw createError({ statusCode: 404, statusMessage: "No icon for this app" });
  }
});

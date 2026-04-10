import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createError } from "h3";

import type { SharedExportRecord } from "../../../../app/utils/sharedExport";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing share id" });
  }

  const filePath = join(process.cwd(), "exports", "shared-links", `${id}.json`);

  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as SharedExportRecord;
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Shared export not found",
    });
  }
});

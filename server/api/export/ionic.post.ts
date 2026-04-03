import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { buildExportFolderName, buildIonicProjectFiles, type IonicExportPayload } from "../../../app/utils/ionicExport";

export default defineEventHandler(async (event) => {
  const body = await readBody<IonicExportPayload>(event);

  const payload: IonicExportPayload = {
    appName: body.appName?.trim() || "CodeCraft Ionic App",
    pages: Array.isArray(body.pages) ? body.pages : [],
    elements: Array.isArray(body.elements) ? body.elements : [],
    jsCodeByPage: body.jsCodeByPage ?? {},
    startPageId: body.startPageId || body.pages?.[0]?.id || "page1",
  };

  const folderName = buildExportFolderName(payload.appName);
  const outputDir = join(process.cwd(), "exports", "ionic", folderName);
  const files = buildIonicProjectFiles(payload);

  await mkdir(outputDir, { recursive: true });

  for (const file of files) {
    const destination = join(outputDir, file.path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.content, "utf8");
  }

  return {
    ok: true,
    outputDir,
    folderName,
    fileCount: files.length,
  };
});

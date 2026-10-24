import type { IonicExportPayload } from "../../../app/utils/ionicExport";
import { writeIonicExport } from "../../utils/exportWriters";

export default defineEventHandler(async (event) => {
  const body = await readBody<IonicExportPayload>(event);
  const { outputDir, folderName, fileCount } = await writeIonicExport(body);

  return {
    ok: true,
    outputDir,
    folderName,
    fileCount,
  };
});

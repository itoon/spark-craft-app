import { access } from "node:fs/promises";
import { join } from "node:path";

import { setHeader } from "h3";

import { buildWebManifest, readSharedRecord, shareIdParam, sharedLinksDir } from "../../../utils/pwaApp";

export default defineEventHandler(async (event) => {
  const id = shareIdParam(event);
  const record = await readSharedRecord(id);
  const hasIcon = await access(join(sharedLinksDir(), `${id}.png`)).then(() => true, () => false);
  setHeader(event, "Content-Type", "application/manifest+json; charset=utf-8");
  return buildWebManifest({ ...record, id }, hasIcon);
});

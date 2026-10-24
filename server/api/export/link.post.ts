import { join } from "node:path";

import { getRequestHost, getRequestProtocol } from "h3";

import type { SharedExportPayload } from "../../../app/utils/sharedExport";
import { writeSharedLink } from "../../utils/exportWriters";

export default defineEventHandler(async (event) => {
  const body = await readBody<SharedExportPayload & { icon?: unknown }>(event);

  const { id } = await writeSharedLink(body, typeof body.icon === "string" ? body.icon : undefined);
  const filePath = join(process.cwd(), "exports", "shared-links", `${id}.json`);

  const protocol = getRequestProtocol(event, { xForwardedProto: true });
  const host = getRequestHost(event, { xForwardedHost: true });
  const shareUrl = `${protocol}://${host}/pwa/${id}`;

  return {
    ok: true,
    id,
    shareUrl,
    filePath,
    reused: Boolean(body.shareId?.trim()),
  };
});

import { createError, getHeader, readBody } from "h3";

import { addLiveLog, getLiveSession, touchLiveClient } from "../../../utils/liveSessions";

/** Phone → editor: runtime console output and errors. */
export default defineEventHandler(async (event) => {
  const session = getLiveSession(getRouterParam(event, "code") ?? "");
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: "Live session not found" });
  }

  const body = await readBody<{
    clientId?: string;
    entries?: { type?: string; message?: string }[];
  }>(event);
  const clientId = String(body?.clientId ?? "");
  touchLiveClient(session, clientId, getHeader(event, "user-agent") ?? "");

  const entries = Array.isArray(body?.entries) ? body.entries.slice(0, 50) : [];
  for (const entry of entries) {
    addLiveLog(session, { clientId, type: entry.type, message: entry.message });
  }
  return { ok: true, count: entries.length };
});

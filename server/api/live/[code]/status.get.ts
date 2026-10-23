import { createError, getQuery, setResponseHeader } from "h3";

import { activeLiveClients, getLiveSession } from "../../../utils/liveSessions";

/** Editor polls this to show connected phones and their console output. */
export default defineEventHandler((event) => {
  const session = getLiveSession(getRouterParam(event, "code") ?? "");
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: "Live session not found" });
  }

  const afterSeq = Number(getQuery(event).after ?? 0) || 0;
  setResponseHeader(event, "Cache-Control", "no-store");

  return {
    code: session.code,
    version: session.version,
    clients: activeLiveClients(session).map((client) => ({
      id: client.id,
      platform: client.platform,
      userAgent: client.userAgent,
      lastSeen: client.lastSeen,
    })),
    logs: session.logs.filter((log) => log.seq > afterSeq),
  };
});

import { createError, getHeader, getQuery, setResponseHeader } from "h3";

import {
  getLiveSession,
  touchLiveClient,
  waitForLiveVersion,
} from "../../utils/liveSessions";

/**
 * Phone side of the Live Companion. Long poll: answers right away when the
 * editor has pushed something newer than `since`, otherwise waits (max 25 s)
 * and answers `{ changed: false }`.
 */
export default defineEventHandler(async (event) => {
  const session = getLiveSession(getRouterParam(event, "code") ?? "");
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: "Live session not found" });
  }

  const query = getQuery(event);
  const since = Number(query.since ?? -1);
  const clientId = String(query.client ?? "");
  const userAgent = getHeader(event, "user-agent") ?? "";
  touchLiveClient(session, clientId, userAgent);

  setResponseHeader(event, "Cache-Control", "no-store");

  if (Number.isFinite(since) && session.version <= since && query.wait !== "0") {
    await waitForLiveVersion(session, since, undefined, {
      onAbort: (cb) => event.node.req.on("close", cb),
    });
    // A long wait is also a sign of life.
    touchLiveClient(session, clientId, userAgent);
  }

  const changed = session.version > since && session.payload !== null;
  return {
    code: session.code,
    version: session.version,
    changed,
    payload: changed ? session.payload : null,
  };
});

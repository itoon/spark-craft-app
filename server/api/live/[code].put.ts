import { createError, readBody } from "h3";

import type { SharedExportPayload } from "../../../app/utils/sharedExport";
import { getLiveSession, publishLivePayload } from "../../utils/liveSessions";

/** Editor side: push the latest project snapshot to every connected phone. */
export default defineEventHandler(async (event) => {
  const session = getLiveSession(getRouterParam(event, "code") ?? "");
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: "Live session not found" });
  }

  const body = await readBody<Partial<SharedExportPayload>>(event);
  if (!body || !Array.isArray(body.pages) || !Array.isArray(body.elements)) {
    throw createError({ statusCode: 400, statusMessage: "pages and elements are required" });
  }

  const payload: SharedExportPayload = {
    appName: body.appName?.trim() || "CodeCraft App",
    pages: body.pages,
    elements: body.elements,
    jsCodeByPage: body.jsCodeByPage ?? {},
    startPageId: body.startPageId || body.pages[0]?.id || "page1",
    activeDeviceId: body.activeDeviceId || "android",
    shareId: `live-${session.code}`,
  };

  const version = publishLivePayload(session, payload);
  return { ok: true, version };
});

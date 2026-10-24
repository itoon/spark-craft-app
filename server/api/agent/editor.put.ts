import { createError } from "h3";

import { pushEditorState } from "../../utils/agentBridge";
import { assertLocalRequest } from "../../utils/localOnly";
import { readEditorState, readTabId } from "../../utils/agentValidate";

/** The active editor tab pushes a changed state; stale or non-active tabs get 409. */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const body = await readBody<Record<string, unknown>>(event);
  const tabId = readTabId(body?.tabId);
  const state = readEditorState(body?.state);
  const baseVersion = Number(body?.baseVersion);
  if (!Number.isFinite(baseVersion)) {
    throw createError({ statusCode: 400, statusMessage: "baseVersion ต้องเป็นตัวเลข" });
  }

  const outcome = pushEditorState(tabId, baseVersion, state);
  if (!outcome.ok) {
    throw createError({
      statusCode: 409,
      statusMessage: "Conflict",
      data: { reason: outcome.reason, version: outcome.version, state: outcome.state },
    });
  }
  return { version: outcome.version };
});

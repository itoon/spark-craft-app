import { releaseEditor } from "../../../utils/agentBridge";
import { assertLocalRequest } from "../../../utils/localOnly";
import { readTabId } from "../../../utils/agentValidate";

/** The active tab is going away (closed, reloaded, navigated): stop AI edits into it. */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const body = await readBody<Record<string, unknown>>(event);
  releaseEditor(readTabId(body?.tabId));
  return { ok: true };
});

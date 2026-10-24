import { getQuery, setResponseHeader, setResponseStatus } from "h3";

import { touchEditor, waitForEditorUpdate } from "../../utils/agentBridge";
import { assertLocalRequest } from "../../utils/localOnly";
import { readTabId } from "../../utils/agentValidate";

/**
 * Editor side long poll: answers with the newest state when the agent (or
 * another tab) wrote something after `since`, otherwise 204 after ~25 s.
 * When no tab owns the bridge (server restarted, owner released it) it answers
 * at once with `{ state: null, active: false }` so the tab claims again.
 * Polling is also what keeps the tab "connected".
 */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const query = getQuery(event);
  const tabId = readTabId(query.tabId);
  const since = Number(query.since ?? -1);

  setResponseHeader(event, "Cache-Control", "no-store");
  touchEditor(tabId);
  const update = await waitForEditorUpdate(tabId, Number.isFinite(since) ? since : -1);
  touchEditor(tabId);

  if (!update) {
    setResponseStatus(event, 204);
    return null;
  }
  return update;
});

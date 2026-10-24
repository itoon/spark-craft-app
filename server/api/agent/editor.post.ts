import { claimEditor } from "../../utils/agentBridge";
import { assertLocalRequest } from "../../utils/localOnly";
import { readEditorState, readTabId } from "../../utils/agentValidate";

/** The editor tab announces itself and hands over its project state. */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const body = await readBody<Record<string, unknown>>(event);
  const tabId = readTabId(body?.tabId);
  const state = readEditorState(body?.state);
  return { version: claimEditor(tabId, state).version };
});

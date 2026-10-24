import { createError, getRequestHost, getRequestProtocol } from "h3";

import { getAgentBridge, isEditorConnected, NO_EDITOR_MESSAGE } from "../../utils/agentBridge";
import { statePayload, writeSharedLink } from "../../utils/exportWriters";
import { assertLocalRequest } from "../../utils/localOnly";

/** Writes the current project as a shared link; the id is kept so repeats reuse one file. */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const bridge = getAgentBridge();
  if (!isEditorConnected() || !bridge.state) {
    throw createError({ statusCode: 400, statusMessage: NO_EDITOR_MESSAGE });
  }
  const body = await readBody<{ startPageId?: unknown } | null>(event);
  const startPageId = typeof body?.startPageId === "string" ? body.startPageId : undefined;

  const { id } = await writeSharedLink(statePayload(bridge.state, startPageId));
  // Remember the id (no version bump) so the editor's next sync picks it up.
  if (bridge.state) bridge.state.shareLinkId = id;

  const protocol = getRequestProtocol(event, { xForwardedProto: true });
  const host = getRequestHost(event, { xForwardedHost: true });
  return { url: `${protocol}://${host}/pwa/${id}` };
});

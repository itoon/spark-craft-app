import { createError, getRequestHost, getRequestProtocol } from "h3";

import { getAgentBridge, isEditorConnected, NO_EDITOR_MESSAGE } from "../../utils/agentBridge";
import { statePayload, writeSharedLink } from "../../utils/exportWriters";
import { listLanAddresses, portOfHost } from "../../utils/lanAddresses";
import { assertLocalRequest } from "../../utils/localOnly";

/**
 * Writes the current project as the AI's own shared link. Its id lives on the
 * bridge (never the editor's shareLinkId) so repeats reuse one file and the
 * learner's link is left alone. `lanUrls` open on a phone on the same Wi-Fi.
 */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const bridge = getAgentBridge();
  if (!isEditorConnected() || !bridge.state) {
    throw createError({ statusCode: 400, statusMessage: NO_EDITOR_MESSAGE });
  }
  const body = await readBody<{ startPageId?: unknown } | null>(event);
  const startPageId = typeof body?.startPageId === "string" ? body.startPageId : undefined;

  const { id } = await writeSharedLink({
    ...statePayload(bridge.state, startPageId),
    shareId: bridge.agentShareId,
  });
  bridge.agentShareId = id;

  const protocol = getRequestProtocol(event, { xForwardedProto: true });
  const host = getRequestHost(event, { xForwardedHost: true });
  const port = portOfHost(host);
  const lanUrls = listLanAddresses().map(({ address }) => `${protocol}://${address}:${port}/pwa/${id}`);
  return { url: `${protocol}://${host}/pwa/${id}`, lanUrls };
});

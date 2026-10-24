import { summarizeProject } from "../../../app/utils/projectOps";
import { getAgentBridge, isEditorConnected } from "../../utils/agentBridge";
import { assertLocalRequest } from "../../utils/localOnly";

export default defineEventHandler((event) => {
  assertLocalRequest(event);
  const bridge = getAgentBridge();
  return {
    connected: isEditorConnected(),
    version: bridge.version,
    state: bridge.state,
    summary: bridge.state ? summarizeProject(bridge.state) : null,
  };
});

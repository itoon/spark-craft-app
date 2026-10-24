import { createError } from "h3";

import { getAgentBridge, isEditorConnected, NO_EDITOR_MESSAGE } from "../../utils/agentBridge";
import { writeIonicExport } from "../../utils/exportWriters";
import { assertLocalRequest } from "../../utils/localOnly";

export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const bridge = getAgentBridge();
  if (!isEditorConnected() || !bridge.state) {
    throw createError({ statusCode: 400, statusMessage: NO_EDITOR_MESSAGE });
  }
  const state = bridge.state;
  return writeIonicExport({
    appName: state.projectName,
    pages: state.pages,
    elements: state.elements,
    jsCodeByPage: state.jsCodeByPage,
    startPageId: state.pages[0]?.id || "page1",
  });
});

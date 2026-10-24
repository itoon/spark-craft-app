import { createError } from "h3";

import { ProjectOpError, type ProjectOp } from "../../../app/utils/projectOps";
import { applyAgentOp } from "../../utils/agentBridge";
import { assertLocalRequest } from "../../utils/localOnly";

export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const body = await readBody<Record<string, unknown>>(event);
  if (typeof body?.op !== "string" || !body.op) {
    throw createError({ statusCode: 400, statusMessage: "ต้องระบุ op" });
  }
  const args = body.args && typeof body.args === "object" ? body.args : {};

  try {
    return applyAgentOp({ op: body.op, args } as ProjectOp);
  } catch (error) {
    if (error instanceof ProjectOpError) {
      throw createError({ statusCode: 400, statusMessage: error.message });
    }
    throw error;
  }
});

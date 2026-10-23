import { createError, getRouterParam } from "h3";

import { findAdb } from "../../../../../utils/adb";
import { adbRunner, advancePairing, getPairingSession } from "../../../../../utils/adbPairing";
import { assertLocalRequest } from "../../../../../utils/localOnly";

/** Poll a QR pairing attempt; each call moves it one step (scan → pair → connect). */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const session = getPairingSession(String(getRouterParam(event, "id") ?? ""));
  if (!session) throw createError({ statusCode: 404, statusMessage: "ไม่พบ QR นี้ — กดสร้าง QR ใหม่" });
  const adb = findAdb();
  if (!adb) throw createError({ statusCode: 409, statusMessage: "ไม่พบ adb บนคอมนี้" });
  await advancePairing(session, adbRunner(adb));
  return { status: session.status, message: session.message };
});

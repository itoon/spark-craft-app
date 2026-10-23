import { createError } from "h3";

import { findAdb } from "../../../../utils/adb";
import { createPairingCredentials, pairingQrText } from "../../../../utils/adbMdns";
import { createPairingSession, storePairingSession } from "../../../../utils/adbPairing";
import { assertLocalRequest } from "../../../../utils/localOnly";

/**
 * Start a "Pair device with QR code" attempt: returns the QR text the phone
 * scans in Wireless debugging. Poll GET …/qr/<id> to finish pairing.
 */
export default defineEventHandler((event) => {
  assertLocalRequest(event);
  if (!findAdb()) throw createError({ statusCode: 409, statusMessage: "ไม่พบ adb บนคอมนี้" });
  const session = createPairingSession(createPairingCredentials());
  storePairingSession(session);
  return { id: session.id, qr: pairingQrText(session) };
});

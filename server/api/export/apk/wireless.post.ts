import { execFile } from "node:child_process";

import { createError, readBody } from "h3";

import { findAdb } from "../../../utils/adb";
import { isPairingCode, parseWirelessTarget, wirelessResultOk } from "../../../utils/adbWireless";
import { assertLocalRequest } from "../../../utils/localOnly";

/**
 * Wireless debugging (Android 11+): pair once with the 6-digit code, then
 * connect. After that the phone shows up in `adb devices` like a USB phone,
 * so "Build + ติดตั้งลงมือถือ" works without a cable.
 */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const body = await readBody<{ action?: string; target?: string; code?: string }>(event);
  const action = body?.action === "pair" ? "pair" : body?.action === "connect" ? "connect" : null;
  const target = parseWirelessTarget(String(body?.target ?? ""));
  if (!action || !target) {
    throw createError({ statusCode: 400, statusMessage: "ใส่ IP:พอร์ต ให้ถูก เช่น 192.168.1.23:37099" });
  }
  const code = String(body?.code ?? "").trim();
  if (action === "pair" && !isPairingCode(code)) {
    throw createError({ statusCode: 400, statusMessage: "รหัสจับคู่ต้องเป็นตัวเลข 6 หลัก" });
  }
  const adb = findAdb();
  if (!adb) throw createError({ statusCode: 409, statusMessage: "ไม่พบ adb บนคอมนี้" });

  const address = `${target.host}:${target.port}`;
  const args = action === "pair" ? ["pair", address, code] : ["connect", address];
  const output = await new Promise<string>((resolve) => {
    execFile(adb, args, { timeout: 20_000 }, (error, stdout, stderr) =>
      resolve(`${stdout ?? ""}${stderr ?? ""}${error && !stdout ? error.message : ""}`.trim()),
    );
  });
  return { ok: wirelessResultOk(action, output), output };
});

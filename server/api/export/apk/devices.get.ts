import { execFile } from "node:child_process";

import { findAdb, parseAdbDevices, type UsbDevice } from "../../../utils/adb";
import { parseMdnsServices } from "../../../utils/adbMdns";
import { adbRunner } from "../../../utils/adbPairing";
import { assertLocalRequest } from "../../../utils/localOnly";

/**
 * Phones adb can install to (USB or Wi-Fi), so the dialog can say
 * "เจอมือถือ Pixel 7" or explain what to switch on. With no phone connected,
 * reconnect phones paired over Wi-Fi earlier: their port changes every time
 * Wireless debugging is switched on, so find them again via mDNS.
 */
export default defineEventHandler(async (event) => {
  assertLocalRequest(event);
  const adb = findAdb();
  if (!adb) return { adb: false, devices: [] as UsbDevice[] };
  const run = adbRunner(adb);
  // stdout only: "* daemon started…" on stderr would read as a device row
  const listDevices = () =>
    new Promise<UsbDevice[]>((resolve) => {
      execFile(adb, ["devices", "-l"], { timeout: 8000 }, (_error, stdout) => resolve(parseAdbDevices(stdout ?? "")));
    });

  let devices = await listDevices();
  if (!devices.some((device) => device.state === "device")) {
    const paired = parseMdnsServices(await run(["mdns", "services"])).filter((s) => s.type === "connect");
    // Phones not paired with this computer refuse the connection, so trying
    // every one is harmless; in parallel so a classroom of phones stays quick
    await Promise.all(paired.map((s) => run(["connect", `${s.host}:${s.port}`])));
    if (paired.length) devices = await listDevices();
  }
  return { adb: true, devices };
});

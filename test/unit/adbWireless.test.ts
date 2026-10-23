import { describe, expect, it } from "vitest";

import { isPairingCode, parseWirelessTarget, wirelessResultOk } from "../../server/utils/adbWireless";

describe("adb wireless input", () => {
  it("accepts LAN ip:port only", () => {
    expect(parseWirelessTarget(" 192.168.1.23:37099 ")).toEqual({ host: "192.168.1.23", port: 37099 });
    expect(parseWirelessTarget("192.168.1.300:5555")).toBeNull();
    expect(parseWirelessTarget("192.168.1.23")).toBeNull();
    expect(parseWirelessTarget("evil.com:5555; rm -rf /")).toBeNull();
    expect(parseWirelessTarget("192.168.1.23:99999")).toBeNull();
  });

  it("checks the 6-digit pairing code", () => {
    expect(isPairingCode("123456")).toBe(true);
    expect(isPairingCode("12345")).toBe(false);
    expect(isPairingCode("12a456")).toBe(false);
  });

  it("reads adb output", () => {
    expect(wirelessResultOk("pair", "Successfully paired to 192.168.1.23:37099 [guid=adb-x]")).toBe(true);
    expect(wirelessResultOk("pair", "Failed: Unable to start pairing client.")).toBe(false);
    expect(wirelessResultOk("connect", "connected to 192.168.1.23:41235")).toBe(true);
    expect(wirelessResultOk("connect", "already connected to 192.168.1.23:41235")).toBe(true);
    expect(wirelessResultOk("connect", "failed to connect to '192.168.1.23:41235': Connection refused")).toBe(false);
    expect(wirelessResultOk("connect", "cannot connect to 192.168.1.23:41235: No route to host")).toBe(false);
  });
});

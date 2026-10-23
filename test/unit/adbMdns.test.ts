import { describe, expect, it } from "vitest";

import {
  createPairingCredentials,
  parseMdnsServices,
  pairingQrText,
} from "../../server/utils/adbMdns";
import { advancePairing, createPairingSession, type AdbRunner } from "../../server/utils/adbPairing";

const MDNS_OUTPUT = `List of discovered mdns services
adb-R5CT1234ABC-xYz12a\t_adb-tls-connect._tcp\t192.168.1.23:41235
codecraft-ab12cd\t_adb-tls-pairing._tcp\t192.168.1.23:37099
adb-OTHER-q1w2e3\t_adb-tls-connect._tcp.\t192.168.1.40:39001
`;

describe("adb mdns services", () => {
  it("parses pairing and connect services", () => {
    expect(parseMdnsServices(MDNS_OUTPUT)).toEqual([
      { name: "adb-R5CT1234ABC-xYz12a", type: "connect", host: "192.168.1.23", port: 41235 },
      { name: "codecraft-ab12cd", type: "pairing", host: "192.168.1.23", port: 37099 },
      { name: "adb-OTHER-q1w2e3", type: "connect", host: "192.168.1.40", port: 39001 },
    ]);
  });

  it("ignores headers, blank lines and non-LAN addresses", () => {
    expect(parseMdnsServices("List of discovered mdns services\n\n")).toEqual([]);
    expect(parseMdnsServices("x\t_adb-tls-connect._tcp\tevil.com:5555")).toEqual([]);
  });
});

describe("QR pairing credentials", () => {
  it("makes a codecraft service name and a password that are safe in the QR", () => {
    const { name, password } = createPairingCredentials();
    expect(name).toMatch(/^codecraft-[a-z0-9]{6}$/);
    expect(password).toMatch(/^[A-Za-z0-9]{10}$/);
  });

  it("uses Android's wireless-debugging QR format", () => {
    expect(pairingQrText({ name: "codecraft-ab12cd", password: "Pw12345678" })).toBe(
      "WIFI:T:ADB;S:codecraft-ab12cd;P:Pw12345678;;",
    );
  });
});

function fakeAdb(responses: Record<string, string[]>): { run: AdbRunner; calls: string[] } {
  const calls: string[] = [];
  const run: AdbRunner = async (args) => {
    const key = args.join(" ");
    calls.push(key);
    const queue = responses[key];
    return queue && queue.length > 1 ? queue.shift()! : (queue?.[0] ?? "");
  };
  return { run, calls };
}

describe("QR pairing session", () => {
  const credentials = { name: "codecraft-ab12cd", password: "Pw12345678" };

  it("waits until the phone has scanned the QR", async () => {
    const session = createPairingSession(credentials, 1000);
    const { run, calls } = fakeAdb({ "mdns services": ["List of discovered mdns services\n"] });

    await advancePairing(session, run, 2000);

    expect(session.status).toBe("waiting");
    expect(calls).toEqual(["mdns services"]);
  });

  it("pairs with the scanned phone, then connects to it", async () => {
    const session = createPairingSession(credentials, 1000);
    const { run, calls } = fakeAdb({
      "mdns services": [MDNS_OUTPUT],
      "pair 192.168.1.23:37099 Pw12345678": ["Successfully paired to 192.168.1.23:37099 [guid=adb-R5CT1234ABC-xYz12a]"],
      "connect 192.168.1.23:41235": ["connected to 192.168.1.23:41235"],
    });

    await advancePairing(session, run, 2000);
    expect(session.status).toBe("connecting");
    await advancePairing(session, run, 3000);

    expect(session.status).toBe("connected");
    expect(session.host).toBe("192.168.1.23");
    // only the phone that was paired, not other phones on the Wi-Fi
    expect(calls).not.toContain("connect 192.168.1.40:39001");
  });

  it("reports a failed pairing", async () => {
    const session = createPairingSession(credentials, 1000);
    const { run } = fakeAdb({
      "mdns services": [MDNS_OUTPUT],
      "pair 192.168.1.23:37099 Pw12345678": ["Failed: Wrong password or connection was dropped."],
    });

    await advancePairing(session, run, 2000);

    expect(session.status).toBe("failed");
    expect(session.message).toContain("Wrong password");
  });

  it("expires a QR nobody scanned", async () => {
    const session = createPairingSession(credentials, 1000);
    const { run, calls } = fakeAdb({});

    await advancePairing(session, run, 1000 + 3 * 60_000 + 1);

    expect(session.status).toBe("expired");
    expect(calls).toEqual([]);
  });
});

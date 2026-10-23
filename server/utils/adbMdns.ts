import { randomInt } from "node:crypto";

import { parseWirelessTarget } from "./adbWireless";

/**
 * Pair-with-QR-code (Android 11+ wireless debugging), the way Android Studio
 * does it: the QR carries a service name + password, the phone then
 * advertises `_adb-tls-pairing._tcp` under that name, and `adb mdns services`
 * tells us its IP:port. Paired phones advertise `_adb-tls-connect._tcp`.
 */

export interface MdnsService {
  name: string;
  type: "pairing" | "connect";
  host: string;
  port: number;
}

export interface PairingCredentials {
  name: string;
  password: string;
}

/** `adb mdns services` → one entry per pairing/connect service on a LAN IPv4. */
export function parseMdnsServices(output: string): MdnsService[] {
  const services: MdnsService[] = [];
  for (const line of output.split("\n")) {
    const [name = "", rawType = "", address = ""] = line.trim().split(/\s+/);
    const type = rawType.includes("_adb-tls-pairing")
      ? "pairing"
      : rawType.includes("_adb-tls-connect")
        ? "connect"
        : null;
    const target = parseWirelessTarget(address);
    if (!name || !type || !target) continue;
    services.push({ name, type, host: target.host, port: target.port });
  }
  return services;
}

const LOWER = "abcdefghijklmnopqrstuvwxyz0123456789";
const MIXED = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomString(alphabet: string, length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

export function createPairingCredentials(): PairingCredentials {
  return {
    name: `codecraft-${randomString(LOWER, 6)}`,
    password: randomString(MIXED, 10),
  };
}

/** The text Android's "Pair device with QR code" scanner expects. */
export function pairingQrText({ name, password }: PairingCredentials) {
  return `WIFI:T:ADB;S:${name};P:${password};;`;
}

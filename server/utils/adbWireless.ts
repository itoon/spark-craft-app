/** Input checks for `adb pair` / `adb connect` (Android 11+ wireless debugging). */

export interface WirelessTarget {
  host: string;
  port: number;
}

/** "192.168.1.23:37099" → { host, port }; LAN IPv4 only. */
export function parseWirelessTarget(value: string): WirelessTarget | null {
  const match = value.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{2,5})$/);
  if (!match) return null;
  const host = match[1]!;
  const port = Number(match[2]);
  if (host.split(".").some((part) => Number(part) > 255)) return null;
  if (port < 1 || port > 65535) return null;
  return { host, port };
}

export function isPairingCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

/** adb prints success on stdout but exits 0 even for some failures — read the text. */
export function wirelessResultOk(action: "pair" | "connect", output: string): boolean {
  const text = output.toLowerCase();
  if (action === "pair") return text.includes("successfully paired");
  return text.includes("connected to") && !text.includes("failed") && !text.includes("cannot");
}

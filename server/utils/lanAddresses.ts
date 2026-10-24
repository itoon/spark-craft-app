import { networkInterfaces } from "node:os";

export interface LanAddress {
  name: string;
  address: string;
}

function isPrivateIPv4(address: string) {
  return (
    /^10\./.test(address) ||
    /^192\.168\./.test(address) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  );
}

/**
 * External IPv4 addresses of this machine, the ones a phone on the same Wi-Fi
 * can reach (never "localhost"). Private Wi-Fi/LAN ranges first (en0 on a Mac
 * is usually Wi-Fi).
 */
export function listLanAddresses(
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
): LanAddress[] {
  const addresses: LanAddress[] = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      const family = typeof entry.family === "string" ? entry.family : `IPv${entry.family}`;
      if (family !== "IPv4" || entry.internal) continue;
      addresses.push({ name, address: entry.address });
    }
  }

  const score = (item: LanAddress) =>
    (isPrivateIPv4(item.address) ? 0 : 2) + (/^(en0|wlan|wl|Wi-?Fi)/i.test(item.name) ? 0 : 1);
  return addresses.sort((a, b) => score(a) - score(b));
}

/** The port in a Host header value ("localhost:3000" → 3000), or 80. */
export function portOfHost(host: string): number {
  const match = host.match(/:(\d+)$/);
  return match ? Number(match[1]) : 80;
}

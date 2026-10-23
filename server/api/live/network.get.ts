import { networkInterfaces } from "node:os";

import { getRequestHost } from "h3";

interface LanAddress {
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
 * LAN addresses of the machine running the dev server, so the QR code points
 * at something a phone on the same Wi-Fi can reach (never "localhost").
 */
export default defineEventHandler((event) => {
  const host = getRequestHost(event, { xForwardedHost: true });
  const portMatch = host.match(/:(\d+)$/);
  const port = portMatch ? Number(portMatch[1]) : 80;

  const addresses: LanAddress[] = [];
  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      const family = typeof entry.family === "string" ? entry.family : `IPv${entry.family}`;
      if (family !== "IPv4" || entry.internal) continue;
      addresses.push({ name, address: entry.address });
    }
  }

  // Private Wi-Fi/LAN ranges first (en0 on a Mac is usually Wi-Fi).
  addresses.sort((a, b) => {
    const score = (item: LanAddress) =>
      (isPrivateIPv4(item.address) ? 0 : 2) + (/^(en0|wlan|wl|Wi-?Fi)/i.test(item.name) ? 0 : 1);
    return score(a) - score(b);
  });

  return { port, host, addresses };
});

import { getRequestHost } from "h3";

import { listLanAddresses, portOfHost } from "../../utils/lanAddresses";

/**
 * LAN addresses of the machine running the dev server, so the QR code points
 * at something a phone on the same Wi-Fi can reach (never "localhost").
 */
export default defineEventHandler((event) => {
  const host = getRequestHost(event, { xForwardedHost: true });
  return { port: portOfHost(host), host, addresses: listLanAddresses() };
});

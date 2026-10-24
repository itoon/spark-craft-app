import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createError, setHeader } from "h3";

/**
 * The classroom CA (scripts/lan-cert.mjs) for phones to install, as DER —
 * Safari on iPhone turns it into a profile. Only the certificate, never the key.
 */
export default defineEventHandler(async (event) => {
  const file = process.env.CODECRAFT_CA_FILE || join(process.cwd(), ".certs", "ca.pem");
  let pem: string;
  try {
    pem = await readFile(file, "utf8");
  } catch {
    throw createError({ statusCode: 404, statusMessage: "ยังไม่มีใบรับรอง — รัน bun run serve:lan" });
  }
  const base64 = pem.match(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/)?.[1];
  if (!base64) throw createError({ statusCode: 500, statusMessage: "ca.pem is not a certificate" });
  setHeader(event, "Content-Type", "application/x-x509-ca-cert");
  setHeader(event, "Content-Disposition", 'attachment; filename="codecraft-classroom.crt"');
  return Buffer.from(base64.replace(/\s+/g, ""), "base64");
});

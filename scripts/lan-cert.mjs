#!/usr/bin/env node
/**
 * HTTPS for the classroom Wi-Fi, so iPhones accept the app as a real
 * (installable, offline) web app and allow camera / GPS / motion.
 *
 *   .certs/ca.pem + ca-key.pem     "CodeCraft Classroom CA" — made once; each
 *                                  phone installs it once (open /cert on the phone)
 *   .certs/lan.pem + lan-key.pem   server certificate for this computer's current
 *                                  LAN addresses — re-made whenever they change,
 *                                  signed by the same CA so phones keep trusting it
 *
 * Uses the openssl that ships with macOS; nothing is added to this computer's
 * own trust store.
 *
 *   node scripts/lan-cert.mjs        make / refresh, print the folder
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const CERT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", ".certs");

/** IPv4 addresses other devices on the Wi-Fi can reach this computer at. */
export function lanAddresses(interfaces = networkInterfaces()) {
  return Object.values(interfaces)
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address)
    .filter((address) => !address.startsWith("169.254."));
}

/** Names the server certificate must cover. */
export function certNames(addresses = lanAddresses(), host = hostname()) {
  const dns = ["localhost"];
  const local = host.replace(/\.local$/, "");
  if (/^[a-z0-9-]+$/i.test(local)) dns.push(`${local}.local`);
  return { dns, ips: ["127.0.0.1", ...addresses] };
}

export function subjectAltName({ dns, ips }) {
  return [...dns.map((name) => `DNS:${name}`), ...ips.map((ip) => `IP:${ip}`)].join(",");
}

function openssl(args, input) {
  return execFileSync("openssl", args, { input, stdio: ["pipe", "pipe", "pipe"] }).toString();
}

function ensureCa() {
  const ca = join(CERT_DIR, "ca.pem");
  const caKey = join(CERT_DIR, "ca-key.pem");
  if (existsSync(ca) && existsSync(caKey)) return { ca, caKey, created: false };
  openssl([
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "3650",
    "-keyout", caKey, "-out", ca,
    "-subj", `/CN=CodeCraft Classroom CA (${hostname().replace(/\.local$/, "")})/O=CodeCraft`,
    "-addext", "basicConstraints=critical,CA:TRUE",
    "-addext", "keyUsage=critical,keyCertSign,cRLSign",
  ]);
  return { ca, caKey, created: true };
}

/** True when the server certificate exists, is signed by the CA and covers `names`. */
function leafIsCurrent(leaf, ca, names) {
  if (!existsSync(leaf)) return false;
  try {
    openssl(["verify", "-CAfile", ca, leaf]);
    const text = openssl(["x509", "-in", leaf, "-noout", "-ext", "subjectAltName", "-checkend", String(30 * 86400)]);
    return names.ips.every((ip) => text.includes(`IP Address:${ip}`));
  } catch {
    return false; // expired, expiring within 30 days, or not from this CA
  }
}

export function ensureLanCert() {
  mkdirSync(CERT_DIR, { recursive: true });
  const { ca, caKey, created } = ensureCa();
  const leaf = join(CERT_DIR, "lan.pem");
  const leafKey = join(CERT_DIR, "lan-key.pem");
  const names = certNames();
  let renewed = false;
  if (!leafIsCurrent(leaf, ca, names)) {
    const csr = openssl(["req", "-new", "-newkey", "rsa:2048", "-nodes", "-keyout", leafKey, "-subj", "/CN=CodeCraft"]);
    const ext = join(CERT_DIR, "lan.ext");
    // iOS only trusts server certificates that last ≤ 825 days and say serverAuth
    writeFileSync(
      ext,
      [
        "basicConstraints=CA:FALSE",
        "keyUsage=critical,digitalSignature,keyEncipherment",
        "extendedKeyUsage=serverAuth",
        `subjectAltName=${subjectAltName(names)}`,
      ].join("\n"),
    );
    openssl(
      ["x509", "-req", "-CA", ca, "-CAkey", caKey, "-CAcreateserial", "-days", "397", "-sha256", "-extfile", ext, "-out", leaf],
      csr,
    );
    renewed = true;
  }
  return { ca, leaf, leafKey, names, createdCa: created, renewed };
}

export function readLanCert() {
  const { leaf, leafKey } = ensureLanCert();
  return { cert: readFileSync(leaf, "utf8"), key: readFileSync(leafKey, "utf8") };
}

const invokedDirectly =
  (process.argv[1] ?? "").endsWith("lan-cert.mjs") && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const result = ensureLanCert();
  if (result.createdCa) console.log("✓ สร้างใบรับรองห้องเรียน (CA) ใหม่ — มือถือแต่ละเครื่องต้องติดตั้งครั้งแรก: เปิด /cert บนมือถือ");
  console.log(`✓ HTTPS สำหรับ ${result.names.ips.join(", ")}${result.renewed ? " (ออกใบใหม่)" : ""}`);
}

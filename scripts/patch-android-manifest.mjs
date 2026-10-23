#!/usr/bin/env node
/**
 * Adds the permissions a CodeCraft app needs (GPS + Bluetooth LE) to the
 * AndroidManifest.xml that `npx cap add android` generates. Safe to run twice.
 *
 *   node scripts/patch-android-manifest.mjs path/to/AndroidManifest.xml
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const CODECRAFT_PERMISSIONS = [
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
  '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
  '<uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />',
  '<uses-permission android:name="android.permission.VIBRATE" />',
];

export function patchManifest(xml) {
  const missing = CODECRAFT_PERMISSIONS.filter((line) => {
    const name = line.match(/android:name="([^"]+)"/)?.[1];
    return name && !xml.includes(`android:name="${name}"`);
  });
  if (!missing.length) return xml;
  const block = `    <!-- CodeCraft: GPS + Bluetooth LE -->\n${missing.map((line) => `    ${line}`).join("\n")}\n`;
  if (!xml.includes("</manifest>")) throw new Error("AndroidManifest.xml has no </manifest> tag");
  return xml.replace("</manifest>", `${block}</manifest>`);
}

const invokedDirectly =
  (process.argv[1] ?? "").endsWith("patch-android-manifest.mjs") &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: patch-android-manifest.mjs <AndroidManifest.xml>");
    process.exit(1);
  }
  writeFileSync(file, patchManifest(readFileSync(file, "utf8")));
  console.log(`✓ permissions added to ${file}`);
}

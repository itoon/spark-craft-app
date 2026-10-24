#!/usr/bin/env node
/**
 * Puts the permissions a CodeCraft app needs into the AndroidManifest.xml that
 * `npx cap add android` generates — only for what the app actually uses:
 *
 *   Camera element      → camera
 *   location.*          → GPS
 *   ble.*               → Bluetooth LE
 *   phone.vibrate()     → vibrate
 *
 * Capacitor only asks the user for permissions listed in the manifest; anything
 * missing is denied without a prompt (e.g. the camera shows "permission denied").
 * The android project is reused between builds, so permissions a previous build
 * added are removed again when the app stops using that feature. Safe to run twice.
 *
 *   node scripts/patch-android-manifest.mjs <AndroidManifest.xml> [codecraft-app.json]
 *
 * Without codecraft-app.json every CodeCraft permission is added.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const PERMISSION_GROUPS = {
  camera: [
    '<uses-permission android:name="android.permission.CAMERA" />',
    '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  ],
  location: [
    '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
    '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
    '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
  ],
  bluetooth: [
    '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
    '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
    '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
    '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
    '<uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />',
  ],
  vibrate: ['<uses-permission android:name="android.permission.VIBRATE" />'],
};

export const ALL_FEATURES = Object.keys(PERMISSION_GROUPS);

const FEATURE_LABELS = { camera: "กล้อง", location: "GPS", bluetooth: "Bluetooth", vibrate: "สั่น" };

// Learner code calls the device services as globals (app/utils/runtimeServices.ts).
// The lookbehind skips e.g. window.location.href.
const CODE_PATTERNS = {
  location: /(?<![\w.$])location\s*\.\s*(?:get|watch|stop)\b/,
  bluetooth: /(?<![\w.$])ble\s*\.\s*\w+/,
  vibrate: /(?<![\w.$])phone\s*\.\s*vibrate\b/,
};

/** Which permission groups an exported app (codecraft-app.json) needs. */
export function detectFeatures(app) {
  const features = new Set();
  if ((app.elements ?? []).some((element) => element.type === "Camera")) features.add("camera");
  const code = Object.values(app.jsCodeByPage ?? {}).join("\n");
  for (const [feature, pattern] of Object.entries(CODE_PATTERNS)) {
    if (pattern.test(code)) features.add(feature);
  }
  return ALL_FEATURES.filter((feature) => features.has(feature));
}

function nameOf(line) {
  return line.match(/android:name="([^"]+)"/)?.[1];
}

const CODECRAFT_NAMES = new Set(Object.values(PERMISSION_GROUPS).flat().map(nameOf));

/**
 * Permissions of unused features to strip from the merged APK manifest. The
 * Bluetooth LE plugin's own manifest declares Bluetooth + location, so Gradle
 * would add them back even when this manifest leaves them out. Bluetooth keeps
 * location: BLE scanning on Android 11 and older needs it.
 */
function removedPermissions(features) {
  return ALL_FEATURES.filter((feature) => !features.includes(feature))
    .filter((feature) => !(feature === "location" && features.includes("bluetooth")))
    .flatMap((feature) => PERMISSION_GROUPS[feature])
    .filter((line) => line.startsWith("<uses-permission"))
    .map((line) => `<uses-permission android:name="${nameOf(line)}" tools:node="remove" />`);
}

const TOOLS_NS = 'xmlns:tools="http://schemas.android.com/tools"';

export function patchManifest(xml, features = ALL_FEATURES) {
  if (!xml.includes("</manifest>")) throw new Error("AndroidManifest.xml has no </manifest> tag");
  // Drop what an earlier build added, then add back what this build needs
  let kept = xml
    .split("\n")
    .filter((line) => {
      if (/<!--\s*CodeCraft:/.test(line)) return false;
      const name = nameOf(line);
      return !(name && CODECRAFT_NAMES.has(name) && /<uses-(?:permission|feature)\b/.test(line));
    })
    .join("\n");
  const added = features
    .flatMap((feature) => PERMISSION_GROUPS[feature] ?? [])
    .filter((line) => !kept.includes(`android:name="${nameOf(line)}"`));
  const removed = removedPermissions(features);
  if (removed.length && !kept.includes(TOOLS_NS)) {
    kept = kept.replace(/<manifest\b/, `<manifest ${TOOLS_NS}`);
  }
  let block = "";
  if (added.length) {
    const label = features.map((feature) => FEATURE_LABELS[feature] ?? feature).join(", ");
    block += `    <!-- CodeCraft: ${label} -->\n${added.map((line) => `    ${line}`).join("\n")}\n`;
  }
  if (removed.length) {
    block += `    <!-- CodeCraft: ไม่ได้ใช้ — ไม่ขอสิทธิ์นี้ -->\n${removed.map((line) => `    ${line}`).join("\n")}\n`;
  }
  return block ? kept.replace("</manifest>", `${block}</manifest>`) : kept;
}

const invokedDirectly =
  (process.argv[1] ?? "").endsWith("patch-android-manifest.mjs") &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const [file, appPath] = process.argv.slice(2);
  if (!file) {
    console.error("usage: patch-android-manifest.mjs <AndroidManifest.xml> [codecraft-app.json]");
    process.exit(1);
  }
  const features = appPath ? detectFeatures(JSON.parse(readFileSync(appPath, "utf8"))) : ALL_FEATURES;
  writeFileSync(file, patchManifest(readFileSync(file, "utf8"), features));
  const label = features.map((feature) => FEATURE_LABELS[feature] ?? feature).join(", ");
  console.log(`✓ สิทธิ์ที่แอปขอ: ${label || "(ไม่มี — แอปไม่ได้ใช้กล้อง/GPS/Bluetooth/สั่น)"}`);
}

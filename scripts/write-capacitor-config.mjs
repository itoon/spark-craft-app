#!/usr/bin/env node
/**
 * Writes capacitor.config.json for an exported CodeCraft app.
 *   node scripts/write-capacitor-config.mjs <meta.json> <out capacitor.config.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [metaPath, outPath] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const config = {
  appId: meta.appId,
  appName: meta.appName,
  webDir: "www",
  android: { allowMixedContent: false },
  plugins: {
    // Android 15 draws the app under the status bar (edge-to-edge). This plugin
    // pushes the web view below the system bars; the player then paints the
    // status bar in the toolbar colour (app/pages/app.vue).
    EdgeToEdge: { backgroundColor: "#ffffff" },
    BluetoothLe: {
      displayStrings: {
        scanning: "กำลังค้นหาบอร์ด…",
        cancel: "ยกเลิก",
        availableDevices: "อุปกรณ์ที่พบ",
        noDeviceFound: "ไม่พบอุปกรณ์",
      },
    },
  },
};
writeFileSync(outPath, JSON.stringify(config, null, 2));
console.log(`✓ ${outPath} (${meta.appId})`);

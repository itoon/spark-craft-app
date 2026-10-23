#!/usr/bin/env node
/**
 * Puts the app's name (from "แอปของฉัน") into the Android project on every
 * build — `npx cap add android` only writes it once, so a renamed app would
 * otherwise keep its old name on the phone — and installs the SystemBars
 * plugin (apk-template/native) that colours the status and navigation bars
 * separately.
 *
 *   node scripts/apply-app-identity.mjs <meta.json> <android project dir>
 */
import { cpSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Escape text for an Android <string> resource. */
export function escapeAndroidString(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/^([@?])/, "\\$1");
}

export function setAppName(xml, name) {
  const value = escapeAndroidString(name);
  return xml.replace(
    /(<string name="(?:app_name|title_activity_main)">)[\s\S]*?(<\/string>)/g,
    (_match, open, close) => `${open}${value}${close}`,
  );
}

const SYSTEM_BARS_IMPORT = "import app.codecraft.systembars.SystemBarsPlugin;";

/** Register SystemBarsPlugin in the MainActivity that `cap add android` generates. */
export function patchMainActivity(java) {
  if (java.includes(SYSTEM_BARS_IMPORT)) return java;
  const empty = /public class MainActivity extends BridgeActivity\s*\{\s*\}/;
  if (!empty.test(java)) throw new Error("MainActivity.java was changed by hand — can't add SystemBarsPlugin");
  return java
    .replace("import com.getcapacitor.BridgeActivity;", `import android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n${SYSTEM_BARS_IMPORT}`)
    .replace(
      empty,
      [
        "public class MainActivity extends BridgeActivity {",
        "    @Override",
        "    public void onCreate(Bundle savedInstanceState) {",
        "        registerPlugin(SystemBarsPlugin.class);",
        "        super.onCreate(savedInstanceState);",
        "    }",
        "}",
      ].join("\n"),
    );
}

function findMainActivity(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(path);
      if (found) return found;
    } else if (entry.name === "MainActivity.java") {
      return path;
    }
  }
  return null;
}

const invokedDirectly =
  (process.argv[1] ?? "").endsWith("apply-app-identity.mjs") &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const [metaPath, androidDir] = process.argv.slice(2);
  if (!metaPath || !androidDir) {
    console.error("usage: apply-app-identity.mjs <meta.json> <android dir>");
    process.exit(1);
  }
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const file = join(androidDir, "app/src/main/res/values/strings.xml");
  writeFileSync(file, setAppName(readFileSync(file, "utf8"), meta.appName));
  console.log(`✓ ชื่อแอป: ${meta.appName}`);

  const javaDir = join(androidDir, "app/src/main/java");
  const nativeDir = join(dirname(fileURLToPath(import.meta.url)), "../apk-template/native");
  cpSync(nativeDir, javaDir, { recursive: true });
  const activity = findMainActivity(javaDir);
  if (!activity) throw new Error("ไม่พบ MainActivity.java");
  writeFileSync(activity, patchMainActivity(readFileSync(activity, "utf8")));
  console.log("✓ สีแถบบน/ล่างแยกกัน (SystemBars)");
}

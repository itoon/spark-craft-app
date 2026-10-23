import { describe, expect, it } from "vitest";

import { buildApkAppId, buildApkMeta, buildApkSlug } from "../../app/utils/apkExport";
import { normalizeAppIcon } from "../../app/utils/appIcon";
// @ts-expect-error plain .mjs script without types
import { patchMainActivity, setAppName } from "../../scripts/apply-app-identity.mjs";
// @ts-expect-error plain .mjs script without types
import { detectFeatures, patchManifest } from "../../scripts/patch-android-manifest.mjs";

const MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="@string/app_name"></application>
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
`;

describe("APK export", () => {
  it("makes folder-safe slugs and valid Android app ids", () => {
    const now = new Date("2026-10-21T09:30:00Z");
    expect(buildApkSlug("Magic Ball 2!", now)).toBe("magic-ball-2");
    expect(buildApkSlug("ลูกบอลทำนาย", now)).toBe("app-202610210930");
    expect(buildApkAppId("magic-ball-2")).toBe("app.codecraft.magicball2");
    expect(buildApkAppId("2048-game")).toBe("app.codecraft.game");
    expect(buildApkMeta({ appName: "  " }, now).appName).toBe("CodeCraft App");
  });

  it("keeps the same folder and app id when the app is renamed", () => {
    const first = buildApkMeta({ appName: "ลูกบอลทำนาย", projectId: "project_mh3k2abc12" });
    const renamed = buildApkMeta({ appName: "Magic Ball", projectId: "project_mh3k2abc12" });
    expect(first.slug).toBe("app-mh3k2abc12");
    expect(renamed.slug).toBe(first.slug);
    expect(renamed.appId).toBe("app.codecraft.appmh3k2abc12");
    expect(renamed.appName).toBe("Magic Ball");
  });

  it("writes the app name into Android's strings.xml, escaped", () => {
    const xml = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Old</string>
    <string name="title_activity_main">Old</string>
    <string name="package_name">app.codecraft.x</string>
</resources>`;
    const out = setAppName(xml, "แอป <ของฉัน> & 'เพื่อน'") as string;
    expect(out).toContain('<string name="app_name">แอป &lt;ของฉัน&gt; &amp; \\\'เพื่อน\\\'</string>');
    expect(out).toContain('<string name="title_activity_main">แอป &lt;ของฉัน&gt; &amp; \\\'เพื่อน\\\'</string>');
    expect(out).toContain('<string name="package_name">app.codecraft.x</string>');
  });

  it("registers the SystemBars plugin in MainActivity once", () => {
    const generated = `package app.codecraft.x;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {}
`;
    const patched = patchMainActivity(generated) as string;
    expect(patched).toContain("package app.codecraft.x;");
    expect(patched).toContain("import app.codecraft.systembars.SystemBarsPlugin;");
    expect(patched).toContain("registerPlugin(SystemBarsPlugin.class);");
    expect(patched.indexOf("registerPlugin")).toBeLessThan(patched.indexOf("super.onCreate"));
    expect(patchMainActivity(patched)).toBe(patched);
    expect(() => patchMainActivity("public class MainActivity extends Something { void x() {} }")).toThrow();
  });

  it("cleans up a saved icon", () => {
    expect(normalizeAppIcon(undefined)).toEqual({ emoji: "📱", color: "#4f46e5", image: null });
    expect(normalizeAppIcon({ emoji: "🚀", color: "#EF4444", image: "javascript:alert(1)" })).toEqual({
      emoji: "🚀",
      color: "#ef4444",
      image: null,
    });
    expect(normalizeAppIcon({ color: "red", image: "data:image/jpeg;base64,AAAA" })).toEqual({
      emoji: "📱",
      color: "#4f46e5",
      image: "data:image/jpeg;base64,AAAA",
    });
  });

  it("adds GPS, Bluetooth and camera permissions to AndroidManifest.xml once", () => {
    const patched = patchManifest(MANIFEST) as string;
    expect(patched).toContain("android.permission.ACCESS_FINE_LOCATION");
    expect(patched).toContain("android.permission.BLUETOOTH_CONNECT");
    expect(patched).toContain("android.permission.CAMERA");
    expect(patched.indexOf("BLUETOOTH_SCAN")).toBeLessThan(patched.indexOf("</manifest>"));
    expect(patchManifest(patched)).toBe(patched);
    // keeps the INTERNET permission Capacitor already added (no duplicate)
    expect(patched.match(/android.permission.INTERNET/g)?.length).toBe(1);
  });

  it("asks only for the permissions the app's elements and code use", () => {
    expect(detectFeatures({ elements: [{ type: "Button" }], jsCodeByPage: {} })).toEqual([]);
    expect(
      detectFeatures({
        elements: [{ type: "Camera" }],
        jsCodeByPage: {
          page1: "location.get().then(show)\nble.connect()",
          page2: "phone.vibrate(300)",
        },
      }),
    ).toEqual(["camera", "location", "bluetooth", "vibrate"]);
    // window.location is the browser URL, not GPS
    expect(detectFeatures({ elements: [], jsCodeByPage: { page1: "window.location.reload()" } })).toEqual([]);

    const cameraOnly = patchManifest(MANIFEST, ["camera"]) as string;
    expect(cameraOnly).toContain('<uses-permission android:name="android.permission.CAMERA" />');
    // the BLE plugin's manifest declares Bluetooth + location; strip them in the merge
    expect(cameraOnly).toContain('<uses-permission android:name="android.permission.BLUETOOTH_SCAN" tools:node="remove" />');
    expect(cameraOnly).toContain('<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" tools:node="remove" />');
    expect(cameraOnly).toContain('xmlns:tools="http://schemas.android.com/tools"');
    expect(patchManifest(cameraOnly, ["camera"])).toBe(cameraOnly);

    // BLE scanning on old Android needs location, so Bluetooth keeps it
    const bleOnly = patchManifest(MANIFEST, ["bluetooth"]) as string;
    expect(bleOnly).not.toContain('android.permission.ACCESS_FINE_LOCATION" tools:node="remove"');
  });

  it("removes permissions an earlier build added when the app no longer needs them", () => {
    const everything = patchManifest(MANIFEST) as string;
    const gpsOnly = patchManifest(everything, ["location"]) as string;
    expect(gpsOnly).toContain('<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />');
    expect(gpsOnly).toContain('android.permission.CAMERA" tools:node="remove"');
    expect(gpsOnly).toContain('android.permission.BLUETOOTH_CONNECT" tools:node="remove"');
    expect(gpsOnly).not.toContain('<uses-permission android:name="android.permission.CAMERA" />');
    expect(gpsOnly.match(/<!-- CodeCraft/g)?.length).toBe(2);
    // all features again → back to the full list, no leftover removals
    const backToAll = patchManifest(gpsOnly) as string;
    expect(backToAll).not.toContain("tools:node");
    expect(backToAll).toContain('<uses-permission android:name="android.permission.CAMERA" />');
  });
});

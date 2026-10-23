import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Locate adb (Android SDK platform-tools) and parse `adb devices -l`. */
export function findAdb(): string | null {
  const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    [
      join(homedir(), "Library/Android/sdk"),
      join(homedir(), "Android/Sdk"),
      "/opt/homebrew/share/android-commandlinetools",
      "/usr/local/share/android-commandlinetools",
    ].find((dir) => existsSync(dir));
  const candidate = sdk ? join(sdk, "platform-tools", "adb") : null;
  if (candidate && existsSync(candidate)) return candidate;
  for (const dir of ["/opt/homebrew/bin", "/usr/local/bin", ...(process.env.PATH ?? "").split(":")]) {
    const path = join(dir, "adb");
    if (dir && existsSync(path)) return path;
  }
  return null;
}

export interface UsbDevice {
  serial: string;
  state: string;
  model: string;
}

export function parseAdbDevices(output: string): UsbDevice[] {
  return output
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial = "", state = "", ...rest] = line.split(/\s+/);
      const model = rest.find((part) => part.startsWith("model:"))?.slice(6).replace(/_/g, " ") ?? "";
      return { serial, state, model };
    });
}


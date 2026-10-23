/** Icon PNGs sent by the APK dialog (rendered in the browser from "แอปของฉัน"). */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_ICON_BYTES = 4 * 1024 * 1024;

export interface ApkIconUpload {
  full?: unknown;
  foreground?: unknown;
  background?: unknown;
}

/** `data:image/png;base64,…` → bytes, or null if it isn't a reasonably sized PNG. */
export function decodePngDataUrl(value: unknown, maxBytes = MAX_ICON_BYTES): Buffer | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[1]!, "base64");
  if (bytes.length > maxBytes || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  return bytes;
}

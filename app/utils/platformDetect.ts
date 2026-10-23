/**
 * Which look (Ionic mode) a real phone should get: its own OS.
 * iPadOS 13+ pretends to be a Mac, so a "Macintosh" with a touch screen is iOS.
 */
export function detectPhonePlatform(userAgent: string, maxTouchPoints = 0): "ios" | "android" | null {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  return null;
}

/**
 * The app's home-screen icon, picked in "แอปของฉัน": an emoji on a colour
 * (easy for kids, no image file needed) or the kid's own picture.
 */
export interface AppIcon {
  emoji: string;
  color: string;
  /** Own picture as a data URL (already shrunk), or null to use emoji + colour. */
  image: string | null;
}

export const ICON_EMOJIS = [
  "📱", "🎮", "⭐", "🚀", "🐱", "🐶", "🦄", "🍕",
  "⚽", "🎵", "🌈", "🔥", "💡", "🧮", "📚", "🎨",
] as const;

export const ICON_COLORS = [
  "#4f46e5", "#0ea5e9", "#10b981", "#84cc16",
  "#f59e0b", "#f97316", "#ef4444", "#ec4899",
  "#a855f7", "#334155",
] as const;

export const DEFAULT_APP_ICON: AppIcon = { emoji: "📱", color: "#4f46e5", image: null };

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_STORED_IMAGE_CHARS = 400_000; // a 512px JPEG is ~50 KB; keep localStorage small

/** Saved projects may hold anything — fall back field by field to the default. */
export function normalizeAppIcon(raw: unknown): AppIcon {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<AppIcon>;
  const emoji = typeof value.emoji === "string" && value.emoji.trim() && value.emoji.length <= 16
    ? value.emoji.trim()
    : DEFAULT_APP_ICON.emoji;
  const color = typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color)
    ? value.color.toLowerCase()
    : DEFAULT_APP_ICON.color;
  const image = typeof value.image === "string"
    && value.image.length <= MAX_STORED_IMAGE_CHARS
    && IMAGE_DATA_URL.test(value.image)
    ? value.image
    : null;
  return { emoji, color, image };
}

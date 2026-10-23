/**
 * Browser-only: turns an AppIcon into the PNGs Android needs.
 *   full        — legacy square icon (colour + emoji, or the picture)
 *   foreground  — adaptive-icon layer; the emoji stays inside the 66% safe
 *                 zone so round / squircle masks never cut it
 *   background  — adaptive-icon layer (solid colour, or the picture)
 */
import type { AppIcon } from "./appIcon";

export interface AppIconPngs {
  full: string;
  foreground: string;
  background: string;
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

function canvas(size: number) {
  const el = document.createElement("canvas");
  el.width = size;
  el.height = size;
  return { el, ctx: el.getContext("2d")! };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("เปิดรูปไม่ได้"));
    img.src = src;
  });
}

/** Draw `img` centre-cropped to fill a size×size square. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, size: number) {
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
}

function drawEmoji(ctx: CanvasRenderingContext2D, emoji: string, size: number, scale: number) {
  ctx.font = `${Math.round(size * scale)}px ${EMOJI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // emoji glyphs sit slightly high on their baseline
  ctx.fillText(emoji, size / 2, size / 2 + size * scale * 0.06);
}

export async function renderAppIconPngs(icon: AppIcon, size = 1024): Promise<AppIconPngs> {
  const full = canvas(size);
  const foreground = canvas(size);
  const background = canvas(size);

  if (icon.image) {
    const img = await loadImage(icon.image);
    drawCover(full.ctx, img, size);
    drawCover(foreground.ctx, img, size);
    drawCover(background.ctx, img, size);
  } else {
    for (const { ctx } of [full, background]) {
      ctx.fillStyle = icon.color;
      ctx.fillRect(0, 0, size, size);
    }
    drawEmoji(full.ctx, icon.emoji, size, 0.6);
    drawEmoji(foreground.ctx, icon.emoji, size, 0.4);
  }

  return {
    full: full.el.toDataURL("image/png"),
    foreground: foreground.el.toDataURL("image/png"),
    background: background.el.toDataURL("image/png"),
  };
}

/** A picked photo → small square JPEG to keep in the project (localStorage). */
export async function shrinkImageFile(file: File, size = 512): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { el, ctx } = canvas(size);
    ctx.fillStyle = "#ffffff"; // transparent PNGs → white, not black, in a JPEG
    ctx.fillRect(0, 0, size, size);
    drawCover(ctx, img, size);
    return el.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

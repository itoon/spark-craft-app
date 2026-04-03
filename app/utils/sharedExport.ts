import type { AppElement, Page } from "../composables/useEditorStore";

export interface SharedExportPayload {
  appName: string;
  pages: Page[];
  elements: AppElement[];
  jsCodeByPage: Record<string, string>;
  startPageId: string;
  activeDeviceId?: string;
}

export interface SharedExportRecord extends SharedExportPayload {
  id: string;
  createdAt: string;
}

export function buildShareId(timestamp = new Date(), random = Math.random()): string {
  const datePart = timestamp.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const randomPart = Math.floor(random * 0xffffff)
    .toString(36)
    .padStart(5, "0")
    .slice(0, 5);
  return `cc${datePart}${randomPart}`;
}

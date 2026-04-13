export interface PreviewDeviceDef {
  id: string;
  label: string;
  icon: string;
  canvasW: number;
  canvasH: number;
  totalW: number;
  totalH: number;
  cornerRadius: number;
  screenRadius: number;
  borderWidth: number;
}

export const PREVIEW_DEVICES: PreviewDeviceDef[] = [
  {
    id: "iphone15",
    label: "iPhone 15",
    icon: "i-lucide-smartphone",
    canvasW: 300,
    canvasH: 600,
    totalW: 324,
    totalH: 624,
    cornerRadius: 52,
    screenRadius: 0,
    borderWidth: 12,
  },
  {
    id: "android",
    label: "Android",
    icon: "i-lucide-tablet-smartphone",
    canvasW: 300,
    canvasH: 600,
    totalW: 316,
    totalH: 616,
    cornerRadius: 44,
    screenRadius: 36,
    borderWidth: 8,
  },
];

export function getPreviewDevice(
  deviceId: string | null | undefined,
): PreviewDeviceDef {
  return (
    PREVIEW_DEVICES.find((device) => device.id === deviceId) ??
    PREVIEW_DEVICES[0]
  );
}

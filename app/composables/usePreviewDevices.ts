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
    // Real iPhone 15 viewport (CSS px) so the design matches a real phone
    canvasW: 393,
    canvasH: 852,
    totalW: 417,
    totalH: 876,
    cornerRadius: 56,
    screenRadius: 0,
    borderWidth: 12,
  },
  {
    id: "android",
    label: "Android",
    icon: "i-lucide-tablet-smartphone",
    // Typical Android (Pixel) viewport in CSS px
    canvasW: 412,
    canvasH: 915,
    totalW: 428,
    totalH: 931,
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

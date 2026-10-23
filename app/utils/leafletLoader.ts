/**
 * Loads Leaflet from a CDN once per page. Keeps the project free of an extra
 * npm dependency; maps need internet for the tiles anyway.
 */

// Leaflet's API surface we use is small; keep it loosely typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LeafletApi = any;

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;

let pending: Promise<LeafletApi> | null = null;

export function loadLeaflet(): Promise<LeafletApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const existing = (window as unknown as { L?: LeafletApi }).L;
  if (existing?.map) return Promise.resolve(existing);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      const L = (window as unknown as { L?: LeafletApi }).L;
      if (L?.map) resolve(L);
      else reject(new Error("Leaflet failed to load"));
    };
    script.onerror = () => {
      pending = null;
      reject(new Error("Leaflet failed to load"));
    };
    document.head.appendChild(script);
  });
  return pending;
}

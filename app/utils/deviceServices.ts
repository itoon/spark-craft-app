/**
 * Phone hardware for learner code — CodeCraft's take on App Inventor's
 * LocationSensor, AccelerometerSensor and BluetoothLE:
 *
 *   location.get() / location.watch(cb) / location.stop()
 *   motion.onShake(cb) / motion.onTilt(cb) / motion.stop()
 *   ble.connect() / ble.send(text) / ble.onMessage(cb) / ble.onDisconnect(cb)
 *
 * Three backends, chosen per run:
 *   - real:      browser APIs (or the Capacitor BLE plugin inside the APK)
 *   - simulator: the editor's sensor panel (no phone needed)
 *   - dryRun:    the lesson checker — records calls, never touches hardware
 */

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface TiltReading {
  x: number;
  y: number;
  z: number;
}

/** Plain-object simulator so this file stays framework-free (and testable). */
export interface SensorSimulator {
  /** Use simulated GPS / motion instead of the device's real sensors. */
  sensors: boolean;
  /** Use a simulated BLE board instead of real Bluetooth. */
  board: boolean;
  location: GeoPoint;
  tilt: TiltReading;
  /** Subscribe to simulator events; returns an unsubscribe function. */
  subscribe(listener: (event: SimulatorEvent) => void): () => void;
  /** Called by the runtime when the app sends text to the simulated board. */
  receiveFromApp(text: string): void;
}

export type SimulatorEvent =
  | { type: "shake" }
  | { type: "tilt"; reading: TiltReading }
  | { type: "location"; point: GeoPoint }
  | { type: "board-message"; text: string };

export interface DeviceServiceHost {
  dryRun?: boolean;
  simulator?: SensorSimulator | null;
}

type LogFn = (type: "log" | "warn" | "error" | "success", message: string) => void;

export interface DeviceServices {
  location: {
    get(): Promise<GeoPoint>;
    watch(callback: (point: GeoPoint) => unknown): number;
    stop(): void;
  };
  motion: {
    onShake(callback: () => unknown): void;
    onTilt(callback: (reading: TiltReading) => unknown): void;
    stop(): void;
  };
  ble: {
    connect(namePrefix?: string): Promise<string>;
    send(text: unknown): Promise<void>;
    onMessage(callback: (text: string) => unknown): void;
    onDisconnect(callback: () => unknown): void;
    isConnected(): boolean;
    disconnect(): Promise<void>;
  };
  /** Dry-run / test helpers */
  fireShake(): void;
  fireTilt(reading: TiltReading): void;
  fireBleMessage(text: string): void;
  dispose(): void;
}

// ── Constants ────────────────────────────────────────────────────────────
export const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_CHAR_A = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_CHAR_B = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
export const DRY_RUN_LOCATION: GeoPoint = { lat: 13.7563, lng: 100.5018, accuracy: 10 };

const SHAKE_THRESHOLD = 14; // change in m/s² between readings that counts as a shake
const SHAKE_COOLDOWN_MS = 800;
const TILT_INTERVAL_MS = 100;
const BLE_CHUNK = 20; // safe BLE payload size

export const DEVICE_MESSAGES = {
  insecure:
    "เซนเซอร์และ Bluetooth ต้องเปิดแอปผ่าน https:// — ให้ครูรัน `bun run dev:https` แล้วสแกน QR ใหม่",
  locationDenied: "แอปไม่ได้รับอนุญาตให้ใช้ตำแหน่ง — ไปที่การตั้งค่าเบราว์เซอร์แล้วกดอนุญาต Location",
  locationUnavailable: "หาตำแหน่งไม่เจอ ลองออกไปที่โล่งหรือเปิด GPS ของมือถือ",
  locationTimeout: "หาตำแหน่งนานเกินไป ลองใหม่อีกครั้ง",
  noLocation: "เครื่องนี้ไม่มี GPS / Location",
  noMotion: "เครื่องนี้ไม่มีเซนเซอร์วัดการเคลื่อนไหว (ลองบนมือถือ หรือใช้ตัวจำลองใน Run mode)",
  noBle:
    "เครื่องนี้ใช้ Bluetooth จากเว็บไม่ได้ (ใช้ Chrome บน Android หรือคอมพิวเตอร์ หรือ build เป็น APK; iPhone ยังไม่รองรับ)",
  bleNotConnected: "ยังไม่ได้เชื่อมต่อบอร์ด — เรียก ble.connect() ในปุ่มก่อน",
  bleNoUart: "บอร์ดนี้ไม่มี BLE UART (Nordic UART Service) — ดูโค้ดตัวอย่าง ESP32 ใน docs",
  bleCancelled: "ยกเลิกการเลือกอุปกรณ์ Bluetooth",
  bleGesture: "ble.connect() ต้องเรียกตอนกดปุ่ม (ใส่ไว้ใน onClick)",
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────
function getWindow(): (Window & typeof globalThis) | null {
  return typeof window === "undefined" ? null : window;
}

function isSecure(): boolean {
  const w = getWindow();
  return w ? w.isSecureContext !== false : true;
}

export function chunkText(text: string, size = BLE_CHUNK): Uint8Array[] {
  const bytes = new TextEncoder().encode(text);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.slice(i, i + size));
  return chunks;
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(" ");
}

export function hexToText(hex: string): string {
  const parts = hex.trim().split(/\s+/).filter(Boolean);
  const bytes = new Uint8Array(parts.map((part) => parseInt(part, 16)));
  return new TextDecoder().decode(bytes);
}

function cleanMessage(text: string) {
  return text.replace(/[\r\n]+$/g, "");
}

interface CharacteristicInfo {
  uuid: string;
  notify: boolean;
  write: boolean;
}

/**
 * ESP32 NUS sketches: 6e400002 = write (RX on board), 6e400003 = notify.
 * micro:bit UART swaps them. Pick by properties, fall back to the ESP32 layout.
 */
export function pickUartCharacteristics(chars: CharacteristicInfo[]) {
  const lower = chars.map((c) => ({ ...c, uuid: c.uuid.toLowerCase() }));
  const notify = lower.find((c) => c.notify && (c.uuid === NUS_CHAR_A || c.uuid === NUS_CHAR_B));
  const write = lower.find(
    (c) => c.write && (c.uuid === NUS_CHAR_A || c.uuid === NUS_CHAR_B) && c.uuid !== notify?.uuid,
  );
  return {
    notifyUuid: notify?.uuid ?? NUS_CHAR_B,
    writeUuid: write?.uuid ?? NUS_CHAR_A,
  };
}

// Capacitor (inside the APK) exposes native plugins on window.Capacitor.Plugins
interface CapacitorBlePlugin {
  initialize(options?: object): Promise<void>;
  requestDevice(options: object): Promise<{ deviceId: string; name?: string }>;
  connect(options: { deviceId: string }): Promise<void>;
  disconnect(options: { deviceId: string }): Promise<void>;
  getServices(options: { deviceId: string }): Promise<{
    services: { uuid: string; characteristics: { uuid: string; properties: Record<string, boolean> }[] }[];
  }>;
  startNotifications(options: { deviceId: string; service: string; characteristic: string }): Promise<void>;
  write(options: { deviceId: string; service: string; characteristic: string; value: string }): Promise<void>;
  addListener(event: string, callback: (data: { value?: string }) => void): Promise<{ remove(): void }> | { remove(): void };
}

function getCapacitorBle(): CapacitorBlePlugin | null {
  const w = getWindow() as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> };
  } | null;
  const cap = w?.Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.BluetoothLe as CapacitorBlePlugin | undefined) ?? null;
}

// ── Factory ──────────────────────────────────────────────────────────────
export function createDeviceServices(
  host: DeviceServiceHost = {},
  log: LogFn = () => undefined,
  record: (name: string) => void = () => undefined,
): DeviceServices {
  const dryRun = Boolean(host.dryRun);
  const simulator = host.simulator ?? null;
  const useSimSensors = () => !dryRun && Boolean(simulator?.sensors);
  const useSimBoard = () => !dryRun && Boolean(simulator?.board);

  const cleanups = new Set<() => void>();
  const shakeHandlers: (() => unknown)[] = [];
  const tiltHandlers: ((reading: TiltReading) => unknown)[] = [];
  const messageHandlers: ((text: string) => unknown)[] = [];
  const disconnectHandlers: (() => unknown)[] = [];
  let watchSeq = 0;
  const watches = new Map<number, () => void>();
  let disposed = false;
  const locationListeners = new Set<(point: GeoPoint) => void>();

  function safeCall<T extends unknown[]>(fn: (...args: T) => unknown, label: string, ...args: T) {
    try {
      const result = fn(...args);
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        (result as Promise<unknown>).catch((err: unknown) =>
          log("error", `${label}: ${err instanceof Error ? err.message : String(err)}`),
        );
      }
    } catch (err) {
      log("error", `${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Simulator events → handlers
  if (simulator && !dryRun) {
    const unsubscribe = simulator.subscribe((event) => {
      if (disposed) return;
      if (event.type === "shake" && simulator.sensors) emitShake();
      if (event.type === "tilt" && simulator.sensors) emitTilt(event.reading);
      if (event.type === "location" && simulator.sensors) {
        for (const notify of locationListeners) notify(event.point);
      }
      if (event.type === "board-message" && simulator.board && ble.connected) emitMessage(event.text);
    });
    cleanups.add(unsubscribe);
  }
  function emitShake() {
    for (const handler of shakeHandlers) safeCall(handler, "motion.onShake");
  }
  function emitTilt(reading: TiltReading) {
    for (const handler of tiltHandlers) safeCall(handler, "motion.onTilt", reading);
  }
  function emitMessage(text: string) {
    for (const handler of messageHandlers) safeCall(handler, "ble.onMessage", text);
  }
  function emitDisconnect() {
    for (const handler of disconnectHandlers) safeCall(handler, "ble.onDisconnect");
  }

  // ── location ──────────────────────────────────────────────────────────
  function geolocationError(error: GeolocationPositionError | { code?: number }) {
    if (error.code === 1) return new Error(isSecure() ? DEVICE_MESSAGES.locationDenied : DEVICE_MESSAGES.insecure);
    if (error.code === 3) return new Error(DEVICE_MESSAGES.locationTimeout);
    return new Error(DEVICE_MESSAGES.locationUnavailable);
  }

  function toPoint(position: GeolocationPosition): GeoPoint {
    return {
      lat: Number(position.coords.latitude.toFixed(6)),
      lng: Number(position.coords.longitude.toFixed(6)),
      accuracy: Math.round(position.coords.accuracy),
    };
  }

  const location: DeviceServices["location"] = {
    get() {
      record("location.get");
      if (dryRun) return Promise.resolve({ ...DRY_RUN_LOCATION });
      if (useSimSensors()) return Promise.resolve({ ...simulator!.location });
      const geo = typeof navigator !== "undefined" ? navigator.geolocation : undefined;
      if (!geo) return Promise.reject(new Error(isSecure() ? DEVICE_MESSAGES.noLocation : DEVICE_MESSAGES.insecure));
      return new Promise((resolve, reject) => {
        geo.getCurrentPosition(
          (position) => resolve(toPoint(position)),
          (error) => reject(geolocationError(error)),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        );
      });
    },
    watch(callback) {
      record("location.watch");
      if (typeof callback !== "function") throw new TypeError("location.watch(callback) needs a function");
      const id = ++watchSeq;
      if (dryRun) {
        safeCall(callback, "location.watch", { ...DRY_RUN_LOCATION });
        return id;
      }
      if (useSimSensors()) {
        const listener = (point: GeoPoint) => safeCall(callback, "location.watch", point);
        locationListeners.add(listener);
        listener({ ...simulator!.location });
        watches.set(id, () => locationListeners.delete(listener));
        return id;
      }
      const geo = typeof navigator !== "undefined" ? navigator.geolocation : undefined;
      if (!geo) {
        log("error", isSecure() ? DEVICE_MESSAGES.noLocation : DEVICE_MESSAGES.insecure);
        return id;
      }
      const handle = geo.watchPosition(
        (position) => safeCall(callback, "location.watch", toPoint(position)),
        (error) => log("error", geolocationError(error).message),
        { enableHighAccuracy: true, maximumAge: 2000 },
      );
      watches.set(id, () => geo.clearWatch(handle));
      return id;
    },
    stop() {
      record("location.stop");
      for (const stop of watches.values()) stop();
      watches.clear();
    },
  };

  // ── motion ────────────────────────────────────────────────────────────
  let motionAttached = false;
  let lastShakeAt = 0;
  let lastTiltAt = 0;
  let lastAccel: TiltReading | null = null;

  function attachMotion() {
    if (motionAttached || dryRun || useSimSensors()) return;
    const w = getWindow();
    if (!w || !("DeviceMotionEvent" in w)) {
      log("warn", isSecure() ? DEVICE_MESSAGES.noMotion : DEVICE_MESSAGES.insecure);
      return;
    }
    motionAttached = true;
    const onMotion = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const reading = {
        x: Number((a.x ?? 0).toFixed(2)),
        y: Number((a.y ?? 0).toFixed(2)),
        z: Number((a.z ?? 0).toFixed(2)),
      };
      const now = Date.now();
      if (lastAccel) {
        const delta =
          Math.abs(reading.x - lastAccel.x) + Math.abs(reading.y - lastAccel.y) + Math.abs(reading.z - lastAccel.z);
        if (delta > SHAKE_THRESHOLD && now - lastShakeAt > SHAKE_COOLDOWN_MS) {
          lastShakeAt = now;
          emitShake();
        }
      }
      lastAccel = reading;
      if (now - lastTiltAt >= TILT_INTERVAL_MS) {
        lastTiltAt = now;
        emitTilt(reading);
      }
    };
    w.addEventListener("devicemotion", onMotion);
    cleanups.add(() => w.removeEventListener("devicemotion", onMotion));

    // iOS 13+: permission must be requested from a tap
    const DME = (w as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } })
      .DeviceMotionEvent;
    if (typeof DME?.requestPermission === "function") {
      const ask = () => {
        DME.requestPermission!().catch(() => log("warn", DEVICE_MESSAGES.noMotion));
        w.removeEventListener("pointerdown", ask);
      };
      w.addEventListener("pointerdown", ask);
      cleanups.add(() => w.removeEventListener("pointerdown", ask));
    }
  }

  const motion: DeviceServices["motion"] = {
    onShake(callback) {
      record("motion.onShake");
      if (typeof callback !== "function") throw new TypeError("motion.onShake(callback) needs a function");
      shakeHandlers.push(callback);
      attachMotion();
    },
    onTilt(callback) {
      record("motion.onTilt");
      if (typeof callback !== "function") throw new TypeError("motion.onTilt(callback) needs a function");
      tiltHandlers.push(callback);
      attachMotion();
      if (useSimSensors()) safeCall(callback, "motion.onTilt", { ...simulator!.tilt });
    },
    stop() {
      record("motion.stop");
      shakeHandlers.length = 0;
      tiltHandlers.length = 0;
    },
  };

  // ── ble ───────────────────────────────────────────────────────────────
  interface BleState {
    connected: boolean;
    name: string;
    write: ((chunk: Uint8Array) => Promise<void>) | null;
    close: (() => Promise<void>) | null;
  }
  const ble: BleState & DeviceServices["ble"] = {
    connected: false,
    name: "",
    write: null,
    close: null,

    async connect(namePrefix?: string) {
      record("ble.connect");
      if (dryRun || useSimBoard()) {
        ble.connected = true;
        ble.name = "บอร์ดจำลอง";
        ble.write = async (chunk) => {
          if (!dryRun) simulator?.receiveFromApp(new TextDecoder().decode(chunk));
        };
        ble.close = async () => undefined;
        log("success", "Bluetooth: เชื่อมต่อบอร์ดจำลองแล้ว");
        return ble.name;
      }

      const capBle = getCapacitorBle();
      if (capBle) return connectCapacitor(capBle, namePrefix);

      const bluetooth = (typeof navigator !== "undefined"
        ? (navigator as Navigator & { bluetooth?: WebBluetooth }).bluetooth
        : undefined);
      if (!bluetooth) throw new Error(isSecure() ? DEVICE_MESSAGES.noBle : DEVICE_MESSAGES.insecure);

      let device: WebBluetoothDevice;
      try {
        device = await bluetooth.requestDevice(
          namePrefix
            ? { filters: [{ namePrefix: String(namePrefix) }], optionalServices: [NUS_SERVICE] }
            : { filters: [{ services: [NUS_SERVICE] }], optionalServices: [NUS_SERVICE] },
        );
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (name === "NotFoundError") throw new Error(DEVICE_MESSAGES.bleCancelled);
        if (name === "SecurityError") throw new Error(DEVICE_MESSAGES.bleGesture);
        throw err;
      }
      const server = await device.gatt!.connect();
      let service: WebBluetoothService;
      try {
        service = await server.getPrimaryService(NUS_SERVICE);
      } catch {
        server.disconnect?.();
        throw new Error(DEVICE_MESSAGES.bleNoUart);
      }
      const characteristics = await service.getCharacteristics();
      const { notifyUuid, writeUuid } = pickUartCharacteristics(
        characteristics.map((c) => ({
          uuid: c.uuid,
          notify: Boolean(c.properties.notify || c.properties.indicate),
          write: Boolean(c.properties.write || c.properties.writeWithoutResponse),
        })),
      );
      const notifyChar = characteristics.find((c) => c.uuid.toLowerCase() === notifyUuid)!;
      const writeChar = characteristics.find((c) => c.uuid.toLowerCase() === writeUuid)!;
      const decoder = new TextDecoder();
      const onValue = (event: Event) => {
        const value = (event.target as unknown as { value: DataView }).value;
        emitMessage(cleanMessage(decoder.decode(value)));
      };
      await notifyChar.startNotifications();
      notifyChar.addEventListener("characteristicvaluechanged", onValue);
      const onGone = () => {
        ble.connected = false;
        emitDisconnect();
      };
      device.addEventListener("gattserverdisconnected", onGone);

      ble.connected = true;
      ble.name = device.name || "BLE";
      ble.write = async (chunk) => {
        if (writeChar.writeValueWithoutResponse && writeChar.properties.writeWithoutResponse) {
          await writeChar.writeValueWithoutResponse(chunk);
        } else {
          await writeChar.writeValue(chunk);
        }
      };
      ble.close = async () => {
        notifyChar.removeEventListener("characteristicvaluechanged", onValue);
        device.removeEventListener("gattserverdisconnected", onGone);
        if (device.gatt?.connected) device.gatt.disconnect();
      };
      log("success", `Bluetooth: เชื่อมต่อ ${ble.name} แล้ว`);
      return ble.name;
    },

    async send(text: unknown) {
      record("ble.send");
      if (!ble.connected || !ble.write) throw new Error(DEVICE_MESSAGES.bleNotConnected);
      for (const chunk of chunkText(String(text ?? ""))) await ble.write(chunk);
    },
    onMessage(callback) {
      record("ble.onMessage");
      if (typeof callback !== "function") throw new TypeError("ble.onMessage(callback) needs a function");
      messageHandlers.push(callback);
    },
    onDisconnect(callback) {
      record("ble.onDisconnect");
      if (typeof callback !== "function") throw new TypeError("ble.onDisconnect(callback) needs a function");
      disconnectHandlers.push(callback);
    },
    isConnected() {
      return ble.connected;
    },
    async disconnect() {
      record("ble.disconnect");
      const close = ble.close;
      ble.connected = false;
      ble.write = null;
      ble.close = null;
      await close?.();
      emitDisconnect();
    },
  };

  async function connectCapacitor(plugin: CapacitorBlePlugin, namePrefix?: string) {
    await plugin.initialize({ androidNeverForLocation: true });
    let device: { deviceId: string; name?: string };
    try {
      device = await plugin.requestDevice(
        namePrefix ? { namePrefix: String(namePrefix), optionalServices: [NUS_SERVICE] } : { services: [NUS_SERVICE] },
      );
    } catch {
      throw new Error(DEVICE_MESSAGES.bleCancelled);
    }
    await plugin.connect({ deviceId: device.deviceId });
    const { services } = await plugin.getServices({ deviceId: device.deviceId });
    const uart = services.find((s) => s.uuid.toLowerCase() === NUS_SERVICE);
    if (!uart) {
      await plugin.disconnect({ deviceId: device.deviceId });
      throw new Error(DEVICE_MESSAGES.bleNoUart);
    }
    const { notifyUuid, writeUuid } = pickUartCharacteristics(
      uart.characteristics.map((c) => ({
        uuid: c.uuid,
        notify: Boolean(c.properties.notify || c.properties.indicate),
        write: Boolean(c.properties.write || c.properties.writeWithoutResponse),
      })),
    );
    const key = `notification|${device.deviceId}|${NUS_SERVICE}|${notifyUuid}`;
    const listener = await plugin.addListener(key, (data) => {
      if (data.value) emitMessage(cleanMessage(hexToText(data.value)));
    });
    const disconnectListener = await plugin.addListener(`disconnected|${device.deviceId}`, () => {
      ble.connected = false;
      emitDisconnect();
    });
    await plugin.startNotifications({ deviceId: device.deviceId, service: NUS_SERVICE, characteristic: notifyUuid });

    ble.connected = true;
    ble.name = device.name || "BLE";
    ble.write = (chunk) =>
      plugin.write({
        deviceId: device.deviceId,
        service: NUS_SERVICE,
        characteristic: writeUuid,
        value: bytesToHex(chunk),
      });
    ble.close = async () => {
      listener.remove();
      disconnectListener.remove();
      await plugin.disconnect({ deviceId: device.deviceId });
    };
    log("success", `Bluetooth: เชื่อมต่อ ${ble.name} แล้ว`);
    return ble.name;
  }

  return {
    location,
    motion,
    ble: {
      connect: (namePrefix) => ble.connect(namePrefix),
      send: (text) => ble.send(text),
      onMessage: (cb) => ble.onMessage(cb),
      onDisconnect: (cb) => ble.onDisconnect(cb),
      isConnected: () => ble.isConnected(),
      disconnect: () => ble.disconnect(),
    },
    fireShake: emitShake,
    fireTilt: emitTilt,
    fireBleMessage: emitMessage,
    dispose() {
      disposed = true;
      location.stop();
      shakeHandlers.length = 0;
      tiltHandlers.length = 0;
      for (const cleanup of cleanups) cleanup();
      cleanups.clear();
      if (ble.connected) void ble.close?.().catch(() => undefined);
      ble.connected = false;
    },
  };
}

// Minimal Web Bluetooth typings (not in lib.dom for every TS setup)
interface WebBluetooth {
  requestDevice(options: object): Promise<WebBluetoothDevice>;
}
interface WebBluetoothDevice extends EventTarget {
  name?: string;
  gatt?: { connected: boolean; connect(): Promise<WebBluetoothServer>; disconnect(): void };
}
interface WebBluetoothServer {
  getPrimaryService(uuid: string): Promise<WebBluetoothService>;
  disconnect?(): void;
}
interface WebBluetoothService {
  getCharacteristics(): Promise<WebBluetoothCharacteristic[]>;
}
interface WebBluetoothCharacteristic extends EventTarget {
  uuid: string;
  properties: { notify?: boolean; indicate?: boolean; write?: boolean; writeWithoutResponse?: boolean };
  startNotifications(): Promise<unknown>;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
}

import { afterEach, describe, expect, it } from "vitest";

import type { AppElement } from "../../app/composables/useEditorStore";
import { executeCode } from "../../app/composables/useRuntime";
import {
  DEVICE_MESSAGES,
  DRY_RUN_LOCATION,
  NUS_CHAR_A,
  NUS_CHAR_B,
  NUS_SERVICE,
  chunkText,
  createDeviceServices,
  hexToText,
  bytesToHex,
  pickUartCharacteristics,
  type SensorSimulator,
  type SimulatorEvent,
} from "../../app/utils/deviceServices";
import { runScenario } from "../../app/utils/learningRequirements";

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

function setGlobal(name: "navigator" | "window", value: unknown) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

afterEach(() => {
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else delete (globalThis as Record<string, unknown>).navigator;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete (globalThis as Record<string, unknown>).window;
});

function makeSimulator(): SensorSimulator & { emit(event: SimulatorEvent): void; received: string[] } {
  const listeners = new Set<(event: SimulatorEvent) => void>();
  const received: string[] = [];
  return {
    sensors: true,
    board: true,
    location: { lat: 18.78, lng: 98.99, accuracy: 5 },
    tilt: { x: 1, y: 2, z: 9 },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    receiveFromApp(text) {
      received.push(text);
    },
    emit(event) {
      for (const listener of listeners) listener(event);
    },
    received,
  };
}

function el(id: string, type: string, props: Record<string, unknown> = {}): AppElement {
  return { id, pageId: "page1", type, x: 0, y: 0, width: 100, height: 40, props, parentId: null, children: [] };
}

describe("BLE helpers", () => {
  it("splits long text into 20-byte BLE chunks (UTF-8 aware)", () => {
    const chunks = chunkText("สวัสดีครับบอร์ด");
    expect(chunks.every((chunk) => chunk.length <= 20)).toBe(true);
    const joined = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    expect(new TextDecoder().decode(joined)).toBe("สวัสดีครับบอร์ด");
  });

  it("converts between hex strings and text for the Capacitor plugin", () => {
    expect(bytesToHex(new TextEncoder().encode("ON"))).toBe("4f 4e");
    expect(hexToText("4f 4e")).toBe("ON");
  });

  it("picks write/notify characteristics by property (ESP32 and micro:bit layouts)", () => {
    expect(
      pickUartCharacteristics([
        { uuid: NUS_CHAR_A, write: true, notify: false },
        { uuid: NUS_CHAR_B, write: false, notify: true },
      ]),
    ).toEqual({ notifyUuid: NUS_CHAR_B, writeUuid: NUS_CHAR_A });
    // micro:bit swaps roles
    expect(
      pickUartCharacteristics([
        { uuid: NUS_CHAR_A, write: false, notify: true },
        { uuid: NUS_CHAR_B, write: true, notify: false },
      ]),
    ).toEqual({ notifyUuid: NUS_CHAR_A, writeUuid: NUS_CHAR_B });
  });
});

describe("device services — dry run", () => {
  it("records calls and returns a fixed location without hardware", async () => {
    const calls: string[] = [];
    const device = createDeviceServices({ dryRun: true }, undefined, (name) => calls.push(name));
    expect(await device.location.get()).toEqual(DRY_RUN_LOCATION);
    let shakes = 0;
    device.motion.onShake(() => shakes++);
    device.fireShake();
    expect(shakes).toBe(1);
    expect(await device.ble.connect()).toBe("บอร์ดจำลอง");
    await device.ble.send("ON");
    expect(calls).toEqual(["location.get", "motion.onShake", "ble.connect", "ble.send"]);
  });

  it("rejects ble.send before connect with a friendly message", async () => {
    const device = createDeviceServices({ dryRun: true });
    const message = await device.ble.send("x").then(
      () => "ok",
      (e: Error) => e.message,
    );
    expect(message).toBe(DEVICE_MESSAGES.bleNotConnected);
  });
});

describe("device services — simulator", () => {
  it("serves simulated GPS, shake, tilt and board messages", async () => {
    const sim = makeSimulator();
    const device = createDeviceServices({ simulator: sim });
    expect(await device.location.get()).toEqual({ lat: 18.78, lng: 98.99, accuracy: 5 });

    const seen: string[] = [];
    device.location.watch((p) => seen.push(`loc:${p.lat}`));
    device.motion.onShake(() => seen.push("shake"));
    device.motion.onTilt((t) => seen.push(`tilt:${t.x}`));
    sim.emit({ type: "location", point: { lat: 7.9, lng: 98.3, accuracy: 5 } });
    sim.emit({ type: "shake" });
    sim.emit({ type: "tilt", reading: { x: 5, y: 0, z: 9 } });

    await device.ble.connect();
    device.ble.onMessage((text) => seen.push(`msg:${text}`));
    await device.ble.send("LED ON");
    sim.emit({ type: "board-message", text: "25.4" });

    expect(seen).toEqual(["loc:18.78", "tilt:1", "loc:7.9", "shake", "tilt:5", "msg:25.4"]);
    expect(sim.received).toEqual(["LED ON"]);

    device.dispose();
    sim.emit({ type: "shake" });
    expect(seen.filter((s) => s === "shake")).toHaveLength(1);
  });
});

describe("device services — real browser APIs", () => {
  it("reads navigator.geolocation and maps permission errors", async () => {
    let mode: "ok" | "denied" = "ok";
    setGlobal("navigator", {
      geolocation: {
        getCurrentPosition(ok: (p: unknown) => void, fail: (e: unknown) => void) {
          if (mode === "ok") ok({ coords: { latitude: 13.123456789, longitude: 100.5, accuracy: 12.7 } });
          else fail({ code: 1 });
        },
      },
    });
    setGlobal("window", { isSecureContext: true });
    const device = createDeviceServices({});
    expect(await device.location.get()).toEqual({ lat: 13.123457, lng: 100.5, accuracy: 13 });
    mode = "denied";
    const message = await device.location.get().then(
      () => "ok",
      (e: Error) => e.message,
    );
    expect(message).toBe(DEVICE_MESSAGES.locationDenied);
  });

  it("explains https when sensors are blocked on an insecure page", async () => {
    setGlobal("navigator", {});
    setGlobal("window", { isSecureContext: false });
    const device = createDeviceServices({});
    const message = await device.location.get().then(
      () => "ok",
      (e: Error) => e.message,
    );
    expect(message).toBe(DEVICE_MESSAGES.insecure);
  });

  it("detects a shake from devicemotion readings", () => {
    const handlers: ((event: unknown) => void)[] = [];
    setGlobal("window", {
      isSecureContext: true,
      DeviceMotionEvent: function DeviceMotionEvent() {},
      addEventListener: (name: string, handler: (event: unknown) => void) => {
        if (name === "devicemotion") handlers.push(handler);
      },
      removeEventListener: () => undefined,
    });
    const device = createDeviceServices({});
    let shakes = 0;
    device.motion.onShake(() => shakes++);
    const fire = (x: number, y: number, z: number) =>
      handlers.forEach((h) => h({ accelerationIncludingGravity: { x, y, z } }));
    fire(0, 0, 9.8);
    fire(0.2, 0.1, 9.7); // still
    expect(shakes).toBe(0);
    fire(12, -8, 3); // big jolt
    expect(shakes).toBe(1);
    device.dispose();
  });

  it("connects to a Web Bluetooth UART board, sends text and receives messages", async () => {
    const written: string[] = [];
    let notifyHandler: ((event: unknown) => void) | null = null;
    const notifyChar = {
      uuid: NUS_CHAR_B,
      properties: { notify: true },
      startNotifications: async () => undefined,
      addEventListener: (_: string, handler: (event: unknown) => void) => (notifyHandler = handler),
      removeEventListener: () => undefined,
    };
    const writeChar = {
      uuid: NUS_CHAR_A,
      properties: { write: true },
      writeValue: async (value: Uint8Array) => {
        written.push(new TextDecoder().decode(value));
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    let requested: unknown = null;
    setGlobal("window", { isSecureContext: true });
    setGlobal("navigator", {
      bluetooth: {
        requestDevice: async (options: unknown) => {
          requested = options;
          return {
            name: "ESP32-CodeCraft",
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            gatt: {
              connected: true,
              connect: async () => ({
                getPrimaryService: async (uuid: string) => {
                  expect(uuid).toBe(NUS_SERVICE);
                  return { getCharacteristics: async () => [writeChar, notifyChar] };
                },
              }),
              disconnect: () => undefined,
            },
          };
        },
      },
    });
    const device = createDeviceServices({});
    expect(await device.ble.connect("ESP32")).toBe("ESP32-CodeCraft");
    expect(JSON.stringify(requested)).toContain("ESP32");
    await device.ble.send("LED ON");
    expect(written).toEqual(["LED ON"]);
    const got: string[] = [];
    device.ble.onMessage((text) => got.push(text));
    notifyHandler!({ target: { value: new DataView(new TextEncoder().encode("temp=25\r\n").buffer) } });
    expect(got).toEqual(["temp=25"]);
    expect(device.ble.isConnected()).toBe(true);
  });

  it("tells iPhone users Web Bluetooth is not available", async () => {
    setGlobal("window", { isSecureContext: true });
    setGlobal("navigator", {});
    const device = createDeviceServices({});
    const message = await device.ble.connect().then(
      () => "ok",
      (e: Error) => e.message,
    );
    expect(message).toBe(DEVICE_MESSAGES.noBle);
  });
});

describe("learner code + lesson scenarios", () => {
  it("exposes location / motion / ble globals and Map methods to learner code", async () => {
    const elements = [el("page1_label1", "Label", { content: "" }), el("page1_map1", "Map", { lat: 0, lng: 0, zoom: 3, markers: [] })];
    const result = executeCode(
      `var label1 = new Label('page1_label1'); page.add(label1);
var map1 = new Map('page1_map1'); page.add(map1);
motion.onShake(() => { label1.text = 'shaken'; });
location.get().then((p) => { map1.setCenter(p.lat, p.lng, 15); map1.addMarker(p.lat, p.lng, 'me'); });`,
      elements,
      undefined,
      undefined,
      undefined,
      undefined,
      { services: { dryRun: true } },
    );
    result.device.fireShake();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(elements[0]!.props.content).toBe("shaken");
    expect(elements[1]!.props.lat).toBe(DRY_RUN_LOCATION.lat);
    expect(elements[1]!.props.zoom).toBe(15);
    expect((elements[1]!.props.markers as unknown[]).length).toBe(1);
  });

  it("supports shake / ble-message scenario actions for lesson checks", () => {
    const elements = [el("page1_label1", "Label", { content: "0" })];
    const code = `var label1 = new Label('page1_label1'); page.add(label1);
var n = 0;
motion.onShake(() => { n = n + 1; label1.text = n; });
ble.onMessage((t) => { label1.text = 'board:' + t; });`;
    const ctx = { elements, currentPageId: "page1", jsCode: code };
    expect(
      runScenario(
        { id: "s", type: "scenario", actions: [{ type: "shake", times: 3 }], expect: { kind: "text", elementType: "Label", pattern: "^3$" }, message: "" },
        ctx,
      ).met,
    ).toBe(true);
    expect(
      runScenario(
        { id: "b", type: "scenario", actions: [{ type: "ble-message", text: "hi" }], expect: { kind: "text", elementType: "Label", pattern: "board:hi" }, message: "" },
        ctx,
      ).met,
    ).toBe(true);
  });
});

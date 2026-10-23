import { reactive } from "vue";

import type { GeoPoint, SensorSimulator, SimulatorEvent, TiltReading } from "~/utils/deviceServices";

/**
 * Editor-only stand-in for phone hardware, so learners can test GPS, shake,
 * tilt and a Bluetooth board without a phone. One shared instance per tab.
 */

export interface BoardLogEntry {
  id: number;
  direction: "app-to-board" | "board-to-app";
  text: string;
}

export const LOCATION_PRESETS: { label: string; point: GeoPoint }[] = [
  { label: "กรุงเทพฯ (อนุสาวรีย์ชัยฯ)", point: { lat: 13.7649, lng: 100.5383, accuracy: 10 } },
  { label: "เชียงใหม่ (ประตูท่าแพ)", point: { lat: 18.7877, lng: 98.9933, accuracy: 10 } },
  { label: "ภูเก็ต (หาดป่าตอง)", point: { lat: 7.8964, lng: 98.2961, accuracy: 10 } },
  { label: "ขอนแก่น (บึงแก่นนคร)", point: { lat: 16.4106, lng: 102.8360, accuracy: 10 } },
];

const listeners = new Set<(event: SimulatorEvent) => void>();
let logSeq = 0;

const state = reactive({
  sensors: true,
  board: true,
  location: { ...LOCATION_PRESETS[0]!.point } as GeoPoint,
  tilt: { x: 0, y: 0, z: 9.81 } as TiltReading,
  boardLog: [] as BoardLogEntry[],
});

function emit(event: SimulatorEvent) {
  for (const listener of listeners) listener(event);
}

function pushLog(direction: BoardLogEntry["direction"], text: string) {
  state.boardLog = [...state.boardLog, { id: ++logSeq, direction, text }].slice(-40);
}

/** The object handed to the runtime (implements SensorSimulator). */
const simulator: SensorSimulator = {
  get sensors() {
    return state.sensors;
  },
  set sensors(value: boolean) {
    state.sensors = value;
  },
  get board() {
    return state.board;
  },
  set board(value: boolean) {
    state.board = value;
  },
  get location() {
    return { ...state.location };
  },
  set location(point: GeoPoint) {
    state.location = { ...point };
  },
  get tilt() {
    return { ...state.tilt };
  },
  set tilt(reading: TiltReading) {
    state.tilt = { ...reading };
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  receiveFromApp(text: string) {
    pushLog("app-to-board", text);
  },
};

export function useSensorSimulator() {
  function setLocation(point: GeoPoint) {
    state.location = { ...point };
    emit({ type: "location", point: { ...point } });
  }

  function shake() {
    emit({ type: "shake" });
  }

  function setTilt(reading: Partial<TiltReading>) {
    state.tilt = { ...state.tilt, ...reading };
    emit({ type: "tilt", reading: { ...state.tilt } });
  }

  function sendFromBoard(text: string) {
    if (!text.trim()) return;
    pushLog("board-to-app", text);
    emit({ type: "board-message", text });
  }

  function clearBoardLog() {
    state.boardLog = [];
  }

  return { state, simulator, setLocation, shake, setTilt, sendFromBoard, clearBoardLog };
}

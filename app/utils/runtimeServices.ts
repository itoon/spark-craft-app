/**
 * Runtime services inspired by MIT App Inventor's non-visible components:
 *   Notifier        → notify.toast / notify.alert
 *   Clock (Timer)   → timer.every / timer.after / timer.stop / timer.stopAll
 *   TinyDB          → storage.set / storage.get / storage.remove / storage.keys
 *   TextToSpeech +
 *   Sound (vibrate) → phone.speak / phone.vibrate
 *
 * The same API runs in three places: the editor Run mode, the shared/live
 * phone viewer, and the learning checker. The checker uses `dryRun`, which
 * records what the code asked for instead of starting real timers or speech.
 */

export type NotifyKind = "toast" | "alert";

export interface RuntimeNotification {
  id: number;
  kind: NotifyKind;
  message: string;
}

export interface RuntimeServiceHost {
  /** Called when the app shows a toast / alert. */
  onNotify?: (notification: RuntimeNotification) => void;
  /** Keeps storage of different projects apart. */
  storageNamespace?: string;
  /** Record calls instead of touching timers, speech, vibration, localStorage. */
  dryRun?: boolean;
  /** Optional pre-seeded storage for dry runs. */
  initialStorage?: Record<string, unknown>;
}

export interface RecordedTimer {
  id: number;
  kind: "every" | "after";
  ms: number;
  callback: () => unknown;
  active: boolean;
}

type LogFn = (type: "log" | "warn" | "error" | "success", message: string) => void;

export interface RuntimeServices {
  notify: {
    toast(message: unknown): void;
    alert(message: unknown): void;
  };
  timer: {
    every(ms: number, callback: () => unknown): number;
    after(ms: number, callback: () => unknown): number;
    stop(id: number): void;
    stopAll(): void;
  };
  storage: {
    set(key: string, value: unknown): void;
    get<T = unknown>(key: string, fallback?: T): T;
    remove(key: string): void;
    keys(): string[];
  };
  phone: {
    speak(text: unknown): void;
    vibrate(ms?: number): void;
  };
  /** Names of every service call made so far, e.g. "notify.toast". */
  calls: string[];
  /** Timers registered so far (all modes). */
  timers: RecordedTimer[];
  /** Dry-run helper: run every active timer callback `rounds` times. */
  fireTimers(rounds?: number): void;
  /** Stop timers and speech. Safe to call more than once. */
  dispose(): void;
}

const MIN_INTERVAL_MS = 50;
let notificationSeq = 0;

function hasThai(text: string) {
  return /[฀-๿]/.test(text);
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function storageKeyPrefix(namespace = "default") {
  return `codecraft-app-storage:${namespace}:`;
}

export function createRuntimeServices(
  host: RuntimeServiceHost = {},
  log: LogFn = () => undefined,
): RuntimeServices {
  const calls: string[] = [];
  const timers: RecordedTimer[] = [];
  const realHandles = new Map<number, ReturnType<typeof setInterval>>();
  const memoryStore = new Map<string, unknown>(
    Object.entries(host.initialStorage ?? {}),
  );
  const prefix = storageKeyPrefix(host.storageNamespace);
  const dryRun = Boolean(host.dryRun);
  let timerSeq = 0;
  let disposed = false;

  function record(name: string) {
    calls.push(name);
  }

  function runCallback(callback: () => unknown, label: string) {
    try {
      const result = callback();
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        (result as Promise<unknown>).catch((err: unknown) =>
          log("error", `${label}: ${err instanceof Error ? err.message : String(err)}`),
        );
      }
    } catch (err) {
      log("error", `${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function notifyWith(kind: NotifyKind, message: unknown) {
    record(`notify.${kind}`);
    const text = String(message ?? "");
    log("log", `${kind === "toast" ? "Toast" : "Alert"}: ${text}`);
    if (dryRun) return;
    const notification = { id: ++notificationSeq, kind, message: text };
    if (host.onNotify) {
      host.onNotify(notification);
    } else if (kind === "alert" && typeof window !== "undefined") {
      window.alert(text);
    }
  }

  function addTimer(kind: "every" | "after", ms: number, callback: () => unknown) {
    record(`timer.${kind}`);
    if (typeof callback !== "function") {
      throw new TypeError(`timer.${kind}(ms, callback) needs a function as the 2nd value`);
    }
    const delay = Math.max(MIN_INTERVAL_MS, Number(ms) || 0);
    const id = ++timerSeq;
    const entry: RecordedTimer = { id, kind, ms: delay, callback, active: true };
    timers.push(entry);

    if (!dryRun && !disposed) {
      const label = `timer.${kind} #${id}`;
      if (kind === "every") {
        realHandles.set(id, setInterval(() => runCallback(callback, label), delay));
      } else {
        realHandles.set(
          id,
          setTimeout(() => {
            entry.active = false;
            realHandles.delete(id);
            runCallback(callback, label);
          }, delay),
        );
      }
    }
    return id;
  }

  function stopTimer(id: number) {
    const entry = timers.find((t) => t.id === id);
    if (entry) entry.active = false;
    const handle = realHandles.get(id);
    if (handle !== undefined) {
      clearInterval(handle);
      clearTimeout(handle);
      realHandles.delete(id);
    }
  }

  function stopAllTimers() {
    for (const entry of timers) stopTimer(entry.id);
  }

  const services: RuntimeServices = {
    notify: {
      toast: (message) => notifyWith("toast", message),
      alert: (message) => notifyWith("alert", message),
    },
    timer: {
      every: (ms, callback) => addTimer("every", ms, callback),
      after: (ms, callback) => addTimer("after", ms, callback),
      stop: (id) => {
        record("timer.stop");
        stopTimer(id);
      },
      stopAll: () => {
        record("timer.stopAll");
        stopAllTimers();
      },
    },
    storage: {
      set(key, value) {
        record("storage.set");
        const k = String(key);
        memoryStore.set(k, value);
        if (dryRun) return;
        const ls = safeLocalStorage();
        try {
          ls?.setItem(prefix + k, JSON.stringify(value));
        } catch {
          log("warn", `storage.set('${k}') could not be saved on this device`);
        }
      },
      get(key, fallback) {
        record("storage.get");
        const k = String(key);
        if (!dryRun) {
          const ls = safeLocalStorage();
          const raw = ls?.getItem(prefix + k);
          if (raw !== null && raw !== undefined) {
            try {
              return JSON.parse(raw);
            } catch {
              return raw as never;
            }
          }
        }
        return (memoryStore.has(k) ? memoryStore.get(k) : fallback) as never;
      },
      remove(key) {
        record("storage.remove");
        const k = String(key);
        memoryStore.delete(k);
        if (!dryRun) safeLocalStorage()?.removeItem(prefix + k);
      },
      keys() {
        record("storage.keys");
        const result = new Set<string>(memoryStore.keys());
        const ls = dryRun ? null : safeLocalStorage();
        if (ls) {
          for (let i = 0; i < ls.length; i++) {
            const name = ls.key(i);
            if (name?.startsWith(prefix)) result.add(name.slice(prefix.length));
          }
        }
        return [...result];
      },
    },
    phone: {
      speak(text) {
        record("phone.speak");
        const words = String(text ?? "");
        log("log", `Speak: ${words}`);
        if (dryRun || typeof window === "undefined" || !("speechSynthesis" in window)) return;
        try {
          const utterance = new SpeechSynthesisUtterance(words);
          utterance.lang = hasThai(words) ? "th-TH" : "en-US";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } catch {
          log("warn", "phone.speak() is not supported on this device");
        }
      },
      vibrate(ms = 200) {
        record("phone.vibrate");
        if (dryRun || typeof navigator === "undefined") return;
        try {
          if (typeof navigator.vibrate === "function") navigator.vibrate(Math.max(0, Number(ms) || 0));
        } catch {
          // Vibration is optional (desktop browsers / iOS ignore it).
        }
      },
    },
    calls,
    timers,
    fireTimers(rounds = 1) {
      for (let round = 0; round < rounds; round++) {
        // Snapshot: callbacks may add or stop timers.
        for (const entry of [...timers]) {
          if (!entry.active) continue;
          if (entry.kind === "after") entry.active = false;
          runCallback(entry.callback, `timer.${entry.kind} #${entry.id}`);
        }
      }
    },
    dispose() {
      disposed = true;
      stopAllTimers();
      if (!dryRun && typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    },
  };

  return services;
}

/** API reference used by the code editor autocomplete and docs. */
export const RUNTIME_SERVICE_API: Record<string, { description: string; methods: string[] }> = {
  notify: {
    description: "Pop-up messages (App Inventor: Notifier)",
    methods: ["toast(text)", "alert(text)"],
  },
  timer: {
    description: "Run code later or repeatedly (App Inventor: Clock)",
    methods: ["every(ms, callback)", "after(ms, callback)", "stop(id)", "stopAll()"],
  },
  storage: {
    description: "Save values on the device (App Inventor: TinyDB)",
    methods: ["set(key, value)", "get(key, fallback)", "remove(key)", "keys()"],
  },
  phone: {
    description: "Talk and vibrate (App Inventor: TextToSpeech / Sound)",
    methods: ["speak(text)", "vibrate(ms)"],
  },
  location: {
    description: "GPS position (App Inventor: LocationSensor) — needs https on phones",
    methods: ["get()", "watch(callback)", "stop()"],
  },
  motion: {
    description: "Shake and tilt (App Inventor: AccelerometerSensor)",
    methods: ["onShake(callback)", "onTilt(callback)", "stop()"],
  },
  ble: {
    description: "Talk to an ESP32 / micro:bit over Bluetooth LE (BLE UART)",
    methods: ["connect(namePrefix)", "send(text)", "onMessage(callback)", "onDisconnect(callback)", "isConnected()", "disconnect()"],
  },
};

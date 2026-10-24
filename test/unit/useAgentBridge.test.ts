import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The composable is client-only: give it a window before it loads. Runs in the
// node `unit` project — the `nuxt` vitest project cannot load @vue/test-utils.
const fakeWindow = new EventTarget();
vi.stubGlobal("window", fakeWindow);
const toastAdd = vi.fn();
vi.stubGlobal("useToast", () => ({ add: toastAdd }));

type Call = { url: string; method: string; body?: Record<string, unknown> };
type Bridge = ReturnType<typeof import("../../app/composables/useAgentBridge").useAgentBridge>;
type Store = typeof import("../../app/composables/useEditorStore");

/**
 * A fake agent API: claims succeed (or wait for `releaseClaims()` when
 * `holdClaims`), polls take `pollAnswers` first, then wait for `answer()`.
 */
function fakeServer(pollAnswers: unknown[], options: { holdClaims?: boolean } = {}) {
  const calls: Call[] = [];
  let version = 0;
  let answerPoll: ((value: unknown) => void) | null = null;
  const heldClaims: Array<() => void> = [];
  const fetchMock = Object.assign(
    vi.fn(async (url: string, opts: { method?: string; body?: Record<string, unknown> } = {}) => {
      calls.push({ url, method: opts.method ?? "GET", body: opts.body });
      if (url === "/api/agent/editor" && opts.method === "POST") {
        if (options.holdClaims) await new Promise<void>((resolve) => heldClaims.push(resolve));
        return { version: ++version };
      }
      return { ok: true };
    }),
    {
      raw: vi.fn(async (url: string, opts: { signal?: AbortSignal }) => {
        calls.push({ url, method: "GET" });
        const next = pollAnswers.shift();
        if (next !== undefined) return { status: 200, _data: next };
        return new Promise((resolve, reject) => {
          answerPoll = (data) => resolve({ status: 200, _data: data });
          opts.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        });
      }),
    },
  );
  vi.stubGlobal("$fetch", fetchMock);
  return {
    calls,
    posts: () => calls.filter((c) => c.method === "POST"),
    claims: () => calls.filter((c) => c.method === "POST" && c.url === "/api/agent/editor"),
    answer: (data: unknown) => answerPoll?.(data),
    releaseClaims: () => heldClaims.splice(0).forEach((resolve) => resolve()),
  };
}

const flush = async () => {
  for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 0));
};

describe("useAgentBridge", () => {
  let useAgentBridge: () => Bridge;
  let editor: Store;
  let bridge: Bridge;

  beforeAll(async () => {
    ({ useAgentBridge } = await import("../../app/composables/useAgentBridge"));
    editor = await import("../../app/composables/useEditorStore");
  });

  beforeEach(() => {
    toastAdd.mockClear();
    editor.resetEditorStoreForTests();
    bridge = useAgentBridge();
  });

  afterEach(async () => {
    bridge.stop();
    await flush();
  });

  it("focus while active posts nothing", async () => {
    const server = fakeServer([]);
    bridge.start();
    await flush();
    expect(bridge.connected.value).toBe(true);
    const before = server.posts().length;

    fakeWindow.dispatchEvent(new Event("focus"));
    await flush();
    expect(server.posts()).toHaveLength(before);
  });

  it("claims again when a poll says no tab is active", async () => {
    const server = fakeServer([{ version: 0, state: null, active: false }]);
    bridge.start();
    await flush();
    expect(server.claims()).toHaveLength(2); // first claim, then after the null answer
    expect(bridge.connected.value).toBe(true);
  });

  it("stop() sends a release for this tab", async () => {
    const server = fakeServer([]);
    bridge.start();
    await flush();
    const tabId = server.claims()[0]!.body!.tabId;

    bridge.stop();
    await flush();
    const release = server.posts().find((c) => c.url === "/api/agent/editor/release");
    expect(release?.body).toEqual({ tabId });
    expect(bridge.connected.value).toBe(false);
  });

  it("an AI update keeps the selected element and the open preview", async () => {
    const server = fakeServer([]);
    bridge.start();
    await flush();
    const store = editor.useEditorStore();
    const rootId = store.rootContainer.value!.id;
    store.selectElement(rootId);
    store.togglePreview();
    await flush();

    server.answer({
      version: 50,
      state: { ...editor.serializeEditorState(), projectName: "AI renamed" },
      active: true,
    });
    await flush();
    expect(store.projectName.value).toBe("AI renamed");
    expect(store.selectedElementId.value).toBe(rootId);
    expect(store.isPreviewOpen.value).toBe(true);
  });

  it("warns when an AI update drops an edit still waiting to be pushed", async () => {
    const server = fakeServer([]);
    bridge.start();
    await flush();
    editor.useEditorStore().setProjectName("typed by learner");
    await flush(); // the 350 ms push debounce is still pending

    server.answer({ version: 50, state: editor.serializeEditorState(), active: true });
    await flush();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ title: "AI แก้โปรเจกต์อยู่ — โหลดเวอร์ชันล่าสุดแล้ว" }),
    );
    expect(server.calls.some((c) => c.method === "PUT")).toBe(false);
  });

  it("a claim answered after stop() does not reconnect", async () => {
    const server = fakeServer([], { holdClaims: true });
    bridge.start();
    await flush();
    bridge.stop();
    server.releaseClaims();
    await flush();
    expect(bridge.connected.value).toBe(false);
    // the release is sent after the claim, so the claim cannot win on the server
    const urls = server.posts().map((c) => c.url);
    expect(urls).toEqual(["/api/agent/editor", "/api/agent/editor/release"]);
  });
});

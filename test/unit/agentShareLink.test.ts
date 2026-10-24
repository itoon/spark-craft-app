import { beforeEach, describe, expect, it, vi } from "vitest";

import { blankProjectState } from "../../app/utils/projectOps";
import { claimEditor, getAgentBridge, resetAgentBridgeForTests } from "../../server/utils/agentBridge";

const writeSharedLink = vi.fn(async (input: { shareId?: string | null }) => ({
  id: input.shareId || "ccagent000000001",
}));
vi.mock("../../server/utils/exportWriters", async (original) => ({
  ...(await original<typeof import("../../server/utils/exportWriters")>()),
  writeSharedLink: (input: { shareId?: string | null }) => writeSharedLink(input),
}));
vi.mock("../../server/utils/lanAddresses", async (original) => ({
  ...(await original<typeof import("../../server/utils/lanAddresses")>()),
  listLanAddresses: () => [{ name: "en0", address: "192.168.1.20" }],
}));

vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
vi.stubGlobal("readBody", async () => ({ startPageId: "page1" }));

function localEvent() {
  return {
    node: { req: { socket: { remoteAddress: "127.0.0.1" }, headers: { host: "localhost:3000" }, connection: {} } },
  };
}

async function handler() {
  return (await import("../../server/api/agent/share-link.post")).default as unknown as (
    event: unknown,
  ) => Promise<{ url: string; lanUrls: string[] }>;
}

describe("POST /api/agent/share-link", () => {
  beforeEach(() => {
    resetAgentBridgeForTests();
    writeSharedLink.mockClear();
  });

  it("uses the agent's own share id and leaves the editor's link alone", async () => {
    const state = { ...blankProjectState("A"), shareLinkId: "ccuserlink000001" };
    claimEditor("tab", state);
    const run = await handler();

    const first = await run(localEvent());
    expect(writeSharedLink.mock.calls[0]![0].shareId).toBeNull();
    expect(first.url).toBe("http://localhost:3000/pwa/ccagent000000001");
    expect(getAgentBridge().agentShareId).toBe("ccagent000000001");
    expect(getAgentBridge().state!.shareLinkId).toBe("ccuserlink000001");

    await run(localEvent());
    expect(writeSharedLink.mock.calls[1]![0].shareId).toBe("ccagent000000001");
  });

  it("returns LAN urls a phone can open", async () => {
    claimEditor("tab", blankProjectState("A"));
    const result = await (await handler())(localEvent());
    expect(result.lanUrls).toEqual(["http://192.168.1.20:3000/pwa/ccagent000000001"]);
  });
});

describe("listLanAddresses", () => {
  it("keeps external IPv4 only, private Wi-Fi first", async () => {
    const { listLanAddresses } = await vi.importActual<typeof import("../../server/utils/lanAddresses")>(
      "../../server/utils/lanAddresses",
    );
    const entry = (address: string, family: string, internal = false) =>
      ({ address, family, internal, netmask: "", mac: "", cidr: null }) as never;
    const list = listLanAddresses({
      lo0: [entry("127.0.0.1", "IPv4", true)],
      utun3: [entry("100.64.0.2", "IPv4")],
      en0: [entry("192.168.1.20", "IPv4"), entry("fe80::1", "IPv6")],
    });
    expect(list).toEqual([
      { name: "en0", address: "192.168.1.20" },
      { name: "utun3", address: "100.64.0.2" },
    ]);
  });
});

import { describe, expect, it, vi } from "vitest";

import type { AppElement } from "../../app/composables/useEditorStore";
import { executeCode } from "../../app/composables/useRuntime";
import { createRuntimeServices } from "../../app/utils/runtimeServices";

function label(id = "page1_label1"): AppElement {
  return {
    id,
    pageId: "page1",
    type: "Label",
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    props: { content: "0" },
    parentId: null,
    children: [],
  };
}

describe("runtime services (App Inventor style)", () => {
  it("records calls and fires timers in dry-run mode without real timers", () => {
    const services = createRuntimeServices({ dryRun: true });
    let ticks = 0;
    const id = services.timer.every(1000, () => {
      ticks += 1;
    });
    services.timer.after(500, () => {
      ticks += 100;
    });
    services.fireTimers(2);
    expect(ticks).toBe(102); // every ×2, after only once
    services.timer.stop(id);
    services.fireTimers(1);
    expect(ticks).toBe(102);
    expect(services.calls).toContain("timer.every");
    expect(services.calls).toContain("timer.stop");
  });

  it("keeps dry-run storage in memory and honours fallbacks and seeds", () => {
    const services = createRuntimeServices({ dryRun: true, initialStorage: { best: 7 } });
    expect(services.storage.get("best", 0)).toBe(7);
    expect(services.storage.get("missing", "x")).toBe("x");
    services.storage.set("best", 9);
    expect(services.storage.get("best", 0)).toBe(9);
    services.storage.remove("best");
    expect(services.storage.get("best", 0)).toBe(0);
  });

  it("sends toasts and alerts to the host", () => {
    const onNotify = vi.fn();
    const services = createRuntimeServices({ onNotify });
    services.notify.toast("hi");
    services.notify.alert("stop");
    expect(onNotify).toHaveBeenCalledTimes(2);
    expect(onNotify.mock.calls[0]![0].kind).toBe("toast");
    expect(onNotify.mock.calls[1]![0].message).toBe("stop");
  });

  it("asks OK / Cancel with notify.confirm and resolves with the answer", async () => {
    const onNotify = vi.fn();
    const services = createRuntimeServices({ onNotify });

    const okAnswer = services.notify.confirm("Delete?");
    const shown = onNotify.mock.calls[0]![0];
    expect(shown.kind).toBe("confirm");
    expect(shown.message).toBe("Delete?");
    shown.respond(true);
    await expect(okAnswer).resolves.toBe(true);

    const cancelAnswer = services.notify.confirm("Sure?");
    onNotify.mock.calls[1]![0].respond(false);
    await expect(cancelAnswer).resolves.toBe(false);
  });

  it("treats notify.confirm as OK in the dry-run checker", async () => {
    const services = createRuntimeServices({ dryRun: true });
    await expect(services.notify.confirm("Delete?")).resolves.toBe(true);
    expect(services.calls).toContain("notify.confirm");
  });

  it("reports errors thrown inside timer callbacks instead of crashing", () => {
    const messages: string[] = [];
    const services = createRuntimeServices({ dryRun: true }, (type, message) => {
      if (type === "error") messages.push(message);
    });
    services.timer.every(100, () => {
      throw new Error("boom");
    });
    services.fireTimers(1);
    expect(messages[0]).toMatch(/boom/);
  });

  it("is available inside learner code via executeCode", () => {
    const elements = [label()];
    const result = executeCode(
      `var label1 = new Label('page1_label1');
page.add(label1);
var n = storage.get('n', 3);
timer.every(1000, () => { n = n + 1; label1.text = n; });
notify.toast('ready');`,
      elements,
      undefined,
      undefined,
      undefined,
      undefined,
      { services: { dryRun: true } },
    );
    expect(result.services.calls).toContain("notify.toast");
    result.services.fireTimers(2);
    expect(elements[0]!.props.content).toBe(5);
    result.services.dispose();
  });

  it("stops real timers on dispose", async () => {
    const services = createRuntimeServices({});
    let ticks = 0;
    services.timer.every(50, () => {
      ticks += 1;
    });
    services.dispose();
    await new Promise((resolve) => setTimeout(resolve, 130));
    expect(ticks).toBe(0);
  });
});

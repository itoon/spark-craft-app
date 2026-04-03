import { describe, expect, it } from "vitest";

import { getVisibleRuntimeChildIds } from "../../app/utils/runtimeVisibility";

describe("getVisibleRuntimeChildIds", () => {
  it("shows only children that were explicitly added in run mode", () => {
    const visible = getVisibleRuntimeChildIds(
      ["page1_card1", "page1_list1", "page1_fab1"],
      ["page1_card1", "page1_fab1"],
      true,
    );

    expect(visible).toEqual(["page1_card1", "page1_fab1"]);
  });

  it("keeps all children visible outside run mode", () => {
    const visible = getVisibleRuntimeChildIds(
      ["page1_card1", "page1_list1"],
      [],
      false,
    );

    expect(visible).toEqual(["page1_card1", "page1_list1"]);
  });
});

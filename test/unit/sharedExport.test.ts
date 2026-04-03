import { describe, expect, it } from "vitest";

import { buildShareId } from "../../app/utils/sharedExport";

describe("shared export helpers", () => {
  it("builds a deterministic share id", () => {
    const id = buildShareId(new Date("2026-04-03T12:34:56.000Z"), 0.12345);

    expect(id).toBe("cc2026040312345618e3v");
  });
});

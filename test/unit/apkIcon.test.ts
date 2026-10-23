import { describe, expect, it } from "vitest";

import { decodePngDataUrl } from "../../server/utils/apkIcon";

// 1×1 transparent PNG
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

describe("decodePngDataUrl", () => {
  it("accepts a real PNG data URL", () => {
    const buffer = decodePngDataUrl(`data:image/png;base64,${PNG_1PX}`);
    expect(buffer?.subarray(1, 4).toString("ascii")).toBe("PNG");
  });

  it("rejects anything that is not a PNG", () => {
    expect(decodePngDataUrl("data:image/jpeg;base64,/9j/4AAQ")).toBeNull();
    expect(decodePngDataUrl(`data:image/png;base64,${Buffer.from("not a png").toString("base64")}`)).toBeNull();
    expect(decodePngDataUrl(undefined)).toBeNull();
    expect(decodePngDataUrl("../../etc/passwd")).toBeNull();
  });

  it("rejects oversized images", () => {
    expect(decodePngDataUrl(`data:image/png;base64,${PNG_1PX}`, 10)).toBeNull();
  });
});

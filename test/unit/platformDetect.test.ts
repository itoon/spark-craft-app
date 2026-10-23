import { describe, expect, it } from "vitest";

import { detectPhonePlatform } from "../../app/utils/platformDetect";

describe("detectPhonePlatform", () => {
  it("matches the phone's own OS", () => {
    expect(detectPhonePlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130 Mobile")).toBe("android");
    expect(detectPhonePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("ios");
    expect(detectPhonePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("ios"); // iPad
    expect(detectPhonePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(null); // real Mac
    expect(detectPhonePlatform("Mozilla/5.0 (Windows NT 10.0)")).toBe(null);
  });
});

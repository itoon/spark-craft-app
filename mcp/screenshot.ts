import { chromium } from "playwright-core";

export const CHROMIUM_MISSING_MESSAGE =
  "ไม่พบ Chromium — รัน bunx playwright install chromium";

export async function takeScreenshot(
  url: string,
  viewport: { width: number; height: number } = { width: 393, height: 852 },
): Promise<Buffer> {
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Executable doesn't exist|playwright install/i.test(msg)) {
      throw new Error(CHROMIUM_MISSING_MESSAGE);
    }
    throw e;
  }
  try {
    const page = await browser.newPage({ viewport });
    await page.goto(url, { waitUntil: "networkidle" });
    return await page.screenshot();
  } finally {
    await browser.close();
  }
}

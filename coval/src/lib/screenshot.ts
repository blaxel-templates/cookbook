import { SandboxInstance } from "@blaxel/core";
import puppeteer from "puppeteer";

export const SCREENSHOT_FILE_PATH = '/screenshot.b64';

/**
 * Capture a screenshot of a URL using headless Chrome.
 * Returns base64-encoded PNG string, or null on failure.
 */
export async function captureScreenshot(url: string): Promise<string | null> {
  let browser = null;
  try {
    console.log(`[Screenshot] Capturing ${url}`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    // Small extra delay for animations to settle
    await new Promise(resolve => setTimeout(resolve, 1000));
    const buffer = await page.screenshot({ type: 'png' });
    const base64 = Buffer.from(buffer).toString('base64');
    console.log(`[Screenshot] Captured (${Math.round(base64.length / 1024)}KB)`);
    return base64;
  } catch (error: any) {
    console.error(`[Screenshot] Failed:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Capture a screenshot and save it to a sandbox.
 * Returns the base64 string on success, null on failure.
 */
export async function captureAndSaveScreenshot(
  url: string,
  sandbox: SandboxInstance
): Promise<string | null> {
  const base64 = await captureScreenshot(url);
  if (!base64) return null;

  try {
    await sandbox.fs.write(SCREENSHOT_FILE_PATH, base64);
    console.log(`[Screenshot] Saved to sandbox`);
  } catch (err: any) {
    console.error(`[Screenshot] Failed to save:`, err.message);
  }

  return base64;
}

/**
 * Read an existing screenshot from a sandbox.
 * Returns the base64 string or null if none exists.
 */
export async function readScreenshot(sandbox: SandboxInstance): Promise<string | null> {
  try {
    const content = await sandbox.fs.read(SCREENSHOT_FILE_PATH);
    if (content && content.trim().length > 0) return content;
  } catch {
    // File doesn't exist
  }
  return null;
}

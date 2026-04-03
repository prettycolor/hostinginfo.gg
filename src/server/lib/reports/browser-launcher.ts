import { chromium, type Browser, type LaunchOptions } from "playwright";

const DEFAULT_CHROMIUM_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

function getPdfBrowserLaunchOptions(): LaunchOptions {
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() || undefined;

  return {
    headless: true,
    args: DEFAULT_CHROMIUM_ARGS,
    ...(executablePath ? { executablePath } : {}),
  };
}

export async function launchPdfBrowser(): Promise<Browser> {
  try {
    return await chromium.launch(getPdfBrowserLaunchOptions());
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown launch error";
    throw new Error(
      `Failed to launch Playwright Chromium for PDF generation. ` +
        `Install Chromium with "npx playwright install chromium" on this environment. ` +
        `Original error: ${errorMessage}`,
    );
  }
}

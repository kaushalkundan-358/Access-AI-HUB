// Replace this placeholder with the published Chrome Web Store URL before launch.
export const CHROME_WEB_STORE_LISTING_URL =
  "CHROME_WEB_STORE_URL_NOT_CONFIGURED";

export const SHOW_DELAY_MS = 2_000;

export function isPublishedListing(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === "chromewebstore.google.com" &&
      parsedUrl.pathname !== "/" &&
      !url.includes("NOT_CONFIGURED")
    );
  } catch {
    return false;
  }
}

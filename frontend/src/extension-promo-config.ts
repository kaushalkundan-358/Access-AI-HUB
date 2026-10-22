// Replace this placeholder with the published Chrome Web Store URL before launch.
export const CHROME_WEB_STORE_LISTING_URL =
  "CHROME_WEB_STORE_URL_NOT_CONFIGURED";
export const DISMISSAL_STORAGE_KEY = "accesshub.extension-promo.dismissed-at";
export const DISMISSAL_PERIOD_DAYS = 30;
export const SHOW_DELAY_MS = 2_000;

const DISMISSAL_PERIOD_MS = DISMISSAL_PERIOD_DAYS * 24 * 60 * 60 * 1_000;

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

export function wasPromoRecentlyDismissed(): boolean {
  try {
    const storedValue = window.localStorage.getItem(DISMISSAL_STORAGE_KEY);
    if (!storedValue) return false;

    const dismissedAt = Number(storedValue);
    return (
      Number.isFinite(dismissedAt) &&
      Date.now() - dismissedAt < DISMISSAL_PERIOD_MS
    );
  } catch (error) {
    console.warn("Could not read the extension promotion dismissal.", error);
    return false;
  }
}

export function rememberPromoDismissal(): void {
  try {
    window.localStorage.setItem(DISMISSAL_STORAGE_KEY, String(Date.now()));
  } catch (error) {
    console.warn("Could not save the extension promotion dismissal.", error);
  }
}

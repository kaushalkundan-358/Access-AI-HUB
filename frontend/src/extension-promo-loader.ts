import { SHOW_DELAY_MS } from "./extension-promo-config";

function schedulePromotion(): void {
  window.setTimeout(() => {
    void import("./ExtensionPromo");
  }, SHOW_DELAY_MS);
}

if (document.readyState === "complete") {
  schedulePromotion();
} else {
  window.addEventListener("load", schedulePromotion, { once: true });
}

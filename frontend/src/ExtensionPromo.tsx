import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import {
  CHROME_WEB_STORE_LISTING_URL,
  isPublishedListing,
} from "./extension-promo-config";
import "./extension-promo.css";

function ExtensionPromo() {
  const [isOpen, setIsOpen] = useState(true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const primaryLinkRef = useRef<HTMLAnchorElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const isListingPublished = isPublishedListing(CHROME_WEB_STORE_LISTING_URL);

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, []);

  function dismiss() {
    const activeElement = document.activeElement;
    const shouldRestoreFocus =
      activeElement === closeButtonRef.current ||
      activeElement === primaryLinkRef.current;
    setIsOpen(false);
    if (shouldRestoreFocus) {
      requestAnimationFrame(() => {
        if (returnFocusRef.current?.isConnected) {
          returnFocusRef.current.focus();
        }
      });
    }
  }

  if (!isOpen) return null;

  return (
    <aside
      aria-atomic="true"
      aria-labelledby="ah-extension-promo-title"
      aria-live="polite"
      className="ah-extension-promo"
      role="region"
    >
      <button
        aria-label="Close AccessHub AI extension promotion"
        className="ah-extension-promo-close"
        onClick={dismiss}
        ref={closeButtonRef}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      </button>

      <div className="ah-extension-promo-content">
        <img
          alt=""
          className="ah-extension-promo-icon"
          height="44"
          src="/icons/icon128.png"
          width="44"
        />
        <div className="ah-extension-promo-copy">
          <h2 id="ah-extension-promo-title">Try AccessHub AI Extension</h2>
          <p>Make browsing easier with more accessible reading.</p>
        </div>
      </div>

      {isListingPublished ? (
        <a
          className="ah-extension-promo-primary"
          href={CHROME_WEB_STORE_LISTING_URL}
          onClick={dismiss}
          ref={primaryLinkRef}
          rel="noopener noreferrer"
          target="_blank"
        >
          Add to Chrome
        </a>
      ) : (
        <button
          aria-describedby="ah-extension-promo-availability"
          className="ah-extension-promo-primary"
          disabled
          type="button"
        >
          Add to Chrome
        </button>
      )}

      {!isListingPublished && (
        <p
          className="ah-extension-promo-availability"
          id="ah-extension-promo-availability"
        >
          Coming soon — Chrome Web Store listing not published.
        </p>
      )}
    </aside>
  );
}

const promoRoot = document.getElementById("accesshub-extension-promo-root");
if (promoRoot) {
  const root: Root = createRoot(promoRoot);
  root.render(<ExtensionPromo />);
}

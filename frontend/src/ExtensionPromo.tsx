import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  CHROME_WEB_STORE_LISTING_URL,
  isPublishedListing,
  rememberPromoDismissal,
} from "./extension-promo-config";
import "./extension-promo.css";

function ExtensionPromo() {
  const [isOpen, setIsOpen] = useState(true);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const isListingPublished = isPublishedListing(CHROME_WEB_STORE_LISTING_URL);

  useEffect(() => {
    if (!isOpen) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const appRoot = document.getElementById("root");
    const previousInert = appRoot?.inert ?? false;
    const previousAriaHidden = appRoot?.getAttribute("aria-hidden") ?? null;
    const previousOverflow = document.body.style.overflow;

    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      if (appRoot) {
        appRoot.inert = previousInert;
        if (previousAriaHidden === null) {
          appRoot.removeAttribute("aria-hidden");
        } else {
          appRoot.setAttribute("aria-hidden", previousAriaHidden);
        }
      }
      document.body.style.overflow = previousOverflow;

      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  function dismiss() {
    rememberPromoDismissal();
    setIsOpen(false);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      dismiss();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute("hidden"));
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      event.preventDefault();
      dialogRef.current.focus();
    } else if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="ah-extension-promo-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <section
        aria-describedby="ah-extension-promo-description"
        aria-labelledby="ah-extension-promo-title"
        aria-modal="true"
        className="ah-extension-promo-dialog"
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="Close extension promotion"
          className="ah-extension-promo-close"
          onClick={dismiss}
          ref={closeButtonRef}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m18 6-12 12M6 6l12 12" />
          </svg>
        </button>

        <div className="ah-extension-promo-brand">
          <img
            alt=""
            className="ah-extension-promo-icon"
            height="56"
            src="/icons/icon128.png"
            width="56"
          />
          <span className="ah-extension-promo-brand-label">ACCESSHUB AI</span>
        </div>

        <p className="ah-extension-promo-eyebrow">A little more possibility</p>
        <h2 id="ah-extension-promo-title">Get the AccessHub AI Extension</h2>
        <p id="ah-extension-promo-description" className="ah-extension-promo-copy">
          Make everyday browsing a little easier with thoughtful tools for clearer,
          more comfortable reading and a more accessible web.
        </p>

        {isListingPublished ? (
          <a
            className="ah-extension-promo-primary"
            href={CHROME_WEB_STORE_LISTING_URL}
            onClick={dismiss}
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
            </svg>
            Add to Chrome
          </a>
        ) : (
          <button
            aria-describedby="ah-extension-promo-availability"
            className="ah-extension-promo-primary"
            disabled
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
            </svg>
            Add to Chrome
          </button>
        )}

        <p
          className="ah-extension-promo-availability"
          id="ah-extension-promo-availability"
          role="status"
        >
          {isListingPublished
            ? "Opens the Chrome Web Store in a new tab. Installation is always your choice."
            : "Coming soon — the Chrome Web Store listing is not published yet."}
        </p>

        <button
          className="ah-extension-promo-later"
          onClick={dismiss}
          type="button"
        >
          Maybe later
        </button>
      </section>
    </div>
  );
}

const promoRoot = document.getElementById("accesshub-extension-promo-root");
if (promoRoot) {
  createRoot(promoRoot).render(<ExtensionPromo />);
}

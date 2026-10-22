import type {
  AccessibilitySettings,
  PageScan,
} from "./shared/types";

const marker = globalThis as typeof globalThis & {
  __accessHubContentReady?: boolean;
};

if (!marker.__accessHubContentReady) {
  marker.__accessHubContentReady = true;

  const styleId = "accesshub-ai-accessibility-styles";
  const focusClass = "accesshub-ai-reading-focus";
  let focusTarget: HTMLElement | null = null;
  let targetHadFocusClass = false;

  function getStyleElement(): HTMLStyleElement {
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      (document.head ?? document.documentElement).append(style);
    }
    return style;
  }

  function applySettings(settings: AccessibilitySettings): void {
    const rules: string[] = [];
    const scale = Math.min(1.8, Math.max(0.8, settings.textScale));

    if (scale !== 1) {
      rules.push(`html { zoom: ${scale} !important; }`);
    }

    if (settings.highContrast) {
      rules.push(`
        html, body { background: #fff !important; color: #111 !important; }
        body :not(img):not(video):not(canvas):not(svg):not(path) {
          color: #111 !important;
          border-color: #333 !important;
          background-color: transparent !important;
        }
        a, a :not(img):not(svg) { color: #003b8e !important; }
        button, input, select, textarea {
          background: #fff !important;
          color: #111 !important;
          border: 2px solid #111 !important;
        }
        :focus-visible { outline: 3px solid #e65c00 !important; outline-offset: 2px !important; }
      `);
    }

    if (settings.readableFont) {
      rules.push(`
        html, body, body *:not(svg):not(svg *) {
          font-family: "Atkinson Hyperlegible", Arial, Helvetica, sans-serif !important;
          letter-spacing: 0.025em !important;
          word-spacing: 0.08em !important;
        }
      `);
    }

    if (settings.readingFocus) {
      rules.push(`
        .${focusClass} {
          position: relative !important;
          z-index: 2147483645 !important;
          line-height: 1.75 !important;
        }
        .${focusClass}:not(body) {
          max-width: 74rem !important;
          margin-inline: auto !important;
          padding: 1.25rem !important;
          background: #fffefa !important;
          color: #20251c !important;
          box-shadow: 0 0 0 100vmax rgba(18, 24, 15, 0.68) !important;
        }
        .${focusClass} * { line-height: 1.75 !important; }
      `);
    }

    if (focusTarget && !targetHadFocusClass) {
      focusTarget.classList.remove(focusClass);
    }
    focusTarget = null;
    targetHadFocusClass = false;
    if (settings.readingFocus) {
      focusTarget =
        document.querySelector<HTMLElement>("main, article, [role='main']") ??
        document.body;
      targetHadFocusClass = focusTarget.classList.contains(focusClass);
      focusTarget.classList.add(focusClass);
    }
    const style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!rules.length && style) {
      style.remove();
    } else if (rules.length) {
      getStyleElement().textContent = rules.join("\n");
    }
  }

  function scanPage(): PageScan {
    const images = Array.from(document.images);
    const buttons = Array.from(document.querySelectorAll("button"));
    const fields = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      ),
    );

    return {
      totalImages: images.length,
      missingAlt: images.filter((image) => !image.hasAttribute("alt")).length,
      unnamedButtons: buttons.filter((button) => {
        const labelledBy = button.getAttribute("aria-labelledby");
        const referencedText = labelledBy
          ?.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .join("");
        return ![
          button.innerText,
          button.getAttribute("aria-label"),
          button.getAttribute("title"),
          referencedText,
        ].some((value) => value?.trim());
      }).length,
      unlabeledInputs: fields.filter((field) => {
        if (
          field instanceof HTMLInputElement &&
          ["hidden", "submit", "button", "reset"].includes(field.type)
        ) {
          return false;
        }
        return (
          !field.labels?.length &&
          !field.getAttribute("aria-label") &&
          !field.getAttribute("aria-labelledby")
        );
      }).length,
    };
  }

  function selectedText(): string {
    return window.getSelection()?.toString().trim() ?? "";
  }

  function speakPage(): string {
    window.speechSynthesis.cancel();
    const selection = selectedText();
    const main =
      document.querySelector<HTMLElement>("main, article, [role='main']") ??
      document.body;
    const text = (selection || main.innerText).trim().slice(0, 10000);
    if (!text) {
      throw new Error("There is no readable text on this page.");
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
    return selection ? "Reading selected text." : "Reading the main page text.";
  }

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    try {
      if (!message || typeof message !== "object") {
        throw new Error("Invalid extension command.");
      }

      const command = message as {
        type?: string;
        settings?: AccessibilitySettings;
        action?: string;
      };

      switch (command.type) {
        case "APPLY_SETTINGS":
          if (!command.settings) throw new Error("Accessibility settings are missing.");
          applySettings(command.settings);
          sendResponse({ ok: true });
          break;
        case "GET_SELECTION":
          sendResponse({ ok: true, data: selectedText() });
          break;
        case "SCAN_PAGE":
          sendResponse({ ok: true, data: scanPage() });
          break;
        case "SPEAK_PAGE":
          sendResponse({ ok: true, data: speakPage() });
          break;
        default:
          throw new Error("Unsupported page command.");
      }
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "The page command failed.",
      });
    }
    return false;
  });
}

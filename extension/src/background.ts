import type {
  AccessibilitySettings,
  AiTask,
  ExtensionMessage,
  ExtensionResponse,
  UserProfile,
} from "./shared/types";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: { message?: string };
}

interface AuthData {
  accessToken: string;
  user: { id: string; email: string };
}

const MAX_TEXT_CHARACTERS = 20000;

function normalizeApiBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid API URL, such as https://your-site.example.");
  }

  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("Use an HTTPS API URL. HTTP is allowed only for localhost development.");
  }
  return url.toString().replace(/\/+$/, "");
}

function permissionPattern(baseUrl: string): string {
  const url = new URL(baseUrl);
  return `${url.protocol}//${url.hostname}/*`;
}

async function requireApiPermission(baseUrl: string): Promise<void> {
  const pattern = permissionPattern(baseUrl);
  const granted = await chrome.permissions.contains({ origins: [pattern] });
  if (!granted) {
    throw new Error("Allow AccessHub AI to connect to this API host, then try again.");
  }
}

async function apiRequest<T>(
  baseUrlValue: string,
  endpoint: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const baseUrl = normalizeApiBaseUrl(baseUrlValue);
  await requireApiPermission(baseUrl);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api${endpoint}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error("Could not reach the API. Check the URL and your network connection.");
  }

  let payload: ApiEnvelope<T>;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`The API returned an unreadable response (${response.status}).`);
  }

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.error?.message ??
        payload.message ??
        `The API request failed (${response.status}).`,
    );
  }
  if (payload.data === undefined) {
    throw new Error("The API response did not contain the expected data.");
  }
  return payload.data;
}

async function getToken(): Promise<string> {
  const { accessToken } = await chrome.storage.local.get("accessToken");
  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error("Connect your AccessHub AI account first.");
  }
  return accessToken;
}

async function sendPageMessage<T>(message: object): Promise<T> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:\/\//i.test(tab.url)) {
    throw new Error("This feature works on regular websites, not browser-internal pages.");
  }

  let response:
    | { ok: true; data?: T }
    | { ok: false; error?: string };
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    response = (await chrome.tabs.sendMessage(tab.id, message)) as
      | { ok: true; data?: T }
      | { ok: false; error?: string };
  } catch {
    throw new Error(
      "Chrome could not access this page. Try a regular webpage and reload it before using AccessHub AI.",
    );
  }
  if (!response?.ok) {
    throw new Error(response?.error || "The webpage did not accept the command.");
  }
  return response.data as T;
}

async function runAiTask(
  task: AiTask,
  apiBaseUrl: string,
  topic?: string,
): Promise<{ text: string }> {
  const selected = await sendPageMessage<string>({ type: "GET_SELECTION" });
  const text = selected.trim();
  if (!text) {
    throw new Error("Select text on the webpage first. Only your selection is sent for AI processing.");
  }
  if (text.length > MAX_TEXT_CHARACTERS) {
    throw new Error("The selected text exceeds the API limit of 20,000 characters.");
  }

  const token = await getToken();
  const translation = task.startsWith("translate-");
  const endpoint = translation
    ? "/ai/translate"
    : `/ai/${task}`;
  const body = translation
    ? { text, targetLanguage: task === "translate-hi" ? "hi" : "en" }
    : task === "explain"
      ? { text, ...(topic?.trim() ? { topic: topic.trim().slice(0, 200) } : {}) }
      : { text };

  const result = await apiRequest<{ text: string }>(apiBaseUrl, endpoint, {
    method: "POST",
    body,
    token,
  });
  return { text: result.text };
}

async function handleMessage(
  message: ExtensionMessage,
): Promise<ExtensionResponse<unknown>> {
  switch (message.type) {
    case "APPLY_SETTINGS": {
      await sendPageMessage<void>({ type: "APPLY_SETTINGS", settings: message.settings });
      return { ok: true, data: undefined };
    }
    case "PAGE_ACTION": {
      const result =
        message.action === "scan"
          ? await sendPageMessage({ type: "SCAN_PAGE" })
          : await sendPageMessage({ type: "SPEAK_PAGE" });
      return { ok: true, data: result };
    }
    case "AI_TASK": {
      const result = await runAiTask(message.task, message.apiBaseUrl, message.topic);
      return { ok: true, data: result };
    }
    case "AUTH": {
      const apiBaseUrl = normalizeApiBaseUrl(message.apiBaseUrl);
      const endpoint = message.mode === "register" ? "/users/register" : "/users/login";
      const result = await apiRequest<AuthData>(apiBaseUrl, endpoint, {
        method: "POST",
        body: { email: message.email, password: message.password },
      });
      if (!result.accessToken || !result.user?.email) {
        throw new Error("The API did not return a valid sign-in token.");
      }
      await chrome.storage.local.set({
        apiBaseUrl,
        accessToken: result.accessToken,
        userEmail: result.user.email,
      });
      return { ok: true, data: { email: result.user.email } };
    }
    case "LOGOUT":
      await chrome.storage.local.remove(["accessToken", "userEmail"]);
      return { ok: true, data: undefined };
    case "PROFILE_LIST": {
      const profiles = await apiRequest<UserProfile[]>(
        message.apiBaseUrl,
        "/profiles",
        { token: await getToken() },
      );
      return { ok: true, data: profiles };
    }
    case "PROFILE_SAVE": {
      const scale = Math.min(1.8, Math.max(0.8, message.settings.textScale));
      const profile = await apiRequest<UserProfile>(
        message.apiBaseUrl,
        "/profiles",
        {
          method: "POST",
          token: await getToken(),
          body: {
            name: message.name,
            fontSize:
              scale < 0.95
                ? "small"
                : scale < 1.1
                  ? "medium"
                  : scale < 1.3
                    ? "large"
                    : "extra-large",
            contrastMode: message.settings.highContrast ? "high" : "normal",
            preferredLanguage: "en",
            readingPreferences: {
              textScale: scale,
              highContrast: message.settings.highContrast,
              readableFont: message.settings.readableFont,
              readingFocus: message.settings.readingFocus,
            },
          },
        },
      );
      return { ok: true, data: profile };
    }
    case "OPEN_WEBSITE": {
      const url = new URL(message.url);
      if (
        url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
        )
      ) {
        throw new Error("The website URL must use HTTPS.");
      }
      await chrome.tabs.create({ url: url.toString() });
      return { ok: true, data: undefined };
    }
  }
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse<unknown>) => void,
  ) => {
    void handleMessage(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "The extension request failed.",
        });
      });
    return true;
  },
);

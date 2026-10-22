export interface AccessibilitySettings {
  textScale: number;
  highContrast: boolean;
  readableFont: boolean;
  readingFocus: boolean;
}

export type AuthMode = "login" | "register";
export type AiTask = "simplify" | "summarize" | "explain" | "translate-en" | "translate-hi";

export interface UserProfile {
  id: string;
  name: string;
  fontSize: "small" | "medium" | "large" | "extra-large";
  contrastMode: "normal" | "high" | "dark";
  preferredLanguage: "en" | "hi";
  readingPreferences: Record<string, unknown>;
}

export type ExtensionMessage =
  | { type: "APPLY_SETTINGS"; settings: AccessibilitySettings }
  | { type: "PAGE_ACTION"; action: "scan" | "speak" }
  | { type: "AI_TASK"; task: AiTask; apiBaseUrl: string; topic?: string }
  | {
      type: "AUTH";
      mode: AuthMode;
      apiBaseUrl: string;
      email: string;
      password: string;
    }
  | { type: "LOGOUT" }
  | { type: "PROFILE_LIST"; apiBaseUrl: string }
  | {
      type: "PROFILE_SAVE";
      apiBaseUrl: string;
      name: string;
      settings: AccessibilitySettings;
    }
  | { type: "OPEN_WEBSITE"; url: string };

export type ExtensionResponse<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface PageScan {
  totalImages: number;
  missingAlt: number;
  unnamedButtons: number;
  unlabeledInputs: number;
}

export interface AiResult {
  task: string;
  text: string;
}

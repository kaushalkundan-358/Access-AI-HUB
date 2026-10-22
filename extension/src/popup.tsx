import { useEffect, useState } from "react";
import {
  Accessibility,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Minus,
  Plus,
  ScanSearch,
  Settings2,
  Volume2,
  WandSparkles,
  X,
} from "lucide-react";
import { createRoot } from "react-dom/client";
import type {
  AccessibilitySettings,
  AiResult,
  AiTask,
  AuthMode,
  ExtensionMessage,
  ExtensionResponse,
  PageScan,
  UserProfile,
} from "./shared/types";
import "./styles.css";

const defaultSettings: AccessibilitySettings = {
  textScale: 1,
  highContrast: false,
  readableFont: false,
  readingFocus: false,
};

const defaultApiUrl = "http://localhost:4000";

async function send<T>(message: ExtensionMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(
    message,
  )) as ExtensionResponse<T>;
  if (!response?.ok) {
    throw new Error(response?.error || "The extension request failed.");
  }
  return response.data;
}

async function requestApiPermission(value: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid API URL before connecting.");
  }
  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("Use HTTPS for a remote API. HTTP is supported only on localhost.");
  }

  const pattern = `${url.protocol}//${url.hostname}/*`;
  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) {
    throw new Error("API access was not granted. Allow the host to use account features.");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function settingFromProfile(profile: UserProfile): AccessibilitySettings {
  const savedScale = profile.readingPreferences.textScale;
  const textScale =
    typeof savedScale === "number"
      ? savedScale
      : profile.fontSize === "small"
        ? 0.9
        : profile.fontSize === "large"
          ? 1.2
          : profile.fontSize === "extra-large"
            ? 1.4
            : 1;
  return {
    textScale,
    highContrast:
      typeof profile.readingPreferences.highContrast === "boolean"
        ? profile.readingPreferences.highContrast
        : profile.contrastMode === "high",
    readableFont: profile.readingPreferences.readableFont === true,
    readingFocus: profile.readingPreferences.readingFocus === true,
  };
}

function App() {
  const [settings, setSettings] = useState(defaultSettings);
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiUrl);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [topic, setTopic] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [profileName, setProfileName] = useState("");
  const [scan, setScan] = useState<PageScan | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");
  const [connectionOpen, setConnectionOpen] = useState(false);

  useEffect(() => {
    void Promise.all([
      chrome.storage.sync.get("accessibilitySettings"),
      chrome.storage.local.get(["apiBaseUrl", "websiteUrl", "userEmail", "accessToken"]),
    ])
      .then(([syncValues, localValues]) => {
        const savedSettings = syncValues.accessibilitySettings as
          | AccessibilitySettings
          | undefined;
        if (savedSettings) {
          setSettings({ ...defaultSettings, ...savedSettings });
        }
        if (typeof localValues.apiBaseUrl === "string") {
          setApiBaseUrl(localValues.apiBaseUrl);
        }
        if (typeof localValues.websiteUrl === "string") {
          setWebsiteUrl(localValues.websiteUrl);
        }
        if (typeof localValues.userEmail === "string" && localValues.accessToken) {
          setUserEmail(localValues.userEmail);
        }
      })
      .catch((reason: unknown) => setError(errorMessage(reason)));
  }, []);

  async function applySettings(nextSettings: AccessibilitySettings): Promise<void> {
    setSettings(nextSettings);
    setScan(null);
    setAiResult(null);
    setError("");
    await chrome.storage.sync.set({ accessibilitySettings: nextSettings });
    try {
      await send<void>({ type: "APPLY_SETTINGS", settings: nextSettings });
      setStatus("Accessibility settings applied to this page.");
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function changeScale(delta: number): Promise<void> {
    const nextScale = Math.min(1.8, Math.max(0.8, Number((settings.textScale + delta).toFixed(1))));
    await applySettings({ ...settings, textScale: nextScale });
  }

  async function toggleSetting(key: "highContrast" | "readableFont" | "readingFocus") {
    await applySettings({ ...settings, [key]: !settings[key] });
  }

  async function resetSettings(): Promise<void> {
    await applySettings(defaultSettings);
  }

  async function runPageAction(action: "scan" | "speak"): Promise<void> {
    setError("");
    setStatus("");
    setBusy(action);
    try {
      if (action === "scan") {
        const result = await send<PageScan>({ type: "PAGE_ACTION", action });
        setScan(result);
        setStatus("Quick accessibility scan complete.");
      } else {
        const result = await send<string>({ type: "PAGE_ACTION", action });
        setStatus(result);
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy("");
    }
  }

  async function connect(mode: AuthMode): Promise<void> {
    setError("");
    setStatus("");
    setBusy("auth");
    try {
      await requestApiPermission(apiBaseUrl);
      const result = await send<{ email: string }>({
        type: "AUTH",
        mode,
        apiBaseUrl,
        email: email.trim(),
        password,
      });
      setUserEmail(result.email);
      setPassword("");
      await chrome.storage.local.set({ apiBaseUrl, websiteUrl });
      setStatus(mode === "register" ? "Account created and connected." : "Connected to AccessHub AI.");
      await loadProfiles(false);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy("");
    }
  }

  async function loadProfiles(requestPermission = true): Promise<void> {
    if (requestPermission) await requestApiPermission(apiBaseUrl);
    const result = await send<UserProfile[]>({
      type: "PROFILE_LIST",
      apiBaseUrl,
    });
    setProfiles(result);
  }

  async function saveProfile(): Promise<void> {
    if (!profileName.trim()) {
      setError("Enter a name for this accessibility profile.");
      return;
    }
    setError("");
    setStatus("");
    setBusy("profile");
    try {
      await requestApiPermission(apiBaseUrl);
      await send<UserProfile>({
        type: "PROFILE_SAVE",
        apiBaseUrl,
        name: profileName.trim(),
        settings,
      });
      setProfileName("");
      await loadProfiles();
      setStatus("Accessibility profile saved to your account.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy("");
    }
  }

  async function applyProfile(profileId: string): Promise<void> {
    const profile = profiles.find((entry) => entry.id === profileId);
    if (profile) await applySettings(settingFromProfile(profile));
  }

  async function runAiTask(task: AiTask): Promise<void> {
    setError("");
    setStatus("");
    setAiResult(null);
    setBusy(task);
    try {
      await requestApiPermission(apiBaseUrl);
      const result = await send<{ text: string }>({
        type: "AI_TASK",
        task,
        apiBaseUrl,
        ...(task === "explain" && topic.trim() ? { topic: topic.trim() } : {}),
      });
      setAiResult({ task, text: result.text });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy("");
    }
  }

  async function openWebsite(): Promise<void> {
    let target = websiteUrl.trim();
    if (!target && apiBaseUrl.trim()) {
      try {
        const apiUrl = new URL(apiBaseUrl.trim());
        if (apiUrl.protocol === "https:") target = apiUrl.origin;
      } catch {
        target = "";
      }
    }
    if (!target) {
      setError("Set your AccessHub AI website URL in Connection & account.");
      return;
    }
    setError("");
    try {
      const url = new URL(target);
      await send<void>({ type: "OPEN_WEBSITE", url: url.toString() });
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function disconnect(): Promise<void> {
    try {
      await send<void>({ type: "LOGOUT" });
      setUserEmail("");
      setProfiles([]);
      setStatus("Signed out.");
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  return (
    <main className="popup">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          <Accessibility size={21} strokeWidth={2.2} />
        </div>
        <div className="brand-copy">
          <strong>AccessHub AI</strong>
          <span>A little more possibility.</span>
        </div>
        <button className="icon-button" onClick={() => setConnectionOpen(!connectionOpen)} aria-label="Connection and account settings">
          <Settings2 size={18} />
        </button>
      </header>

      <section className="page-intro" aria-label="Current page">
        <div>
          <span className="eyebrow">ACCESSIBILITY TOOLS</span>
          <p>Make this page work better for you.</p>
        </div>
        <button className="site-link" onClick={() => void openWebsite()} title="Open your AccessHub AI website">
          <ExternalLink size={15} />
        </button>
      </section>

      {error && (
        <div className="notice error-notice" role="alert">
          <X size={15} />
          <span>{error}</span>
        </div>
      )}
      {status && !error && (
        <div className="notice success-notice" role="status">
          <Check size={15} />
          <span>{status}</span>
        </div>
      )}

      <section className="tool-card" aria-label="Page adjustments">
        <div className="card-heading">
          <div className="card-icon"><Eye size={17} /></div>
          <div>
            <h1>Page adjustments</h1>
            <p>Saved preferences apply on this tab.</p>
          </div>
        </div>

        <div className="text-size-control">
          <div className="size-copy">
            <span className="control-title">Text size</span>
            <span className="control-hint">Adjust page scale</span>
          </div>
          <div className="stepper">
            <button onClick={() => void changeScale(-0.1)} disabled={settings.textScale <= 0.8} aria-label="Decrease text size"><Minus size={15} /></button>
            <output aria-live="polite">{Math.round(settings.textScale * 100)}%</output>
            <button onClick={() => void changeScale(0.1)} disabled={settings.textScale >= 1.8} aria-label="Increase text size"><Plus size={15} /></button>
          </div>
        </div>

        <ToggleRow
          label="High contrast"
          hint="Stronger text and focus outlines"
          checked={settings.highContrast}
          onChange={() => void toggleSetting("highContrast")}
        />
        <ToggleRow
          label="Readable font"
          hint="Clear, familiar sans-serif type"
          checked={settings.readableFont}
          onChange={() => void toggleSetting("readableFont")}
        />
        <ToggleRow
          label="Reading focus"
          hint="Bring the main reading area forward"
          checked={settings.readingFocus}
          onChange={() => void toggleSetting("readingFocus")}
        />

        <button className="reset-button" onClick={() => void resetSettings()}>
          Reset page adjustments
        </button>
      </section>

      <section className="quick-actions" aria-label="Reading tools">
        <button className="action-button" onClick={() => void runPageAction("speak")} disabled={Boolean(busy)}>
          <Volume2 size={17} />
          <span>{busy === "speak" ? "Starting…" : "Read aloud"}</span>
        </button>
        <button className="action-button" onClick={() => void runPageAction("scan")} disabled={Boolean(busy)}>
          <ScanSearch size={17} />
          <span>{busy === "scan" ? "Scanning…" : "Quick scan"}</span>
        </button>
      </section>

      {scan && (
        <section className="result-card" aria-live="polite">
          <h2>Quick accessibility scan</h2>
          <p>{scan.totalImages} image{scan.totalImages === 1 ? "" : "s"} checked</p>
          <ul>
            <li>{scan.missingAlt} image{scan.missingAlt === 1 ? "" : "s"} missing alt text</li>
            <li>{scan.unnamedButtons} button{scan.unnamedButtons === 1 ? "" : "s"} without a clear name</li>
            <li>{scan.unlabeledInputs} form field{scan.unlabeledInputs === 1 ? "" : "s"} without a label</li>
          </ul>
          <small>These quick checks may not catch every accessibility issue.</small>
        </section>
      )}

      <section className="ai-card">
        <div className="ai-heading">
          <div className="card-icon"><WandSparkles size={16} /></div>
          <div>
            <h2>Work with selected text</h2>
            <p>Choose text on the page, then start an action.</p>
          </div>
        </div>
        <div className="ai-actions">
          <button onClick={() => void runAiTask("simplify")} disabled={!userEmail || Boolean(busy)}>
            {busy === "simplify" ? "Working…" : "Simplify"}
          </button>
          <button onClick={() => void runAiTask("summarize")} disabled={!userEmail || Boolean(busy)}>
            {busy === "summarize" ? "Working…" : "Summarize"}
          </button>
          <button onClick={() => void runAiTask("explain")} disabled={!userEmail || Boolean(busy)}>
            {busy === "explain" ? "Working…" : "Explain"}
          </button>
          <button onClick={() => void runAiTask("translate-hi")} disabled={!userEmail || Boolean(busy)}>
            {busy === "translate-hi" ? "Working…" : "Translate to Hindi"}
          </button>
          <button onClick={() => void runAiTask("translate-en")} disabled={!userEmail || Boolean(busy)}>
            {busy === "translate-en" ? "Working…" : "Translate to English"}
          </button>
        </div>
        <label className="topic-label">
          Optional topic for Explain
          <input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={200} placeholder="For example: a technical term" />
        </label>
        {!userEmail && <p className="muted-note">Connect your account to use the existing AI services.</p>}
        {aiResult && (
          <div className="ai-result" aria-live="polite">
            <div className="result-title"><BookOpen size={14} /> Result</div>
            <p>{aiResult.text}</p>
          </div>
        )}
      </section>

      {userEmail && (
        <section className="profiles-card">
          <div className="card-heading compact-heading">
            <div className="card-icon"><BookOpen size={16} /></div>
            <div>
              <h2>Saved profiles</h2>
              <p>Use your website account profiles.</p>
            </div>
          </div>
          <div className="profile-controls">
            <label className="visually-hidden" htmlFor="profile-select">Apply a saved profile</label>
            <select id="profile-select" defaultValue="" onChange={(event) => void applyProfile(event.target.value)}>
              <option value="" disabled>Choose a profile…</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
            <button className="small-button" onClick={() => void loadProfiles()} disabled={Boolean(busy)} aria-label="Refresh profiles">
              <ChevronDown size={15} />
            </button>
          </div>
          <div className="save-profile">
            <input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} placeholder="New profile name" aria-label="New profile name" />
            <button onClick={() => void saveProfile()} disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save"}</button>
          </div>
        </section>
      )}

      <section className={`connection ${connectionOpen ? "connection-open" : ""}`}>
        <button className="connection-toggle" onClick={() => setConnectionOpen(!connectionOpen)} aria-expanded={connectionOpen}>
          <span>{userEmail ? `Connected as ${userEmail}` : "Connection & account"}</span>
          <ChevronDown size={16} />
        </button>
        {connectionOpen && (
          <div className="connection-body">
            <label>
              API base URL
              <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder="https://your-deployment.example" spellCheck={false} />
            </label>
            <label>
              AccessHub AI website URL
              <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://your-site.example" spellCheck={false} />
            </label>
            <button className="save-connection" onClick={() => {
              void chrome.storage.local.set({ apiBaseUrl: apiBaseUrl.trim(), websiteUrl: websiteUrl.trim() })
                .then(() => setStatus("Connection settings saved."))
                .catch((reason: unknown) => setError(errorMessage(reason)));
            }}>Save connection settings</button>
            {!userEmail ? (
              <>
                <label>
                  Email
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
                </label>
                <label>
                  Password
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === "login" ? "current-password" : "new-password"} />
                </label>
                <div className="auth-actions">
                  <button onClick={() => void connect(authMode)} disabled={busy === "auth" || !email || !password}>
                    {busy === "auth" ? "Connecting…" : authMode === "login" ? "Sign in" : "Create account"}
                  </button>
                  <button className="text-button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                    {authMode === "login" ? "Create account" : "Sign in instead"}
                  </button>
                </div>
                {authMode === "register" && <small className="muted-note">The existing service requires a password of at least 10 characters.</small>}
              </>
            ) : (
              <div className="account-row">
                <span><Check size={14} /> Signed in</span>
                <button className="text-button" onClick={() => void disconnect()}>Sign out</button>
              </div>
            )}
            <p className="privacy-note">Your password is sent only to your configured AccessHub AI API and is not saved by the extension. AI actions send only text you select and explicitly submit.</p>
          </div>
        )}
      </section>

      <footer>ACCESSIBILITY, YOUR WAY</footer>
    </main>
  );
}

interface ToggleRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleRow({ label, hint, checked, onChange }: ToggleRowProps) {
  return (
    <div className="toggle-row">
      <div>
        <span className="control-title">{label}</span>
        <span className="control-hint">{hint}</span>
      </div>
      <button
        className={`switch ${checked ? "switch-on" : ""}`}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

import { createClient, type User } from "@supabase/supabase-js";
import { createRoot, type Root } from "react-dom/client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import "./supabase-auth.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null;

let authRoot: Root | null = null;
let setDialogOpen: ((open: boolean) => void) | null = null;

type AuthMode = "sign-in" | "sign-up";

function SupabaseAuth() {
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setDialogOpen = setIsOpen;
    return () => {
      setDialogOpen = null;
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const appRoot = document.getElementById("root");
    const wasInert = appRoot?.inert ?? false;
    const previousAriaHidden = appRoot?.getAttribute("aria-hidden") ?? null;
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute("aria-hidden", "true");
    }

    const frame = window.requestAnimationFrame(() => {
      if (user) closeRef.current?.focus();
      else emailRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (appRoot) {
        appRoot.inert = wasInert;
        if (previousAriaHidden === null) {
          appRoot.removeAttribute("aria-hidden");
        } else {
          appRoot.setAttribute("aria-hidden", previousAriaHidden);
        }
      }
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, user]);

  function closeDialog() {
    setIsOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    if (!supabase) {
      setErrorMessage("Sign-in is not configured. Set the Supabase URL and publishable key.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (!data.session) {
          setStatusMessage(
            "Check your email for a verification link to finish creating your account.",
          );
        } else {
          setStatusMessage("Your account is ready. You are signed in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setStatusMessage("You are signed in.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    setErrorMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) setErrorMessage(error.message);
    else setStatusMessage("You have signed out.");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled])',
      ),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="ah-auth-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <section
        aria-labelledby="ah-auth-title"
        aria-modal="true"
        className="ah-auth-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="Close sign-in dialog"
          className="ah-auth-close"
          onClick={closeDialog}
          ref={closeRef}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m18 6-12 12M6 6l12 12" />
          </svg>
        </button>

        <p className="ah-auth-eyebrow">AccessHub AI · Your space, your way</p>
        <h2 id="ah-auth-title">
          {user
            ? "Welcome to your space."
            : mode === "sign-up"
              ? "Make room for possibility."
              : "Welcome back."}
        </h2>

        {user ? (
          <div className="ah-auth-signed-in">
            <p>
              Signed in as <strong>{user.email}</strong>
            </p>
            <button
              className="ah-auth-submit"
              onClick={() => void handleSignOut()}
              type="button"
            >
              Sign out
            </button>
          </div>
        ) : (
          <>
            <p className="ah-auth-intro">
              {mode === "sign-up"
                ? "Create an account to keep your accessibility workspace with you."
                : "Sign in to continue to your AccessHub AI account."}
            </p>
            <form className="ah-auth-form" onSubmit={handleSubmit}>
              {mode === "sign-up" && (
                <label>
                  Your name
                  <input
                    autoComplete="name"
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  ref={emailRef}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label>
                Password
                <input
                  autoComplete={
                    mode === "sign-up" ? "new-password" : "current-password"
                  }
                  minLength={mode === "sign-up" ? 10 : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
              {errorMessage && (
                <p className="ah-auth-error" role="alert">
                  {errorMessage}
                </p>
              )}
              {statusMessage && (
                <p className="ah-auth-status" role="status">
                  {statusMessage}
                </p>
              )}
              <button
                className="ah-auth-submit"
                disabled={isSubmitting || !supabase}
                type="submit"
              >
                {isSubmitting
                  ? "Please wait..."
                  : mode === "sign-up"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>
            <p className="ah-auth-switch">
              {mode === "sign-up"
                ? "Already have an account?"
                : "New to AccessHub AI?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "sign-up" ? "sign-in" : "sign-up");
                  setErrorMessage("");
                  setStatusMessage("");
                }}
                type="button"
              >
                {mode === "sign-up" ? "Sign in" : "Create an account"}
              </button>
            </p>
            {!supabase && (
              <p className="ah-auth-error" role="alert">
                Supabase configuration is missing. Add the frontend URL and
                publishable key to its environment.
              </p>
            )}
          </>
        )}

        {user && errorMessage && (
          <p className="ah-auth-error" role="alert">
            {errorMessage}
          </p>
        )}
        {user && statusMessage && (
          <p className="ah-auth-status" role="status">
            {statusMessage}
          </p>
        )}
      </section>
    </div>
  );
}

export function openSupabaseAuth(): void {
  const mount = document.getElementById("accesshub-auth-root");
  if (!mount) {
    console.error("The sign-in dialog mount point is missing.");
    return;
  }
  if (!authRoot) {
    authRoot = createRoot(mount);
    authRoot.render(<SupabaseAuth />);
  } else {
    setDialogOpen?.(true);
  }
}

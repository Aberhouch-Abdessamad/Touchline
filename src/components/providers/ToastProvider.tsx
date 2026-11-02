"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DICT } from "@/lib/i18n/dict";
import type { Locale } from "@/lib/i18n/core";

type ToastTone = "success" | "error" | "info";

/** Same store as PreferencesProvider; kept literal to avoid a provider cycle. */
const PREFS_STORAGE_KEY = "touchline.preferences.v1";

function subscribeToStorage(notify: () => void) {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
}

/**
 * The stored UI language, read straight from local storage. ToastProvider sits
 * *outside* PreferencesProvider (the reverse dependency keeps it circular-
 * free), so it cannot use the context. Snapshot revalidates on every render —
 * toasts only exist after user interaction — and the `storage` event covers
 * cross-tab switches.
 */
function storedLang(): Locale {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    return raw && JSON.parse(raw)?.lang === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

function serverLang(): Locale {
  return "en";
}

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  push: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const lang = useSyncExternalStore(subscribeToStorage, storedLang, serverLang);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = "success") => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-stack"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className={cn("toast", `toast--${toast.tone}`)}>
            <span className="toast__icon" aria-hidden="true">
              {toast.tone === "success" ? (
                <CheckCircle2 size={18} />
              ) : toast.tone === "error" ? (
                <XCircle size={18} />
              ) : (
                <Info size={18} />
              )}
            </span>
            <p className="toast__message">{toast.message}</p>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(toast.id)}
              aria-label={DICT[lang].common.dismissNotification}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}

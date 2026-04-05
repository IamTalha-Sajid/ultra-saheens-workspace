"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = { id: number; message: string; variant: ToastVariant };

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type PromptTextOptions = {
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type FeedbackContextValue = {
  toast: (opts: { message: string; variant?: ToastVariant }) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  promptText: (opts: PromptTextOptions) => Promise<string | null>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return ctx;
}

type DialogState =
  | ({
    kind: "confirm";
    resolve: (v: boolean) => void;
  } & ConfirmOptions)
  | ({
    kind: "prompt";
    resolve: (v: string | null) => void;
  } & PromptTextOptions);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const toastIdRef = useRef(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descId = useId();

  const toast = useCallback(
    ({ message, variant = "info" }: { message: string; variant?: ToastVariant }) => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ kind: "confirm", ...opts, resolve });
    });
  }, []);

  const promptText = useCallback((opts: PromptTextOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptDraft(opts.defaultValue ?? "");
      setDialog({ kind: "prompt", ...opts, resolve });
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    setDialog((prev) => {
      if (prev?.kind === "confirm") prev.resolve(result);
      return null;
    });
  }, []);

  const closePrompt = useCallback((result: string | null) => {
    setDialog((prev) => {
      if (prev?.kind === "prompt") prev.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dialog.kind === "confirm") closeConfirm(false);
        else closePrompt(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, closeConfirm, closePrompt]);

  useEffect(() => {
    if (!dialog) return;
    const t = window.setTimeout(() => {
      if (dialog.kind === "confirm") confirmButtonRef.current?.focus();
      else promptInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [dialog]);

  const value: FeedbackContextValue = { toast, confirm, promptText };

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[300] flex max-w-[min(100vw-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto glass-card glass-card-elevated rounded-2xl border px-4 py-3 text-sm text-white shadow-xl backdrop-blur-xl ${t.variant === "success"
                ? "border-[var(--glass-border-bright)] bg-emerald-500/15"
                : t.variant === "error"
                  ? "border-red-400/35 bg-red-950/40"
                  : "border-[var(--glass-border)] bg-[rgba(20,20,22,0.85)]"
              }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {dialog ? (
        <div
          className="fixed inset-0 z-[290] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              if (dialog.kind === "confirm") closeConfirm(false);
              else closePrompt(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={
              dialog.kind === "confirm"
                ? descId
                : dialog.description
                  ? descId
                  : undefined
            }
            className="glass-card glass-card-elevated w-full max-w-md rounded-3xl border border-white/[0.12] p-7 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {dialog.kind === "confirm" ? (
              <>
                <h2
                  id={titleId}
                  className="text-lg font-semibold text-white"
                >
                  {dialog.title}
                </h2>
                <p
                  id={descId}
                  className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]"
                >
                  {dialog.message}
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="glass-button-ghost px-4 py-2"
                    onClick={() => closeConfirm(false)}
                  >
                    {dialog.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    ref={confirmButtonRef}
                    type="button"
                    className={
                      dialog.destructive
                        ? "rounded-xl border border-red-400/35 bg-gradient-to-b from-red-950/65 to-red-950/45 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-md transition-all hover:border-red-400/50 hover:brightness-110"
                        : "glass-button-accent px-4 py-2 text-sm"
                    }
                    onClick={() => closeConfirm(true)}
                  >
                    {dialog.confirmLabel ?? "OK"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2
                  id={titleId}
                  className="text-lg font-semibold text-white"
                >
                  {dialog.title}
                </h2>
                {dialog.description ? (
                  <p id={descId} className="mt-2 text-sm text-[var(--text-muted)]">
                    {dialog.description}
                  </p>
                ) : null}
                <label className="mt-4 block">
                  {dialog.label ? (
                    <span className="text-sm font-medium text-[var(--text-muted)]">
                      {dialog.label}
                    </span>
                  ) : null}
                  <input
                    ref={promptInputRef}
                    type="text"
                    value={promptDraft}
                    onChange={(e) => setPromptDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        closePrompt(promptDraft.trim());
                      }
                    }}
                    className="glass-input mt-1.5"
                    placeholder={dialog.placeholder}
                    autoComplete="url"
                    aria-label={dialog.label || dialog.title}
                  />
                </label>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="glass-button-ghost px-4 py-2"
                    onClick={() => closePrompt(null)}
                  >
                    {dialog.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    type="button"
                    className="glass-button-accent px-4 py-2 text-sm"
                    onClick={() => closePrompt(promptDraft.trim())}
                  >
                    {dialog.confirmLabel ?? "OK"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

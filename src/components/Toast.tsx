"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, AlertCircle, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastKind = "success" | "info" | "error";

interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContext {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const Ctx = createContext<ToastContext | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used within ToastProvider");
  return c;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2, 10);
      setToasts((s) => [...s, { ...t, id }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const value: ToastContext = {
    toast: push,
    success: (title, description) => push({ kind: "success", title, description }),
    info: (title, description) => push({ kind: "info", title, description }),
    error: (title, description) => push({ kind: "error", title, description }),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icon = {
    success: <Check className="h-3.5 w-3.5" />,
    info: <Sparkles className="h-3.5 w-3.5" />,
    error: <AlertCircle className="h-3.5 w-3.5" />,
  }[toast.kind];

  const accent = {
    success: "bg-emerald-500/20 text-emerald-300",
    info: "bg-primary/15 text-primary",
    error: "bg-destructive/20 text-destructive",
  }[toast.kind];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.94, x: 12 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.7 }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card/90 p-3 shadow-2xl backdrop-blur-md"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          accent
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[13px] font-medium text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Dismiss"
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </motion.div>
  );
}

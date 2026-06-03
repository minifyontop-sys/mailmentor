"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import {
  X,
  Plug2,
  Check,
  Plus,
  Loader2,
  ExternalLink,
  Unplug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnectors } from "@/hooks/useConnectors";
import { useToast } from "@/components/Toast";

interface Connector {
  provider: string;
  label: string;
  description: string;
  icon: string;
  scopes: string[];
  connected: boolean;
  expiresAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function ConnectorsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { connectors, isLoading, refresh } = useConnectors();
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-y-0 right-0 z-40 w-[420px] max-w-[calc(100vw-2rem)] border-l border-border bg-card/95 shadow-2xl backdrop-blur-xl"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
          <div className="flex h-14 items-center justify-between border-b border-border/60 px-5">
            <div className="flex items-center gap-2">
              <Plug2 className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <h2 className="text-[13px] font-medium tracking-tight text-foreground">
                Connectors
              </h2>
              {connectors.filter((c) => c.connected).length > 0 && (
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  {connectors.filter((c) => c.connected).length} live
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <div
            className="overflow-y-auto p-3"
            style={{ maxHeight: "calc(100vh - 3.5rem)" }}
          >
            {isLoading && connectors.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              </div>
            ) : (
              <ul className="space-y-2">
                {connectors.map((c) => (
                  <ConnectorCard
                    key={c.provider}
                    connector={c}
                    onChanged={() => {
                      refresh();
                    }}
                    onError={(msg) =>
                      toast.error("Connector update failed", msg)
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConnectorCard({
  connector: c,
  onChanged,
  onError,
}: {
  connector: Connector;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);

  const connect = async () => {
    setBusy("connect");
    try {
      const res = await fetch(`/api/connectors/${c.provider}/connect`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      if (j.redirectUrl) {
        window.location.href = j.redirectUrl;
        return;
      }
      onChanged();
    } catch (e: any) {
      onError(e?.message ?? "Connect failed");
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      const res = await fetch(`/api/connectors/${c.provider}/disconnect`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      onChanged();
    } catch (e: any) {
      onError(e?.message ?? "Disconnect failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <li
      className={cn(
        "rounded-lg border border-border/60 bg-card/60 p-3 transition-colors hover:border-border"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-base">
          {c.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[12.5px] font-medium text-foreground">
              {c.label}
            </h3>
            {c.connected && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-300">
                <Check className="h-2 w-2" strokeWidth={3} /> connected
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-3 text-[11px] leading-snug text-muted-foreground">
            {c.description}
          </p>
        </div>
      </div>
      <div className="mt-3">
        {c.connected ? (
          <button
            type="button"
            onClick={disconnect}
            disabled={busy !== null}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            {busy === "disconnect" ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            ) : (
              <Unplug className="h-3 w-3" strokeWidth={2} />
            )}
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={busy !== null}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy === "connect" ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            ) : (
              <Plus className="h-3 w-3" strokeWidth={2.5} />
            )}
            Connect
          </button>
        )}
      </div>
    </li>
  );
}

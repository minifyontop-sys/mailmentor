"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Unlink, Inbox, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { useEmailStore } from "@/store/emailStore";
import { useConnectors } from "@/hooks/useConnectors";

function initialsFromName(name?: string | null): string {
  const source = (name || "").trim();
  if (!source) return "?";
  const parts = source.split(/[\s<@]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function providerLabel(p: string) {
  if (p === "gmail" || p === "google") return "Gmail";
  if (p === "outlook" || p === "azure-ad") return "Outlook";
  return p;
}

function providerDot(p: string) {
  if (p === "gmail" || p === "google") return "hsl(220 60% 55%)";
  if (p === "outlook" || p === "azure-ad") return "hsl(200 70% 50%)";
  return "hsl(0 0% 50%)";
}

// Map provider name to an email label for display
function providerEmail(provider: string, metadata?: Record<string, unknown> | null) {
  if (metadata?.email) return String(metadata.email);
  if (provider === "gmail" || provider === "google") return "Gmail account";
  if (provider === "outlook" || provider === "azure-ad") return "Outlook account";
  return provider;
}

function providerName(provider: string, metadata?: Record<string, unknown> | null) {
  if (metadata?.name) return String(metadata.name);
  return null;
}

export function AccountSwitcher() {
  const { isSignedIn } = useAuth();
  const activeAccountId = useEmailStore((s) => s.activeAccountId);
  const setActiveAccountId = useEmailStore((s) => s.setActiveAccountId);
  const { connectors, refresh: refreshConnectors } = useConnectors();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const connected = useMemo(
    () => connectors.filter((c) => c.connected),
    [connectors]
  );

  // activeAccountId is the provider string when stored
  const activeConnector = connected.find((c) => c.provider === activeAccountId) ?? connected[0];

  // If no active account is set and we have connectors, auto-set the first one
  useEffect(() => {
    if (!activeAccountId && connected.length > 0) {
      setActiveAccountId(connected[0].provider);
    }
  }, [activeAccountId, connected, setActiveAccountId]);

  if (!isSignedIn) return null;
  if (connected.length === 0) return null;
  if (!activeConnector) return null;

  const hasOutlook = connected.some((c) => c.provider === "outlook" || c.provider === "azure-ad");
  const hasGoogle = connected.some((c) => c.provider === "gmail" || c.provider === "google");
  const allProviders = ["gmail", "outlook"];
  const hasOutlookLinked = hasOutlook;
  const hasGoogleLinked = hasGoogle;

  const switchTo = async (provider: string) => {
    if (provider === activeConnector.provider) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      setActiveAccountId(provider);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to switch account");
    } finally {
      setSwitching(false);
    }
  };

  const unlink = async (provider: string) => {
    if (connected.length <= 1) {
      toast.info("Sign out instead — this is your only account.");
      return;
    }
    try {
      const res = await fetch(`/api/connectors/${provider}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to disconnect");
      }
      const remaining = connected.filter((c) => c.provider !== provider);
      if (remaining.length > 0) {
        setActiveAccountId(remaining[0].provider);
      }
      await refreshConnectors();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to disconnect account");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 text-left transition-colors hover:bg-card/70",
          open && "bg-card/70"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ background: providerDot(activeConnector.provider) }}
        >
          {initialsFromName(
            providerName(activeConnector.provider, activeConnector.metadata) ||
            providerEmail(activeConnector.provider, activeConnector.metadata)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium text-foreground">
            {providerName(activeConnector.provider, activeConnector.metadata) ||
             providerEmail(activeConnector.provider, activeConnector.metadata)}
          </span>
          <span className="block truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {providerLabel(activeConnector.provider)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-card/95 shadow-2xl backdrop-blur-xl"
            role="menu"
          >
            <div className="p-1">
              {connected.map((conn) => {
                const isActive = conn.provider === activeConnector.provider;
                return (
                  <div
                    key={conn.provider}
                    className={cn(
                      "group/acc flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left",
                      isActive
                        ? "bg-primary/8"
                        : "hover:bg-secondary/60"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => switchTo(conn.provider)}
                      disabled={switching}
                      className="flex flex-1 items-center gap-2.5 text-left disabled:opacity-50"
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ background: providerDot(conn.provider) }}
                      >
                        {initialsFromName(
                          providerName(conn.provider, conn.metadata) ||
                          providerEmail(conn.provider, conn.metadata)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] text-foreground">
                          {providerEmail(conn.provider, conn.metadata)}
                        </span>
                        <span className="block truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {providerLabel(conn.provider)}
                        </span>
                      </span>
                      {isActive && (
                        <Check
                          className="h-3.5 w-3.5 text-primary"
                          strokeWidth={2.5}
                        />
                      )}
                    </button>
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => unlink(conn.provider)}
                        title="Disconnect this account"
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/acc:opacity-100"
                      >
                        <Unlink className="h-3 w-3" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border/60 p-1">
              {hasGoogle && !hasGoogleLinked && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Add Gmail account
                </button>
              )}
              {hasOutlook && !hasOutlookLinked && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Add Outlook account
                </button>
              )}
              {!hasGoogle && !hasOutlook && (
                <p className="px-2 py-1.5 text-[11px] text-muted-foreground/70">
                  No additional providers configured.
                </p>
              )}
            </div>
            <div className="border-t border-border/60 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
              <Inbox className="mr-1 inline h-2.5 w-2.5" strokeWidth={2} />
              Inbox shows active account
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import {
  Check,
  X,
  Inbox,
  Calendar,
  Sparkles,
  Mail,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePendingActions } from "@/hooks/usePendingActions";
import { useToast } from "@/components/Toast";
import type { PendingAction } from "@/types/automation";

const ICON_FOR_TYPE: Record<string, typeof Calendar> = {
  "calendar.create_event": Calendar,
  "calendar.propose_slots": Calendar,
  "calendar.propose_slots_with_reply": Calendar,
  "ai.draft_reply": Sparkles,
  "email.archive": Mail,
  "email.label": Mail,
  "slack.post_message": Inbox,
  "notion.create_page": Inbox,
};

function ActionIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICON_FOR_TYPE[type] ?? Inbox;
  return <Icon className={className} strokeWidth={1.75} />;
}

export function PendingActionsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { pending, count, isLoading, refresh } = usePendingActions();
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [clearing, setClearing] = useState(false);
  const [rescanning, setRescanning] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  const clearAll = async () => {
    if (clearing) return;
    if (!window.confirm(`Clear all ${count} pending actions? They'll be marked as skipped in your audit log.`)) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/pending-actions/clear", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "pending" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      toast.success(`Cleared ${j.cleared ?? 0} action${j.cleared === 1 ? "" : "s"}`);
      await refresh();
    } catch (e: any) {
      toast.error("Failed to clear", e?.message ?? "Unknown error");
    } finally {
      setClearing(false);
    }
  };

  const rescan = async () => {
    if (rescanning) return;
    setRescanning(true);
    try {
      const res = await fetch("/api/recipes/run-for-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 15 }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      if (j.rateLimited) {
        toast.error("Rate limit hit", "Groq is throttling. Try again in a minute.");
      } else {
        toast.success(
          `Scanned ${j.scanned ?? 0} · queued ${j.queued ?? 0} new action${j.queued === 1 ? "" : "s"}`
        );
      }
      await refresh();
    } catch (e: any) {
      toast.error("Rescan failed", e?.message ?? "Unknown error");
    } finally {
      setRescanning(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-y-0 right-0 z-40 w-[400px] max-w-[calc(100vw-2rem)] border-l border-border bg-card/95 shadow-2xl backdrop-blur-xl"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
          <div className="flex h-14 items-center justify-between border-b border-border/60 px-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <h2 className="text-[13px] font-medium tracking-tight text-foreground">
                Pending actions
              </h2>
              {count > 0 && (
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                  {count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={rescan}
                disabled={rescanning}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                title="Re-run all enabled recipes against the latest 15 inbox messages"
              >
                {rescanning ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                ) : (
                  <RefreshCw className="h-3 w-3" strokeWidth={1.75} />
                )}
                Rescan
              </button>
              {count > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={clearing}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                  title="Mark all pending actions as skipped"
                >
                  {clearing ? (
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                  ) : (
                    <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                  )}
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 3.5rem)" }}>
            {isLoading && pending.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              </div>
            ) : pending.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="space-y-2">
                {pending.map((a) => (
                  <ActionCard
                    key={a.id}
                    action={a}
                    onResolved={() => {
                      refresh();
                    }}
                    onError={(msg) => toast.error("Action failed", msg)}
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 text-muted-foreground">
        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] text-foreground">All caught up</p>
      <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-muted-foreground">
        When a recipe matches an incoming email, you&apos;ll see a suggested action here for one-click approval.
      </p>
    </div>
  );
}

function ActionCard({
  action,
  onResolved,
  onError,
}: {
  action: PendingAction;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [expanded, setExpanded] = useState(false);

  const approve = async () => {
    setBusy("approve");
    try {
      const res = await fetch(`/api/pending-actions/${action.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      onResolved();
    } catch (e: any) {
      onError(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const deny = async () => {
    setBusy("deny");
    try {
      const res = await fetch(`/api/pending-actions/${action.id}/deny`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      onResolved();
    } catch (e: any) {
      onError(e?.message ?? "Failed to deny");
    } finally {
      setBusy(null);
    }
  };

  // For draft-reply actions, surface the full draft body so the user
  // can read the proposed reply before approving.
  const payload = (action.payload ?? {}) as Record<string, unknown>;
  const isDraft = action.actionType === "ai.draft_reply";
  const draftBody = isDraft ? (payload.body as string | undefined) : null;
  const draftSubject = isDraft ? (payload.subject as string | undefined) : null;
  const draftTo = isDraft ? (payload.to as string | undefined) : null;

  return (
    <li
      className={cn(
        "rounded-lg border border-border/60 bg-card/60",
        "transition-colors hover:border-border"
      )}
    >
      <div className="flex items-start gap-2.5 p-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ActionIcon type={action.actionType} className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] leading-snug text-foreground">
            {action.preview}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {action.actionType} · {new Date(action.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {isDraft && draftBody && (
        <div className="border-t border-border/40 bg-background/40 px-3 py-2.5">
          {draftSubject && (
            <p className="text-[11px] font-medium text-foreground/80">
              Subject: <span className="text-foreground">{draftSubject}</span>
            </p>
          )}
          {draftTo && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              To: {draftTo}
            </p>
          )}
          <p
            className={cn(
              "mt-1.5 whitespace-pre-wrap text-[11.5px] leading-relaxed text-foreground/80",
              !expanded && "line-clamp-4"
            )}
          >
            {draftBody}
          </p>
          {draftBody.length > 220 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[10px] text-primary hover:underline"
            >
              {expanded ? "Collapse" : "Show full draft"}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border/40 p-3">
        <button
          type="button"
          onClick={approve}
          disabled={busy !== null}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy === "approve" ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
          ) : (
            <Check className="h-3 w-3" strokeWidth={2.5} />
          )}
          {isDraft ? "Send" : "Approve"}
        </button>
        <button
          type="button"
          onClick={deny}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
        >
          {busy === "deny" ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
          ) : (
            <X className="h-3 w-3" strokeWidth={2} />
          )}
          Skip
        </button>
      </div>
    </li>
  );
}

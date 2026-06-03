"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Inbox,
  Star,
  CheckSquare,
  RefreshCw,
  Send,
  Sparkles,
  Search,
  Mail,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useEmails } from "@/hooks/useEmails";
import { useTaskStore, selectUndoneCount } from "@/store/taskStore";

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  shortcut?: string[];
  run: (ctx: Ctx) => void;
};

interface Ctx {
  router: ReturnType<typeof useRouter>;
  refresh: () => void;
  selectEmail: (id: string) => void;
  onGenerate: () => void;
}

export function CommandK({
  onSelectEmail,
  onGenerate,
}: {
  onSelectEmail: (id: string) => void;
  onGenerate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { emails, refresh } = useEmails();
  const tasks = useTaskStore((s) => s.tasks);
  const undone = useTaskStore(selectUndoneCount);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-commandk:open", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-commandk:open", onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const ctx: Ctx = useMemo(
    () => ({
      router,
      refresh,
      selectEmail: onSelectEmail,
      onGenerate,
    }),
    [router, refresh, onSelectEmail, onGenerate]
  );

  const items = useMemo(() => {
    const nav: Action[] = [
      {
        id: "nav-inbox",
        label: "Go to Inbox",
        icon: Inbox,
        shortcut: ["G", "I"],
        run: (c) => c.router.push("/inbox"),
      },
      {
        id: "nav-important",
        label: "Go to Important",
        icon: Star,
        shortcut: ["G", "M"],
        run: (c) => c.router.push("/inbox?view=important"),
      },
      {
        id: "nav-tasks",
        label: `Go to Tasks (${undone} open)`,
        icon: CheckSquare,
        shortcut: ["G", "T"],
        run: (c) => c.router.push("/tasks"),
      },
      {
        id: "refresh",
        label: "Refresh inbox",
        icon: RefreshCw,
        shortcut: ["R"],
        run: (c) => {
          c.refresh();
        },
      },
      {
        id: "generate",
        label: "Generate reply for selected",
        icon: Sparkles,
        run: (c) => c.onGenerate(),
      },
    ];

    const emailItems: Action[] = emails.slice(0, 20).map((e) => ({
      id: `email-${e.id}`,
      label: e.subject || "(no subject)",
      hint: e.sender.name,
      icon: Mail,
      run: (c) => {
        c.selectEmail(e.id);
        c.router.push(`/inbox?email=${e.id}`);
      },
    }));

    const all = [...nav, ...emailItems];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all
      .filter(
        (a) =>
          a.label.toLowerCase().includes(q) ||
          (a.hint ?? "").toLowerCase().includes(q)
      )
      .slice(0, 20);
    // ctx is stable via useMemo; its own deps are listed above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails, query, undone, ctx]);

  useEffect(() => {
    if (activeIdx >= items.length) setActiveIdx(0);
  }, [items.length, activeIdx]);

  const run = (action: Action) => {
    action.run(ctx);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const action = items[activeIdx];
      if (action) run(action);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIdx(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search or jump to…"
                className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto py-1">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  No matches.
                </div>
              ) : (
                items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => run(item)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                        i === activeIdx
                          ? "bg-primary/10"
                          : "hover:bg-secondary/40"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          i === activeIdx
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                        {item.label}
                      </span>
                      {item.hint && (
                        <span className="hidden truncate text-[12px] text-muted-foreground sm:inline">
                          {item.hint}
                        </span>
                      )}
                      {item.shortcut && (
                        <span className="hidden items-center gap-0.5 sm:flex">
                          {item.shortcut.map((k) => (
                            <kbd
                              key={k}
                              className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      )}
                      {i === activeIdx && (
                        <ArrowRight
                          className="h-3 w-3 text-primary"
                          strokeWidth={2}
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-4 py-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-secondary px-1 py-0.5">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-secondary px-1 py-0.5">↵</kbd>
                  select
                </span>
              </div>
              <span className="opacity-70">{tasks.length} tasks</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

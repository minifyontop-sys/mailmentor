"use client";

import { useEffect, useState } from "react";
import { Search, RefreshCw, X, SearchIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Star, CheckCircle2, Inbox } from "lucide-react";

import type { Email } from "@/types";
import { scoreEmail } from "@/lib/importance";
import { EmailListItem } from "./EmailListItem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEmails } from "@/hooks/useEmails";
import { EmailRowSkeleton } from "@/components/Skeleton";

type View = "inbox" | "important";

export function EmailList({ view }: { view: View }) {
  const { emails, isLoading, isRefreshing, error, refresh } = useEmails();
  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? emails.filter(
          (e) =>
            e.subject.toLowerCase().includes(q) ||
            e.sender.name.toLowerCase().includes(q) ||
            e.snippet.toLowerCase().includes(q) ||
            e.body.toLowerCase().includes(q)
        )
      : emails;
    return view === "important"
      ? base.filter((e) => scoreEmail(e) >= 10)
      : base;
  })();

  const sorted = [...filtered].sort((a, b) => {
    const sa = scoreEmail(a);
    const sb = scoreEmail(b);
    if (sb !== sa) return sb - sa;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const title = view === "important" ? "Important" : "Inbox";
  const subtitle =
    view === "important"
      ? "Threads you should look at first"
      : "Your live Gmail inbox";

  return (
    <section className="flex h-full w-full min-w-0 flex-col bg-background/30">
      <div className="flex h-16 shrink-0 items-end justify-between gap-3 border-b border-border px-4 pb-3 pt-4 md:h-20 md:px-6 md:pb-4 md:pt-5">
        <div className="pl-10 md:pl-0">
          <h1
            className="font-serif-italic text-[22px] font-normal leading-none tracking-tight text-foreground md:text-[28px]"
            style={{
              backgroundImage:
                "linear-gradient(100deg, hsl(36 65% 55%) 0%, hsl(35 18% 94%) 35%, hsl(36 65% 55%) 60%, hsl(35 18% 94%) 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "title-shimmer 9s linear infinite",
            }}
          >
            {title}
          </h1>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            {subtitle}
            <span className="mx-1.5 opacity-50">·</span>
            <span className="tabular-nums">
              {isLoading ? "loading" : `${sorted.length} ${sorted.length === 1 ? "thread" : "threads"}`}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 sm:hidden"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          >
            <SearchIcon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
          </Button>
          {/* Desktop search */}
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 w-56 border-border bg-secondary/30 pl-7 text-[12.5px] transition-all focus-visible:border-primary/40 focus-visible:bg-secondary/60 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            onClick={() => refresh()}
            disabled={isLoading}
            title="Refresh"
          >
            {isRefreshing && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-md ring-1 ring-primary/30 ring-offset-0"
              />
            )}
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted-foreground ${
                isRefreshing ? "spin-slow text-primary" : ""
              }`}
              strokeWidth={1.75}
            />
          </Button>
        </div>
      </div>

      {/* Mobile search bar */}
      {mobileSearchOpen && (
        <div className="border-b border-border px-4 py-2 sm:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              autoFocus
              className="h-8 w-full border-border bg-secondary/30 pl-7 text-[12.5px] transition-all focus-visible:border-primary/40 focus-visible:bg-secondary/60 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && sorted.length === 0 ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <EmailRowSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <X className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[14px] font-medium text-foreground">
                Couldn&apos;t load inbox
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {(error as Error)?.message || "Try refreshing or signing in again."}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => refresh()}>
              Retry
            </Button>
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState view={view} hasQuery={!!query} />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
            }}
          >
            <AnimatePresence initial={false}>
              {sorted.map((email: Email) => (
                <motion.div
                  key={email.id}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
                    show: {
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                >
                  <EmailListItem email={email} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function EmptyState({ view, hasQuery }: { view: View; hasQuery: boolean }) {
  const Icon = view === "important" ? Star : hasQuery ? Search : Inbox;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col items-center justify-center px-6 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/30 text-muted-foreground">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h2 className="mt-5 font-serif-italic text-2xl text-foreground">
        {view === "important"
          ? "Nothing important."
          : hasQuery
          ? "No matches."
          : "Inbox zero."}
      </h2>
      <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-muted-foreground">
        {view === "important"
          ? "Threads scoring under 10 are hidden. Check back when VIPs email."
          : hasQuery
          ? "Try a different sender or subject."
          : "Enjoy the silence. We'll let you know when something arrives."}
      </p>
    </motion.div>
  );
}

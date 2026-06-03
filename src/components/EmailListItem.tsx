"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Email } from "@/types";
import { useEmailStore } from "@/store/emailStore";
import { scoreEmail } from "@/lib/importance";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 7 && diffDays >= 0) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function avatarGradient(email: string): string {
  const h = hashStr(email);
  const palettes = [
    "from-amber-500/30 to-rose-500/25",
    "from-orange-500/30 to-amber-500/25",
    "from-yellow-500/30 to-orange-500/25",
    "from-red-500/25 to-orange-500/30",
    "from-stone-500/30 to-amber-500/25",
    "from-amber-700/30 to-yellow-500/25",
  ];
  return palettes[h % palettes.length];
}

export function EmailListItem({ email }: { email: Email }) {
  const selectedId = useEmailStore((s) => s.selectedEmailId);
  const locallyRead = useEmailStore((s) => s.readIds.has(email.id));
  const isRead = locallyRead || !email.isUnread;
  const selectEmail = useEmailStore((s) => s.selectEmail);
  const markAsRead = useEmailStore((s) => s.markAsRead);

  const score = scoreEmail(email);
  const isActive = selectedId === email.id;

  const handleClick = () => {
    selectEmail(email.id);
    if (email.isUnread && !locallyRead) {
      markAsRead(email.id);
      fetch(`/api/mail/messages/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUnread: false }),
      }).catch(() => {});
    }
  };

  const barColor =
    score >= 10
      ? "bg-amber-400"
      : score >= 5
      ? "bg-primary"
      : "bg-transparent";

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 480, damping: 32 }}
      className={cn(
        "group relative flex w-full items-start gap-3 border-b border-border/40 px-5 py-3.5 text-left transition-colors duration-200",
        isActive ? "bg-secondary/70" : "hover:bg-secondary/35"
      )}
    >
      {/* Active glow on left bar */}
      <span
        className={cn(
          "absolute left-0 top-3.5 bottom-3.5 w-0.5 rounded-r-full transition-all",
          barColor,
          isActive && score >= 5 && "shadow-[0_0_10px_2px_hsl(36_65%_55%/0.45)]"
        )}
      />

      {/* Avatar */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-medium text-foreground/80 transition-shadow",
          avatarGradient(email.sender.email),
          !isRead && "moss-ring"
        )}
      >
        {email.sender.name
          .split(" ")
          .map((p) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase() || "·"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {!isRead && (
            <motion.span
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 18 }}
              className="h-1.5 w-1.5 shrink-0 translate-y-[3px] rounded-full bg-moss"
            />
          )}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13.5px] font-serif-italic",
              !isRead
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            )}
          >
            {email.sender.name}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80">
            {formatTime(email.date)}
          </span>
        </div>

        <div
          className={cn(
            "mt-0.5 truncate text-[13px]",
            !isRead
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          )}
        >
          {email.subject}
        </div>

        <p
          className={cn(
            "mt-0.5 truncate text-[12px] leading-relaxed",
            !isRead ? "text-muted-foreground" : "text-muted-foreground/60"
          )}
        >
          {(email.snippet || email.body).replace(/\s+/g, " ").trim()}
        </p>
      </div>
    </motion.button>
  );
}

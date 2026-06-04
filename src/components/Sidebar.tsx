"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Star,
  CheckSquare,
  LogOut,
  Search,
  UserCircle2,
  RefreshCw,
  Sparkles,
  Wand2,
  Plug2,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useTaskStore, selectUndoneCount } from "@/store/taskStore";
import { useProfileStore } from "@/store/profileStore";
import { useUIStore } from "@/store/uiStore";
import { Brand } from "@/components/Brand";
import { ProfilePanel } from "@/components/ProfilePanel";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { PendingActionsPanel } from "@/components/PendingActionsPanel";
import { RecipePanel } from "@/components/RecipePanel";
import { ConnectorsPanel } from "@/components/ConnectorsPanel";
import { usePendingActions } from "@/hooks/usePendingActions";
import { useConnectors } from "@/hooks/useConnectors";

function SidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const undone = useTaskStore(selectUndoneCount);
  const profile = useProfileStore((s) => s.profile);
  const generating = useProfileStore((s) => s.generating);
  const { user } = useUser();
  const clerk = useClerk();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const closeSidebar = useUIStore((s) => s.closeSidebar);

  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const { count: pendingCount } = usePendingActions();
  const { connectors } = useConnectors();
  const connectedCount = connectors.filter((c) => c.connected).length;

  const onInbox = pathname === "/inbox";
  const isImportant = onInbox && searchParams.get("view") === "important";
  const isInbox = onInbox && !isImportant;
  const isTasks = pathname.startsWith("/tasks");

  const items = [
    { label: "Inbox", icon: Inbox, active: isInbox, href: "/inbox" },
    {
      label: "Important",
      icon: Star,
      active: isImportant,
      href: "/inbox?view=important",
    },
    { label: "Tasks", icon: CheckSquare, active: isTasks, href: "/tasks" },
  ];

  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const initials = ((user?.firstName?.[0] || "") + (user?.lastName?.[0] || "")).toUpperCase() || "•";

  const handleNavClick = useCallback(() => {
    closeSidebar();
  }, [closeSidebar]);

  useEffect(() => {
    closeSidebar();
  }, [pathname, searchParams, closeSidebar]);

  const sidebarContent = (
    <aside className="relative flex h-full w-[232px] shrink-0 flex-col border-r border-border bg-background/40 backdrop-blur-md">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
      <div className="flex h-16 items-center px-5">
        <Brand size="md" />
      </div>

      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("open-commandk"))
        }
        className="mx-3 mb-3 flex h-8 items-center gap-2 rounded-md border border-border bg-secondary/40 px-2.5 text-[12px] text-muted-foreground transition-colors hover:border-border hover:bg-secondary"
      >
        <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded border border-border bg-background/60 px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <nav className="mt-1 flex-1 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "group relative flex h-8 items-center gap-2.5 rounded-md px-3 text-[13px] transition-all",
                item.active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-md bg-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {item.active && (
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />
              )}
              <Icon
                className={cn(
                  "relative h-3.5 w-3.5 transition-colors",
                  item.active
                    ? "text-primary"
                    : "text-muted-foreground/70 group-hover:text-foreground"
                )}
                strokeWidth={1.75}
              />
              <span className="relative flex-1">{item.label}</span>
              {item.label === "Tasks" && undone > 0 && (
                <span className="relative rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                  {undone}
                </span>
              )}
            </Link>
          );
        })}

        <div className="mt-3 px-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
            Automation
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setPendingOpen(true); closeSidebar(); }}
          className="group relative mt-1 flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[13px] text-muted-foreground transition-all hover:text-foreground"
        >
          <Zap className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-primary" strokeWidth={1.75} />
          <span className="flex-1 text-left">Pending</span>
          {pendingCount > 0 && (
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary-foreground">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setRecipesOpen(true); closeSidebar(); }}
          className="group relative flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[13px] text-muted-foreground transition-all hover:text-foreground"
        >
          <Wand2 className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-primary" strokeWidth={1.75} />
          <span className="flex-1 text-left">Recipes</span>
        </button>
        <button
          type="button"
          onClick={() => { setConnectorsOpen(true); closeSidebar(); }}
          className="group relative flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[13px] text-muted-foreground transition-all hover:text-foreground"
        >
          <Plug2 className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-primary" strokeWidth={1.75} />
          <span className="flex-1 text-left">Connectors</span>
          {connectedCount > 0 && (
            <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-emerald-300">
              {connectedCount}
            </span>
          )}
        </button>
      </nav>

      {/* Profile chip */}
      <button
        type="button"
        onClick={() => { setProfileOpen(true); closeSidebar(); }}
        className="mx-3 mb-2 flex h-8 items-center gap-2 rounded-md border border-border bg-secondary/30 px-2.5 text-left text-[12px] transition-colors hover:border-border hover:bg-secondary/60"
      >
        {generating ? (
          <RefreshCw className="h-3.5 w-3.5 text-primary spin-slow" strokeWidth={1.75} />
        ) : profile ? (
          <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
        ) : (
          <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
        )}
        <span className="flex-1 truncate text-foreground/80">
          {generating
            ? "Learning your style…"
            : profile
            ? "Your profile"
            : "Build profile"}
        </span>
        {profile && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {profile.sourceEmailCount}
          </span>
        )}
      </button>

      <div className="border-t border-border px-3 py-3">
        <AccountSwitcher />
        <div className="group mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50">
          <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-gradient-to-br from-primary/25 to-amber-700/25 text-[10px] font-medium text-foreground">
            {initials || "•"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] font-medium text-foreground">
              {userName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {userEmail}
            </p>
          </div>
          <button
            type="button"
            onClick={() => clerk.signOut({ redirectUrl: "/signin" })}
            className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={closeSidebar}
            />
            <motion.div
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
      <PendingActionsPanel open={pendingOpen} onClose={() => setPendingOpen(false)} />
      <RecipePanel open={recipesOpen} onClose={() => setRecipesOpen(false)} />
      <ConnectorsPanel open={connectorsOpen} onClose={() => setConnectorsOpen(false)} />
    </>
  );
}

import { useState } from "react";

export function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarInner />
    </Suspense>
  );
}

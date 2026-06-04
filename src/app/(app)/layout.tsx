"use client";

import { useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";

import { Sidebar } from "@/components/Sidebar";
import { CommandK } from "@/components/CommandK";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useEmails } from "@/hooks/useEmails";
import { useEmailStore } from "@/store/emailStore";
import { useProfileStore } from "@/store/profileStore";
import { useUIStore } from "@/store/uiStore";
import { useToast } from "@/components/Toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const openSidebar = useUIStore((s) => s.openSidebar);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/signin");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <button
          type="button"
          onClick={openSidebar}
          className="fixed left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground backdrop-blur-md transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" strokeWidth={1.75} />
        </button>
        {children}
      </main>
      <AppShellChrome />
      <ProfileBootstrap />
    </div>
  );
}

/**
 * Auto-generates the user profile on first run (or when it's stale).
 * Shows a toast for the duration. Doesn't re-trigger if already running.
 */
function ProfileBootstrap() {
  const profile = useProfileStore((s) => s.profile);
  const generating = useProfileStore((s) => s.generating);
  const isStale = useProfileStore((s) => s.isStale);
  const setProfile = useProfileStore((s) => s.setProfile);
  const setGenerating = useProfileStore((s) => s.setGenerating);
  const setError = useProfileStore((s) => s.setError);
  const { isSignedIn } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!isSignedIn) return;
    if (generating) return;
    if (profile && !isStale()) return;

    let cancelled = false;
    setGenerating(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/profile/generate", { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          if (data?.code !== "empty_corpus") {
            setError(data?.error ?? `HTTP ${res.status}`);
            toast.error("Profile generation failed", data?.error ?? "Try Refresh in the profile panel.");
          }
          return;
        }
        setProfile(data.profile);
        if (!profile) {
          toast.success(
            "Profile ready",
            `Learned from ${data.profile.sourceEmailCount} emails.`
          );
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return null;
}

/**
 * Mounted once at the (app) layout level. Hosts the global command palette
 * and binds window-level keyboard shortcuts. Hidden from the DOM tree.
 */
function AppShellChrome() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { refresh, emails } = useEmails();
  const selectEmail = useEmailStore((s) => s.selectEmail);
  const triggerGenerateReply = useEmailStore((s) => s.triggerGenerateReply);
  const selectedId = useEmailStore((s) => s.selectedEmailId);

  useEffect(() => {
    const open = () => {
      window.dispatchEvent(new CustomEvent("open-commandk:open"));
    };
    window.addEventListener("open-commandk", open);
    return () => window.removeEventListener("open-commandk", open);
  }, []);

  const onSelectEmail = useCallback(
    (id: string) => {
      selectEmail(id);
      if (pathname !== "/inbox") {
        router.push(`/inbox?email=${id}`);
      } else {
        router.replace(`/inbox?email=${id}`);
      }
    },
    [selectEmail, router, pathname]
  );

  const onGenerate = useCallback(() => {
    if (!selectedId) {
      const top = emails[0];
      if (top) {
        selectEmail(top.id);
        router.push(`/inbox?email=${top.id}`);
        setTimeout(() => triggerGenerateReply(), 50);
      }
      return;
    }
    triggerGenerateReply();
  }, [selectedId, emails, selectEmail, router, triggerGenerateReply]);

  const selectByOffset = useCallback(
    (offset: number) => {
      if (pathname !== "/inbox") return;
      if (emails.length === 0) return;
      const idx = emails.findIndex((e) => e.id === selectedId);
      const nextIdx =
        idx < 0
          ? offset > 0
            ? 0
            : emails.length - 1
          : Math.max(0, Math.min(emails.length - 1, idx + offset));
      const target = emails[nextIdx];
      if (target) onSelectEmail(target.id);
    },
    [pathname, emails, selectedId, onSelectEmail]
  );

  const handlers = {
    j: () => selectByOffset(1),
    k: () => selectByOffset(-1),
    r: () => refresh(),
    "cmd+k": () => {},
    "g i": () => router.push("/inbox"),
    "g t": () => router.push("/tasks"),
    "g m": () => {
      const view =
        searchParams.get("view") === "important" ? "inbox" : "important";
      router.push(view === "important" ? "/inbox?view=important" : "/inbox");
    },
  };

  useKeyboardShortcuts({ handlers });

  return <CommandK onSelectEmail={onSelectEmail} onGenerate={onGenerate} />;
}

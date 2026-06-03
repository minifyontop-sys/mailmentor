"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { EmailList } from "@/components/EmailList";
import { SmartAssistant } from "@/components/SmartAssistant";
import { useEmailStore } from "@/store/emailStore";

function InboxView() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const emailParam = searchParams.get("email");
  const selectEmail = useEmailStore((s) => s.selectEmail);
  const markAsRead = useEmailStore((s) => s.markAsRead);
  const readIds = useEmailStore((s) => s.readIds);

  useEffect(() => {
    if (!emailParam) return;
    const alreadyRead = readIds.has(emailParam);
    // Always sync the selection so that j/k navigation and deep links
    // can move the right-pane focus, even to messages already read.
    selectEmail(emailParam);
    if (!alreadyRead) {
      markAsRead(emailParam);
      fetch(`/api/mail/messages/${emailParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUnread: false }),
      }).catch(() => {});
    }
  }, [emailParam, readIds, selectEmail, markAsRead]);

  // Fire the recipe engine on every inbox mount. This pulls the
  // most recent 10 messages, evaluates them against enabled recipes,
  // and queues any matches as PendingAction rows. Best-effort: a 401
  // (no active account) just silently no-ops.
  useEffect(() => {
    fetch("/api/recipes/run-for-inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 10 }),
    }).catch(() => {});
  }, []);

  const view = viewParam === "important" ? "important" : "inbox";

  return (
    <div className="flex h-full w-full">
      <div className="min-w-0 flex-1">
        <EmailList view={view} />
      </div>
      <SmartAssistant />
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxView />
    </Suspense>
  );
}

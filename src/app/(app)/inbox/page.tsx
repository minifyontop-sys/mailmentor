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
  const selectedId = useEmailStore((s) => s.selectedEmailId);

  useEffect(() => {
    if (!emailParam) return;
    const alreadyRead = readIds.has(emailParam);
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
      {/* Email list: full width on mobile when no email selected, hidden when email is open on mobile */}
      <div className={`min-w-0 flex-1 ${selectedId ? "hidden md:block" : "block"}`}>
        <EmailList view={view} />
      </div>
      {/* SmartAssistant: desktop side panel + mobile overlay handled inside component */}
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
